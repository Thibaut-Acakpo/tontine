'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const db = require('../db');
const { validate, z, s } = require('../middleware/validate');
const { limiters } = require('../middleware/security');
const { uploader, saveUploadedFile } = require('../middleware/upload');
const { asyncHandler, ok, E, camel, pageParams, pageMeta } = require('../utils/http');
const { getAccess, requireRole, canManage } = require('../services/access');
const ledger = require('../services/ledger');
const { notifyMember } = require('../notify');
const { audit } = require('../audit');

const router = express.Router();
const COLS = `t.id, t.txn_number, t.tontine_id, t.round_id, r.round_number, t.member_id, m.display_name AS member_name, t.type, t.amount, t.currency,
  t.status, t.method, t.reverses_txn_id, t.note, t.created_at, t.validated_at`;
const FROM = 'FROM transactions t JOIN rounds r ON r.id = t.round_id LEFT JOIN tontine_members m ON m.id = t.member_id';

router.get('/', validate({ query: z.object({ ...s.page, tontineId: s.id, type: z.enum(['contribution', 'payout', 'reversal']).optional(), status: z.enum(['pending', 'validated', 'failed', 'reversed']).optional() }).strict() }),
  asyncHandler(async (req, res) => {
    const a = await getAccess(req, req.query.tontineId);
    const p = pageParams(req.query);
    const where = ['t.tontine_id = ?'];
    const params = [a.tontine.id];
    if (!canManage(a)) { where.push('m.user_id = ?'); params.push(req.user.id); }
    if (req.query.type) { where.push('t.type = ?'); params.push(req.query.type); }
    if (req.query.status) { where.push('t.status = ?'); params.push(req.query.status); }
    const w = where.join(' AND ');
    const total = await db.one(`SELECT COUNT(*) AS n ${FROM} WHERE ${w}`, params);
    const rows = await db.query(`SELECT ${COLS} ${FROM} WHERE ${w} ORDER BY t.id DESC LIMIT ${p.limit} OFFSET ${p.offset}`, [...params]);
    ok(res, camel(rows), pageMeta(p, total.n));
  }));

async function loadTxn(req, id) {
  const t = await db.one(`SELECT ${COLS}, m.user_id AS member_user_id ${FROM} WHERE t.id = ?`, [id]);
  if (!t) throw E.forbidden();
  const a = await getAccess(req, t.tontine_id);
  if (!canManage(a) && t.member_user_id !== req.user.id) {
    await audit(req, { action: 'access.denied', resourceType: 'transaction', resourceId: id, result: 'denied' });
    throw E.forbidden();
  }
  return { t, a };
}

router.get('/:id', validate({ params: z.object({ id: s.id }) }), asyncHandler(async (req, res) => {
  const { t } = await loadTxn(req, req.params.id);
  const proofs = await db.query('SELECT id, original_name, mime, size, created_at FROM uploads WHERE transaction_id = ?', [t.id]);
  const { member_user_id, ...pub } = t; // eslint-disable-line no-unused-vars
  ok(res, camel({ ...pub, proofs }));
}));

router.post('/:id/reverse', limiters.sensitive, validate({ params: z.object({ id: s.id }), body: z.object({ reason: z.string().trim().min(5).max(200) }).strict() }), asyncHandler(async (req, res) => {
  const { t, a } = await loadTxn(req, req.params.id);
  requireRole(a, ['manager', 'treasurer'], req);
  const r = await ledger.reverseTransaction({ txnId: t.id, tontineId: t.tontine_id, actorId: req.user.id, reason: req.body.reason });
  await audit(req, { action: 'transaction.reverse', resourceType: 'transaction', resourceId: t.id, meta: { reversal: r.txnNumber, reason: req.body.reason } });
  if (t.member_id) await notifyMember(t.member_id, { type: 'transaction.reversed', title: 'Transaction annulée', body: `La transaction ${t.txn_number} a été annulée : ${req.body.reason}` }, { email: false });
  ok(res, { reversalId: r.id, txnNumber: r.txnNumber }, undefined, 201);
}));

// Justificatif (reçu, capture...) : contrôlé (taille, type, contenu), stocké hors dossier public.
router.post('/:id/proof', limiters.sensitive, validate({ params: z.object({ id: s.id }) }), (req, res, next) => uploader(req, res, next), asyncHandler(async (req, res) => {
  const { t } = await loadTxn(req, req.params.id);
  if (!req.file) throw E.badRequest('Fichier manquant');
  const n = await db.one('SELECT COUNT(*) AS n FROM uploads WHERE transaction_id = ?', [t.id]);
  if (n.n >= 3) throw E.conflict('Nombre maximum de justificatifs atteint');
  const f = await saveUploadedFile(req.file);
  const r = await db.query('INSERT INTO uploads (transaction_id, stored_name, original_name, mime, size, uploaded_by) VALUES (?,?,?,?,?,?)', [t.id, f.storedName, f.originalName, f.mime, f.size, req.user.id]);
  await audit(req, { action: 'upload.proof', resourceType: 'transaction', resourceId: t.id, meta: { uploadId: r.insertId, size: f.size } });
  ok(res, { id: r.insertId }, undefined, 201);
}));

router.get('/:id/proof/:uploadId', validate({ params: z.object({ id: s.id, uploadId: s.id }) }), asyncHandler(async (req, res) => {
  const { t } = await loadTxn(req, req.params.id);
  const u = await db.one('SELECT * FROM uploads WHERE id = ? AND transaction_id = ?', [req.params.uploadId, t.id]);
  if (!u) throw E.notFound();
  const file = path.join(config.uploadDir, u.stored_name);
  if (!fs.existsSync(file)) throw E.notFound();
  res.setHeader('Content-Type', u.mime);
  res.setHeader('Content-Disposition', `attachment; filename="proof-${u.id}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  fs.createReadStream(file).pipe(res);
}));

module.exports = router;
