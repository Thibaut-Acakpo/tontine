'use strict';
const express = require('express');
const argon2 = require('argon2');
const db = require('../db');
const config = require('../config');
const { validate, z, s } = require('../middleware/validate');
const { limiters } = require('../middleware/security');
const { asyncHandler, ok, E } = require('../utils/http');
const { audit } = require('../audit');

const router = express.Router();

router.get('/me', (req, res) => ok(res, req.user));

router.patch('/me', validate({ body: z.object({ fullName: s.name.optional(), phone: s.phone.nullable().optional() }).strict() }),
  asyncHandler(async (req, res) => {
    const { fullName, phone } = req.body;
    await db.query('UPDATE users SET full_name = COALESCE(?, full_name), phone = CASE WHEN ? THEN ? ELSE phone END WHERE id = ?',
      [fullName ?? null, phone !== undefined ? 1 : 0, phone ?? null, req.user.id]);
    await audit(req, { action: 'user.update_profile', resourceType: 'user', resourceId: req.user.id });
    ok(res, { ...req.user, ...(fullName ? { fullName } : {}), ...(phone !== undefined ? { phone } : {}) });
  }));

// ✅ NOUVEAU : Mise à jour des préférences
router.patch('/me/preferences',
  validate({ body: z.object({ emailNotifications: z.boolean().optional() }).strict() }),
  asyncHandler(async (req, res) => {
    const { emailNotifications } = req.body;
    if (emailNotifications !== undefined) {
      await db.query('UPDATE users SET email_notifications = ? WHERE id = ?', [emailNotifications ? 1 : 0, req.user.id]);
    }
    await audit(req, { action: 'user.update_preferences', resourceType: 'user', resourceId: req.user.id, meta: req.body });
    ok(res, { emailNotifications: emailNotifications !== undefined ? !!emailNotifications : undefined });
  }));

// Suppression de compte : anonymisation
router.delete('/me', limiters.sensitive, validate({ body: z.object({ password: z.string().min(1).max(128) }).strict() }),
  asyncHandler(async (req, res) => {
    const u = await db.one('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!(await argon2.verify(u.password_hash, req.body.password).catch(() => false))) throw E.badRequest('Mot de passe incorrect');
    const active = await db.one(
      "SELECT COUNT(*) AS n FROM tontine_members m JOIN tontines t ON t.id = m.tontine_id WHERE m.user_id = ? AND t.status IN ('draft','active')", [req.user.id]);
    if (active.n > 0) throw E.conflict('Quittez ou clôturez vos tontines en cours avant de supprimer votre compte');
    await db.tx(async (conn) => {
      await db.query("UPDATE users SET status = 'deleted', email = CONCAT('deleted-', id, '@deleted.invalid'), full_name = 'Compte supprimé', phone = NULL, password_hash = '!' WHERE id = ?", [req.user.id], conn);
      await db.query('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ?', [req.user.id], conn);
    });
    await audit(req, { action: 'user.delete_account', resourceType: 'user', resourceId: req.user.id });
    res.clearCookie(config.session.cookieName, { httpOnly: true, secure: config.isProd, sameSite: config.session.sameSite, path: '/' });
    ok(res, { message: 'Compte supprimé' });
  }));

module.exports = router;