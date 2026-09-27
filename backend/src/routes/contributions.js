'use strict';
const express = require('express');
const db = require('../db');
const { validate, z, s } = require('../middleware/validate');
const { asyncHandler, ok, camel, pageParams, pageMeta } = require('../utils/http');
const { getAccess, canManage } = require('../services/access');

const router = express.Router();

// Mes cotisations à régler, toutes tontines confondues.
router.get('/mine', asyncHandler(async (req, res) => {
  const rows = await db.query(
    `SELECT c.id, c.tontine_id, t.name AS tontine_name, t.currency, c.amount_due, c.status, r.round_number, r.due_date, r.status AS round_status
       FROM contributions c JOIN tontine_members m ON m.id = c.member_id JOIN tontines t ON t.id = c.tontine_id JOIN rounds r ON r.id = c.round_id
      WHERE m.user_id = ? AND t.status = 'active' AND c.status = 'pending' AND r.status = 'open'
        AND r.round_number = (SELECT MIN(round_number) FROM rounds WHERE tontine_id = t.id AND status = 'open')
      ORDER BY r.due_date LIMIT 50`, [req.user.id]);
  ok(res, camel(rows));
}));

router.get('/', validate({ query: z.object({ ...s.page, tontineId: s.id, roundId: s.id.optional(), status: z.enum(['pending', 'paid']).optional() }).strict() }),
  asyncHandler(async (req, res) => {
    const a = await getAccess(req, req.query.tontineId);
    const p = pageParams(req.query);
    const where = ['c.tontine_id = ?'];
    const params = [a.tontine.id];
    if (!canManage(a)) { where.push('m.user_id = ?'); params.push(req.user.id); } // un membre ne voit que ses cotisations
    if (req.query.roundId) { where.push('c.round_id = ?'); params.push(req.query.roundId); }
    if (req.query.status) { where.push('c.status = ?'); params.push(req.query.status); }
    const w = where.join(' AND ');
    const total = await db.one(`SELECT COUNT(*) AS n FROM contributions c JOIN tontine_members m ON m.id = c.member_id WHERE ${w}`, params);
    const rows = await db.query(
      `SELECT c.id, c.round_id, r.round_number, r.due_date, c.member_id, m.display_name AS member_name, c.amount_due, c.status, c.paid_at, (m.user_id = ?) AS is_mine
         FROM contributions c JOIN tontine_members m ON m.id = c.member_id JOIN rounds r ON r.id = c.round_id
        WHERE ${w} ORDER BY r.round_number, m.position LIMIT ? OFFSET ?`, [req.user.id, ...params, String(p.limit), String(p.offset)]);
    ok(res, camel(rows.map((r) => ({ ...r, is_mine: !!r.is_mine }))), pageMeta(p, total.n));
  }));

module.exports = router;
