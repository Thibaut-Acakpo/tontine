'use strict';
const express = require('express');
const argon2 = require('argon2');
const { randomBytes } = require('crypto');
const db = require('../db');
const { validate, z, s } = require('../middleware/validate');
const { asyncHandler, ok, E, camel, pageParams, pageMeta } = require('../utils/http');
const { audit } = require('../audit');
const { sendMail } = require('../mailer');
const config = require('../config');

const router = express.Router();
const ARGON = { type: argon2.argon2id };

const PWD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
const generatePassword = (len = 14) =>
  Array.from(randomBytes(len)).map((b) => PWD_ALPHABET[b % PWD_ALPHABET.length]).join('');

router.get('/stats', asyncHandler(async (req, res) => {
  const r = await db.one(
    `SELECT (SELECT COUNT(*) FROM users WHERE status = 'active') AS users,
            (SELECT COUNT(*) FROM tontines WHERE status = 'active') AS active_tontines,
            (SELECT COUNT(*) FROM transactions WHERE status = 'validated') AS validated_transactions,
            (SELECT COUNT(*) FROM audit_logs WHERE result <> 'success' AND created_at > (UTC_TIMESTAMP() - INTERVAL 1 DAY)) AS failures_24h`);
  ok(res, camel(r));
}));

router.get('/users', validate({ query: z.object({ ...s.page, q: z.string().trim().max(100).optional() }).strict() }), asyncHandler(async (req, res) => {
  const p = pageParams(req.query);
  const like = req.query.q ? `%${req.query.q.replace(/[%_\\]/g, '\\$&')}%` : '%';
  const total = await db.one('SELECT COUNT(*) AS n FROM users WHERE email LIKE ? OR full_name LIKE ?', [like, like]);
  const rows = await db.query('SELECT id, email, full_name, role, status, email_verified_at, created_at FROM users WHERE email LIKE ? OR full_name LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?', [like, like, String(p.limit), String(p.offset)]);
  ok(res, camel(rows), pageMeta(p, total.n));
}));

router.post('/users',
  validate({
    body: z.object({
      email: s.email,
      fullName: s.name,
      phone: s.phone.optional(),
      role: z.enum(['admin', 'member']).default('member'),
      sendEmail: z.boolean().default(true),
    }).strict()
  }),
  asyncHandler(async (req, res) => {
    const { email, fullName, phone, role, sendEmail } = req.body;

    const existing = await db.one('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) throw E.conflict('Un compte avec cet email existe déjà');

    const generatedPassword = generatePassword(14);
    const hash = await argon2.hash(generatedPassword, ARGON);

    const r = await db.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role, status, email_verified_at)
       VALUES (?, ?, ?, ?, ?, 'active', UTC_TIMESTAMP())`,
      [email, hash, fullName, phone || null, role]
    );

    let emailSent = false;
    let emailError = null;
    if (sendEmail) {
      try {
        await sendMail({
          to: email,
          subject: 'Bienvenue sur Tontine — Vos identifiants',
          text:
`Bonjour ${fullName},

Un compte a été créé pour vous sur Tontine.

Vos identifiants :
  Email        : ${email}
  Mot de passe : ${generatedPassword}

Connectez-vous ici : ${config.appUrl}/connexion

⚠️ Pour votre sécurité, changez ce mot de passe dès votre première connexion.

À bientôt,
L'équipe Tontine`,
        });
        emailSent = true;
      } catch (e) {
        emailError = e.message;
      }
    }

    await audit(req, {
      action: 'admin.create_user',
      resourceType: 'user',
      resourceId: r.insertId,
      meta: { email, role, emailSent }
    });

    ok(res, {
      user: { id: r.insertId, email, fullName, phone: phone || null, role, status: 'active' },
      generatedPassword,
      emailSent,
      emailError,
      message: emailSent
        ? `Utilisateur créé. Un email a été envoyé à ${email}.`
        : `Utilisateur créé. L'email n'a pas pu être envoyé${emailError ? ` (${emailError})` : ''}.`,
    }, undefined, 201);
  })
);

