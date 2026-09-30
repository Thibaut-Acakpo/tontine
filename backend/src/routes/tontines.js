'use strict';
const express = require('express');
const db = require('../db');
const { validate, z, s } = require('../middleware/validate');
const { asyncHandler, ok, E, camel, pageParams, pageMeta } = require('../utils/http');
const { getAccess, requireRole } = require('../services/access');
const { notifyUser } = require('../notify');
const { audit } = require('../audit');

const router = express.Router();
const idParam = z.object({ id: s.id });
const base = {
  name: s.name,
  description: z.string().trim().max(500).nullable().optional(),
  contributionAmount: z.number().int().min(100).max(100_000_000),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  startDate: s.date,
};

router.get('/', validate({ query: z.object({ ...s.page, status: z.enum(['draft', 'active', 'completed', 'archived']).optional(), scope: z.enum(['mine', 'all']).optional(), q: z.string().trim().max(100).optional() }).strict() }),
  asyncHandler(async (req, res) => {
    const p = pageParams(req.query);
    const all = req.query.scope === 'all' && req.user.role === 'admin';

    // Construire les conditions
    const where = [];
    const whereParams = [];

    if (!all) {
      where.push('m.user_id = ?');
      whereParams.push(req.user.id);
    }

    if (req.query.status) {
      where.push('t.status = ?');
      whereParams.push(req.query.status);
    }

    if (req.query.q) {
      const like = `%${req.query.q.replace(/[%_\\]/g, '\\$&')}%`;
      where.push('t.name LIKE ?');
      whereParams.push(like);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // FROM : en mode "all", on joint avec un user_id spécifique pour récupérer le rôle
    const from = all
      ? `FROM tontines t LEFT JOIN tontine_members m ON m.tontine_id = t.id AND m.user_id = ?`
      : 'FROM tontines t JOIN tontine_members m ON m.tontine_id = t.id';

    const fromParams = all ? [req.user.id] : [];

    const total = await db.one(
      `SELECT COUNT(*) AS n ${from} ${whereClause}`,
      [...fromParams, ...whereParams]
    );

    const rows = await db.query(
      `SELECT t.id, t.name, t.description, t.contribution_amount, t.currency, t.frequency, t.start_date, t.status,
              m.tontine_role AS my_role,
              (SELECT COUNT(*) FROM tontine_members WHERE tontine_id = t.id) AS member_count,
              (SELECT COUNT(*) FROM rounds WHERE tontine_id = t.id AND status = 'paid_out') AS rounds_done,
              (SELECT COUNT(*) FROM rounds WHERE tontine_id = t.id) AS rounds_total,
              (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE tontine_id = t.id AND type = 'contribution' AND status = 'validated') AS collected,
              (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE tontine_id = t.id AND type = 'payout' AND status = 'validated') AS paid_out
         ${from} ${whereClause}
         ORDER BY t.created_at DESC LIMIT ${p.limit} OFFSET ${p.offset}`,
[...fromParams, ...whereParams]
    );

    ok(res, camel(rows), pageMeta(p, total.n));
  }));

router.post('/', validate({ body: z.object(base).strict() }), asyncHandler(async (req, res) => {
  const b = req.body;
  const id = await db.tx(async (conn) => {
    const r = await db.query('INSERT INTO tontines (name, description, contribution_amount, frequency, start_date, created_by) VALUES (?,?,?,?,?,?)',
      [b.name, b.description || null, b.contributionAmount, b.frequency, b.startDate, req.user.id], conn);
    await db.query("INSERT INTO tontine_members (tontine_id, user_id, display_name, tontine_role, position) VALUES (?,?,?,'manager',1)", [r.insertId, req.user.id, req.user.fullName], conn);
    return r.insertId;
  });
  await audit(req, { action: 'tontine.create', resourceType: 'tontine', resourceId: id });
  ok(res, { id }, undefined, 201);
}));

router.get('/:id', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const a = await getAccess(req, req.params.id);
  const t = a.tontine;
  const stats = await db.one(
    `SELECT (SELECT COUNT(*) FROM tontine_members WHERE tontine_id = ?) AS member_count,
            (SELECT COUNT(*) FROM rounds WHERE tontine_id = ? AND status = 'paid_out') AS rounds_done,
            (SELECT COUNT(*) FROM rounds WHERE tontine_id = ?) AS rounds_total,
            (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE tontine_id = ? AND type = 'contribution' AND status = 'validated') AS collected,
            (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE tontine_id = ? AND type = 'payout' AND status = 'validated') AS paid_out`,
    Array(5).fill(t.id));
  ok(res, camel({ id: t.id, name: t.name, description: t.description, contribution_amount: t.contribution_amount, currency: t.currency, frequency: t.frequency, start_date: t.start_date, status: t.status, my_role: a.role, my_member_id: a.member?.id ?? null, ...stats }));
}));

router.patch('/:id', validate({ params: idParam, body: z.object({ name: base.name.optional(), description: base.description, contributionAmount: base.contributionAmount.optional(), frequency: base.frequency.optional(), startDate: base.startDate.optional() }).strict() }),
  asyncHandler(async (req, res) => {
    const a = await getAccess(req, req.params.id);
    requireRole(a, ['manager'], req);
    const b = req.body;
    const structural = b.contributionAmount !== undefined || b.frequency !== undefined || b.startDate !== undefined;
    if (a.tontine.status === 'archived' || (structural && a.tontine.status !== 'draft')) throw E.conflict('Modification impossible : la tontine est déjà démarrée');
    await db.query(
      `UPDATE tontines SET name = COALESCE(?, name), description = CASE WHEN ? THEN ? ELSE description END,
         contribution_amount = COALESCE(?, contribution_amount), frequency = COALESCE(?, frequency), start_date = COALESCE(?, start_date) WHERE id = ?`,
      [b.name ?? null, b.description !== undefined ? 1 : 0, b.description ?? null, b.contributionAmount ?? null, b.frequency ?? null, b.startDate ?? null, a.tontine.id]);
    await audit(req, { action: 'tontine.update', resourceType: 'tontine', resourceId: a.tontine.id, meta: { fields: Object.keys(b) } });
    ok(res, { message: 'Tontine mise à jour' });
  }));

