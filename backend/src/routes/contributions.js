'use strict';
const express = require('express');
const db = require('../db');
const { validate, z, s } = require('../middleware/validate');
const { asyncHandler, ok, camel, pageParams, pageMeta } = require('../utils/http');
const { getAccess, canManage } = require('../services/access');

const router = express.Router();

// ============================================================
// ✅ Mes cotisations à régler (toutes tontines confondues)
// ============================================================
router.get('/mine', asyncHandler(async (req, res) => {
  const rows = await db.query(
    `SELECT c.id, c.tontine_id, t.name AS tontine_name, t.currency, c.amount_due, c.status, r.round_number, r.due_date, r.status AS round_status
       FROM contributions c JOIN tontine_members m ON m.id = c.member_id JOIN tontines t ON t.id = c.tontine_id JOIN rounds r ON r.id = c.round_id
      WHERE m.user_id = ? AND t.status = 'active' AND c.status = 'pending' AND r.status = 'open'
        AND r.round_number = (SELECT MIN(round_number) FROM rounds WHERE tontine_id = t.id AND status = 'open')
      ORDER BY r.due_date LIMIT 50`, [req.user.id]);
  ok(res, camel(rows));
}));

// ============================================================
// ✅ NOUVEAU : Résumé de mes paiements (3 derniers mois)
// ============================================================
router.get('/mine/summary', asyncHandler(async (req, res) => {
  // 1. Total payé sur les 3 derniers mois
  const totalPaid = await db.one(
    `SELECT COALESCE(SUM(t.amount), 0) AS total, COUNT(*) AS count
       FROM transactions t
       JOIN tontine_members m ON m.id = t.member_id
      WHERE m.user_id = ?
        AND t.type = 'contribution'
        AND t.status = 'validated'
        AND t.created_at >= (UTC_TIMESTAMP() - INTERVAL 3 MONTH)`,
    [req.user.id]
  );

  // 2. Cotisations en attente (nombre)
  const pending = await db.one(
    `SELECT COUNT(*) AS count
       FROM contributions c
       JOIN tontine_members m ON m.id = c.member_id
       JOIN tontines t ON t.id = c.tontine_id
      WHERE m.user_id = ?
        AND t.status = 'active'
        AND c.status = 'pending'`,
    [req.user.id]
  );

  // 3. Nombre de tontines actives où je participe
  const activeTontines = await db.one(
    `SELECT COUNT(DISTINCT t.id) AS count
       FROM tontines t
       JOIN tontine_members m ON m.tontine_id = t.id
      WHERE m.user_id = ? AND t.status = 'active'`,
    [req.user.id]
  );

  // 4. Dernières transactions (3 derniers mois, 20 max)
  const recent = await db.query(
    `SELECT 
        t.id, t.txn_number, t.type, t.amount, t.currency, t.method, t.status, t.created_at,
        tt.name AS tontine_name, tt.id AS tontine_id,
        r.round_number
       FROM transactions t
       JOIN tontine_members m ON m.id = t.member_id
       JOIN tontines tt ON tt.id = t.tontine_id
       LEFT JOIN rounds r ON r.id = t.round_id
      WHERE m.user_id = ?
        AND t.created_at >= (UTC_TIMESTAMP() - INTERVAL 3 MONTH)
      ORDER BY t.created_at DESC
      LIMIT 20`,
    [req.user.id]
  );

  ok(res, {
    stats: {
      totalPaid: Number(totalPaid.total),
      paymentsCount: Number(totalPaid.count),
      pendingCount: Number(pending.count),
      activeTontinesCount: Number(activeTontines.count),
    },
    recent: camel(recent),
  });
}));

// ============================================================
// Liste paginée (avec filtres)
// ============================================================
router.get('/', validate({ query: z.object({ ...s.page, tontineId: s.id, roundId: s.id.optional(), status: z.enum(['pending', 'paid']).optional() }).strict() }),
  asyncHandler(async (req, res) => {
    const a = await getAccess(req, req.query.tontineId);
    const p = pageParams(req.query);
    const where = ['c.tontine_id = ?'];
    const params = [a.tontine.id];
    if (!canManage(a)) { where.push('m.user_id = ?'); params.push(req.user.id); }
    if (req.query.roundId) { where.push('c.round_id = ?'); params.push(req.query.roundId); }
    if (req.query.status) { where.push('c.status = ?'); params.push(req.query.status); }
    const w = where.join(' AND ');
    const total = await db.one(`SELECT COUNT(*) AS n FROM contributions c JOIN tontine_members m ON m.id = c.member_id WHERE ${w}`, params);
    const rows = await db.query(
      `SELECT c.id, c.round_id, r.round_number, r.due_date, c.member_id, m.display_name AS member_name, c.amount_due, c.status, c.paid_at, (m.user_id = ?) AS is_mine
         FROM contributions c JOIN tontine_members m ON m.id = c.member_id JOIN rounds r ON r.id = c.round_id
        WHERE ${w} ORDER BY r.round_number, m.position LIMIT ? OFFSET ?`, [req.user.id, ...params, p.limit, p.offset]);
    ok(res, camel(rows.map((r) => ({ ...r, is_mine: !!r.is_mine }))), pageMeta(p, total.n));
  }));

module.exports = router;