// ✅ NOUVEAU : Tontines d'un utilisateur
router.get('/users/:id/tontines',
  validate({ params: z.object({ id: s.id }) }),
  asyncHandler(async (req, res) => {
    const user = await db.one("SELECT id, full_name, email FROM users WHERE id = ? AND status <> 'deleted'", [req.params.id]);
    if (!user) throw E.notFound();

    const rows = await db.query(
      `SELECT t.id, t.name, t.status, t.contribution_amount, t.currency, t.frequency, t.start_date,
              m.tontine_role AS role, m.position, m.display_name,
              (SELECT COUNT(*) FROM tontine_members WHERE tontine_id = t.id) AS member_count,
              (SELECT COUNT(*) FROM rounds WHERE tontine_id = t.id AND status = 'paid_out') AS rounds_done,
              (SELECT COUNT(*) FROM rounds WHERE tontine_id = t.id) AS rounds_total
         FROM tontines t
         JOIN tontine_members m ON m.tontine_id = t.id
        WHERE m.user_id = ?
        ORDER BY t.created_at DESC`,
      [user.id]
    );

    ok(res, {
      user: { id: user.id, fullName: user.full_name, email: user.email },
      tontines: camel(rows),
    });
  })
);

router.patch('/users/:id', validate({ params: z.object({ id: s.id }), body: z.object({ status: z.enum(['active', 'disabled']).optional(), role: z.enum(['admin', 'member']).optional() }).strict() }), asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw E.conflict('Vous ne pouvez pas modifier votre propre compte ici');
  const u = await db.one("SELECT id FROM users WHERE id = ? AND status <> 'deleted'", [req.params.id]);
  if (!u) throw E.notFound();
  await db.query('UPDATE users SET status = COALESCE(?, status), role = COALESCE(?, role) WHERE id = ?', [req.body.status ?? null, req.body.role ?? null, u.id]);
  if (req.body.status === 'disabled') await db.query('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL', [u.id]);
  await audit(req, { action: 'admin.update_user', resourceType: 'user', resourceId: u.id, meta: req.body });
  ok(res, { message: 'Utilisateur mis à jour' });
}));

// ✅ NOUVEAU : Supprimer un utilisateur (soft delete)
router.delete('/users/:id',
  validate({ params: z.object({ id: s.id }) }),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) throw E.conflict('Vous ne pouvez pas supprimer votre propre compte ici');

    const u = await db.one("SELECT id, email, full_name FROM users WHERE id = ? AND status <> 'deleted'", [req.params.id]);
    if (!u) throw E.notFound();

    // Vérifier qu'il ne participe pas à une tontine active
    const active = await db.one(
      "SELECT COUNT(*) AS n FROM tontine_members m JOIN tontines t ON t.id = m.tontine_id WHERE m.user_id = ? AND t.status IN ('draft','active')",
      [u.id]
    );
    if (active.n > 0) throw E.conflict('Cet utilisateur participe à une tontine active. Retirez-le d\'abord des tontines.');

    await db.tx(async (conn) => {
      await db.query(
        "UPDATE users SET status = 'deleted', email = CONCAT('deleted-', id, '@deleted.invalid'), full_name = 'Compte supprimé', phone = NULL, password_hash = '!' WHERE id = ?",
        [u.id], conn
      );
      await db.query('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ?', [u.id], conn);
    });

    await audit(req, { action: 'admin.delete_user', resourceType: 'user', resourceId: u.id, meta: { email: u.email } });
    ok(res, { message: 'Utilisateur supprimé' });
  })
);

router.get('/audit-logs', validate({ query: z.object({ ...s.page, action: z.string().max(60).optional(), result: z.enum(['success', 'failure', 'denied']).optional() }).strict() }), asyncHandler(async (req, res) => {
  const p = pageParams(req.query);
  const where = ['1=1'];
  const params = [];
  if (req.query.action) { where.push('action LIKE ?'); params.push(`${req.query.action.replace(/[%_\\]/g, '\\$&')}%`); }
  if (req.query.result) { where.push('result = ?'); params.push(req.query.result); }
  const w = where.join(' AND ');
  const total = await db.one(`SELECT COUNT(*) AS n FROM audit_logs WHERE ${w}`, params);
  const rows = await db.query(`SELECT id, user_id, action, resource_type, resource_id, result, ip, created_at FROM audit_logs WHERE ${w} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, String(p.limit), String(p.offset)]);
  ok(res, camel(rows), pageMeta(p, total.n));
}));

module.exports = router;