const STEP_DAYS = { weekly: 7, biweekly: 14 };
function dueDate(start, frequency, i) {
  const d = new Date(`${start}T00:00:00Z`);
  if (frequency === 'monthly') d.setUTCMonth(d.getUTCMonth() + i);
  else d.setUTCDate(d.getUTCDate() + STEP_DAYS[frequency] * i);
  return d.toISOString().slice(0, 10);
}

// Démarrage
router.post('/:id/start', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const a = await getAccess(req, req.params.id);
  requireRole(a, ['manager'], req);
  const t = a.tontine;
  await db.tx(async (conn) => {
    const locked = await db.one('SELECT * FROM tontines WHERE id = ? FOR UPDATE', [t.id], conn);
    if (locked.status !== 'draft') throw E.conflict('La tontine est déjà démarrée');
    const members = await db.query('SELECT id FROM tontine_members WHERE tontine_id = ? ORDER BY position, id', [t.id], conn);
    if (members.length < 2) throw E.conflict('Au moins 2 membres sont nécessaires');
    for (let i = 0; i < members.length; i += 1) {
      const r = await db.query('INSERT INTO rounds (tontine_id, round_number, beneficiary_member_id, due_date) VALUES (?,?,?,?)', [t.id, i + 1, members[i].id, dueDate(locked.start_date, locked.frequency, i)], conn);
      for (const m of members) {
        await db.query('INSERT INTO contributions (tontine_id, round_id, member_id, amount_due) VALUES (?,?,?,?)', [t.id, r.insertId, m.id, locked.contribution_amount], conn);
      }
    }
    await db.query("UPDATE tontines SET status = 'active' WHERE id = ?", [t.id], conn);
  });
  const users = await db.query('SELECT user_id FROM tontine_members WHERE tontine_id = ? AND user_id IS NOT NULL AND user_id <> ?', [t.id, req.user.id]);
  for (const u of users) await notifyUser(u.user_id, { type: 'tontine.started', title: `La tontine « ${t.name} » a démarré`, body: 'Les cotisations du premier tour sont ouvertes.' }, { email: true });
  await audit(req, { action: 'tontine.start', resourceType: 'tontine', resourceId: t.id });
  ok(res, { message: 'Tontine démarrée' });
}));

router.post('/:id/archive', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const a = await getAccess(req, req.params.id);
  requireRole(a, ['manager'], req);
  if (a.tontine.status === 'active') throw E.conflict('Terminez les tours avant d\'archiver');
  await db.query("UPDATE tontines SET status = 'archived' WHERE id = ?", [a.tontine.id]);
  await audit(req, { action: 'tontine.archive', resourceType: 'tontine', resourceId: a.tontine.id });
  ok(res, { message: 'Tontine archivée' });
}));

// ✅ NOUVEAU : Supprimer une tontine
router.delete('/:id', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const a = await getAccess(req, req.params.id);
  requireRole(a, ['manager'], req);
  const t = a.tontine;

  if (t.status === 'active') {
    throw E.conflict('Impossible de supprimer une tontine active. Archivez-la d\'abord.');
  }

  // Pour completed/archived : on garde l'historique financier
  if (t.status === 'completed' || t.status === 'archived') {
    const txn = await db.one('SELECT COUNT(*) AS n FROM transactions WHERE tontine_id = ?', [t.id]);
    if (txn.n > 0) {
      throw E.conflict('Cette tontine contient des transactions. Elle ne peut pas être supprimée pour préserver l\'historique financier.');
    }
  }

  await db.tx(async (conn) => {
    await db.query('DELETE FROM uploads WHERE transaction_id IN (SELECT id FROM transactions WHERE tontine_id = ?)', [t.id], conn);
    await db.query('DELETE FROM transactions WHERE tontine_id = ?', [t.id], conn);
    await db.query('DELETE FROM contributions WHERE tontine_id = ?', [t.id], conn);
    await db.query('DELETE FROM rounds WHERE tontine_id = ?', [t.id], conn);
    await db.query('DELETE FROM tontine_members WHERE tontine_id = ?', [t.id], conn);
    await db.query('DELETE FROM tontines WHERE id = ?', [t.id], conn);
  });

  await audit(req, { action: 'tontine.delete', resourceType: 'tontine', resourceId: t.id, meta: { name: t.name } });
  ok(res, { message: 'Tontine supprimée' });
}));

// Tours
router.get('/:id/rounds', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const a = await getAccess(req, req.params.id);
  const rows = await db.query(
    `SELECT r.id, r.round_number, r.due_date, r.status, r.beneficiary_member_id, bm.display_name AS beneficiary_name,
            (SELECT COUNT(*) FROM contributions WHERE round_id = r.id) AS contributions_total,
            (SELECT COUNT(*) FROM contributions WHERE round_id = r.id AND status = 'paid') AS contributions_paid,
            (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE round_id = r.id AND type = 'contribution' AND status = 'validated') AS collected
       FROM rounds r JOIN tontine_members bm ON bm.id = r.beneficiary_member_id WHERE r.tontine_id = ? ORDER BY r.round_number`, [a.tontine.id]);
  const current = rows.find((r) => r.status === 'open')?.round_number ?? null;
  ok(res, camel(rows.map((r) => ({ ...r, is_current: r.round_number === current }))));
}));

module.exports = router;