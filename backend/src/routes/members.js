'use strict';
const express = require('express');
const db = require('../db');
const config = require('../config');
const { validate, z, s } = require('../middleware/validate');
const { asyncHandler, ok, E, camel } = require('../utils/http');
const { getAccess, requireRole } = require('../services/access');
const { notifyUser } = require('../notify');
const { audit } = require('../audit');
const { sendMail } = require('../mailer');
const { randomToken, sha256 } = require('../utils/crypto');

const router = express.Router();

router.get('/', validate({ query: z.object({ tontineId: s.id }).strict() }), asyncHandler(async (req, res) => {
  const a = await getAccess(req, req.query.tontineId);
  const rows = await db.query(
    `SELECT m.id, m.display_name, m.tontine_role, m.position, m.joined_at, (m.user_id IS NOT NULL) AS linked,
            ${a.isAdmin || ['manager', 'treasurer'].includes(a.role) ? 'COALESCE(u.email, m.invited_email)' : 'NULL'} AS email
       FROM tontine_members m LEFT JOIN users u ON u.id = m.user_id WHERE m.tontine_id = ? ORDER BY m.position, m.id`, [a.tontine.id]);
  ok(res, camel(rows.map((r) => ({ ...r, linked: !!r.linked }))));
}));

// ✅ Recherche globale de membres
router.get('/search',
  validate({
    query: z.object({
      q: z.string().trim().min(1).max(100),
      limit: z.coerce.number().int().min(1).max(20).optional(),
    }).strict()
  }),
  asyncHandler(async (req, res) => {
    const limit = req.query.limit || 5;
    const like = `%${req.query.q.replace(/[%_\\]/g, '\\$&')}%`;
    const rows = await db.query(
      `SELECT DISTINCT m.id, m.display_name, m.tontine_id, t.name AS tontine_name
         FROM tontine_members m
         JOIN tontines t ON t.id = m.tontine_id
        WHERE m.display_name LIKE ?
          AND (
            ? = 'admin'
            OR t.id IN (SELECT tontine_id FROM tontine_members WHERE user_id = ?)
          )
        ORDER BY m.display_name
        LIMIT ?`,
      [like, req.user.role, req.user.id, String(limit)]
    );
    ok(res, camel(rows));
  })
);

// ✅ Ajout d'un membre AVEC email d'invitation sécurisé par token
router.post('/', validate({ body: z.object({ tontineId: s.id, email: s.email, displayName: s.name }).strict() }), asyncHandler(async (req, res) => {
  const a = await getAccess(req, req.body.tontineId);
  requireRole(a, ['manager'], req);
  if (a.tontine.status !== 'draft') throw E.conflict('Les membres ne peuvent plus être modifiés une fois la tontine démarrée');

  const { email, displayName } = req.body;
  const user = await db.one("SELECT id, full_name FROM users WHERE email = ? AND status = 'active' AND email_verified_at IS NOT NULL", [email]);

  let inserted = false;
  let memberId = null;

  await db.tx(async (conn) => {
    const pos = await db.one('SELECT COALESCE(MAX(position),0) + 1 AS p, COUNT(*) AS n FROM tontine_members WHERE tontine_id = ? FOR UPDATE', [a.tontine.id], conn);
    if (pos.n >= 50) throw E.conflict('Nombre maximum de membres atteint');
    const dup = await db.one('SELECT id FROM tontine_members WHERE tontine_id = ? AND (user_id = ? OR invited_email = ?)', [a.tontine.id, user?.id ?? 0, email], conn);
    if (dup) {
      memberId = dup.id;
      return;
    }

    const r = await db.query('INSERT INTO tontine_members (tontine_id, user_id, invited_email, display_name, position) VALUES (?,?,?,?,?)',
      [a.tontine.id, user?.id ?? null, user ? null : email, displayName, pos.p], conn);
    memberId = r.insertId;
    inserted = true;
  });

  if (!inserted) {
    return ok(res, { message: 'Ce membre est déjà dans la tontine.' }, undefined, 200);
  }

  const inviterName = req.user.fullName;
  const tontineName = a.tontine.name;
  const appUrl = config.appUrl;
  const amount = Number(a.tontine.contribution_amount).toLocaleString('fr-FR');
  const currency = a.tontine.currency === 'XOF' ? 'FCFA' : a.tontine.currency;
  const freq = { weekly: 'hebdomadaire', biweekly: 'bimensuelle', monthly: 'mensuelle' }[a.tontine.frequency] || a.tontine.frequency;

  let emailSent = false;
  let emailError = null;

  if (user) {
    // L'utilisateur a déjà un compte → notification in-app + email "vous avez été ajouté"
    await notifyUser(user.id, {
      type: 'member.added',
      title: `Vous avez été ajouté à « ${tontineName} »`,
      body: `${inviterName} vous a ajouté à la tontine. Consultez-la dans votre espace.`,
    }, { email: true });
    emailSent = true;
  } else {
    // L'utilisateur n'a pas de compte → email d'invitation avec token unique
    try {
      const rawToken = randomToken(32);
      const tokenHash = sha256(rawToken);

      // Stocker le token en base (usage unique, valide 7 jours)
      await db.query(
        `INSERT INTO email_tokens (invited_email, member_id, purpose, token_hash, expires_at)
         VALUES (?, ?, 'invitation', ?, UTC_TIMESTAMP() + INTERVAL 7 DAY)`,
        [email, memberId, tokenHash]
      );

      await sendMail({
        to: email,
        subject: `Invitation à rejoindre la tontine « ${tontineName} »`,
        text:
`Bonjour ${displayName},

${inviterName} vous invite à rejoindre la tontine « ${tontineName} » sur Tontine.

📋 Informations de la tontine :
   • Cotisation : ${amount} ${currency}
   • Fréquence : ${freq}
   • Démarrage : ${new Date(a.tontine.start_date).toLocaleDateString('fr-FR')}

👉 Pour rejoindre cette tontine, cliquez sur ce lien personnel (valable 7 jours) :
   ${appUrl}/inscription?token=${rawToken}

⚠️ Ce lien est unique et personnel. Utilisez EXACTEMENT cette adresse email
pour créer votre compte : ${email}

Si vous ne souhaitez pas rejoindre cette tontine, ignorez cet email.

À bientôt,
L'équipe Tontine`,
      });
      emailSent = true;
    } catch (e) {
      emailError = e.message;
    }
  }

  await audit(req, {
    action: 'member.add',
    resourceType: 'tontine',
    resourceId: a.tontine.id,
    meta: { email, displayName, emailSent, userLinked: !!user },
  });

  ok(res, {
    message: user
      ? 'Membre ajouté. Une notification lui a été envoyée.'
      : emailSent
        ? 'Membre ajouté. Un email d\'invitation lui a été envoyé.'
        : `Membre ajouté. L'email d'invitation n'a pas pu être envoyé${emailError ? ` (${emailError})` : ''}.`,
    emailSent,
    emailError,
    userLinked: !!user,
  }, undefined, 201);
}));

