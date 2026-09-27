'use strict';
const express = require('express');
const db = require('../db');
const { validate, z, s } = require('../middleware/validate');
const { asyncHandler, ok, E, camel, pageParams, pageMeta } = require('../utils/http');

const router = express.Router();

router.get('/', validate({ query: z.object({ ...s.page, unread: z.enum(['1']).optional() }).strict() }), asyncHandler(async (req, res) => {
  const p = pageParams(req.query);
  const where = req.query.unread ? 'AND read_at IS NULL' : '';
  const total = await db.one(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? ${where}`, [req.user.id]);
  const unread = await db.one('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
  const rows = await db.query(`SELECT id, type, title, body, read_at, created_at FROM notifications WHERE user_id = ? ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [req.user.id, String(p.limit), String(p.offset)]);
  ok(res, camel(rows), { ...pageMeta(p, total.n), unread: unread.n });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  await db.query('UPDATE notifications SET read_at = UTC_TIMESTAMP() WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
  ok(res, { message: 'Notifications lues' });
}));

router.post('/:id/read', validate({ params: z.object({ id: s.id }) }), asyncHandler(async (req, res) => {
  const r = await db.query('UPDATE notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP()) WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!r.affectedRows) throw E.notFound();
  ok(res, { message: 'Notification lue' });
}));

module.exports = router;