async function loadMember(req, memberId) {
  const m = await db.one('SELECT * FROM tontine_members WHERE id = ?', [memberId]);
  if (!m) throw E.forbidden();
  const a = await getAccess(req, m.tontine_id);
  return { m, a };
}

router.patch('/:id', validate({ params: z.object({ id: s.id }), body: z.object({ tontineRole: z.enum(['treasurer', 'member', 'manager']) }).strict() }), asyncHandler(async (req, res) => {
  const { m, a } = await loadMember(req, req.params.id);
  requireRole(a, ['manager'], req);
  if (a.tontine.status === 'archived') throw E.conflict();
  if (m.tontine_role === 'manager' && req.body.tontineRole !== 'manager') {
    const n = await db.one("SELECT COUNT(*) AS n FROM tontine_members WHERE tontine_id = ? AND tontine_role = 'manager'", [m.tontine_id]);
    if (n.n <= 1) throw E.conflict('Il doit rester au moins un gestionnaire');
  }
  await db.query('UPDATE tontine_members SET tontine_role = ? WHERE id = ?', [req.body.tontineRole, m.id]);
  await audit(req, { action: 'member.set_role', resourceType: 'member', resourceId: m.id, meta: { role: req.body.tontineRole } });
  ok(res, { message: 'Rôle mis à jour' });
}));

router.delete('/:id',
  validate({ params: z.object({ id: s.id }) }),
  asyncHandler(async (req, res) => {
    const m = await db.one('SELECT * FROM tontine_members WHERE id = ?', [req.params.id]);
    if (!m) throw E.notFound();

    const t = await db.one('SELECT * FROM tontines WHERE id = ?', [m.tontine_id]);
    if (!t) throw E.notFound();

    const access = await getAccess(req, m.tontine_id);
    requireRole(access, ['manager'], req);

    if (m.user_id === req.user.id && m.tontine_role === 'manager') {
      const otherManagers = await db.one(
        "SELECT COUNT(*) AS n FROM tontine_members WHERE tontine_id = ? AND tontine_role = 'manager' AND id <> ?",
        [m.tontine_id, m.id]
      );
      if (otherManagers.n === 0) throw E.conflict('Vous êtes le dernier gestionnaire. Nommez un autre gestionnaire avant de vous retirer.');
    }

    if (t.status === 'active' || t.status === 'completed') {
      throw E.conflict('Impossible de retirer un membre d\'une tontine active. Archivez la tontine d\'abord.');
    }

    // Nettoyer les tokens d'invitation liés
    await db.query("DELETE FROM email_tokens WHERE member_id = ? AND purpose = 'invitation' AND used_at IS NULL", [m.id]);
    await db.query('DELETE FROM tontine_members WHERE id = ?', [m.id]);
    await audit(req, { action: 'member.remove', resourceType: 'tontine_member', resourceId: m.id, meta: { tontineId: t.id } });
    ok(res, { message: 'Membre retiré' });
  })
);

router.put('/order/:tontineId', validate({ params: z.object({ tontineId: s.id }), body: z.object({ memberIds: z.array(s.id).min(1).max(50) }).strict() }), asyncHandler(async (req, res) => {
  const a = await getAccess(req, req.params.tontineId);
  requireRole(a, ['manager'], req);
  if (a.tontine.status !== 'draft') throw E.conflict('L\'ordre est figé une fois la tontine démarrée');
  const ids = req.body.memberIds;
  const existing = await db.query('SELECT id FROM tontine_members WHERE tontine_id = ?', [a.tontine.id]);
  if (new Set(ids).size !== ids.length || ids.length !== existing.length || !existing.every((r) => ids.includes(r.id))) throw E.badRequest('Liste de membres incohérente');
  await db.tx(async (conn) => {
    for (let i = 0; i < ids.length; i += 1) await db.query('UPDATE tontine_members SET position = ? WHERE id = ? AND tontine_id = ?', [i + 1, ids[i], a.tontine.id], conn);
  });
  await audit(req, { action: 'member.reorder', resourceType: 'tontine', resourceId: a.tontine.id });
  ok(res, { message: 'Ordre enregistré' });
}));

module.exports = router;