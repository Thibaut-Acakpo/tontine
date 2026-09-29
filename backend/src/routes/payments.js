'use strict';
const express = require('express');
const db = require('../db');
const { validate, z, s } = require('../middleware/validate');
const { limiters } = require('../middleware/security');
const { asyncHandler, ok, E } = require('../utils/http');
const { getAccess, requireRole } = require('../services/access');
const ledger = require('../services/ledger');
const { notifyMember } = require('../notify');
const { audit } = require('../audit');

const router = express.Router();
router.use(limiters.sensitive);

const money = (n, cur) => `${Number(n).toLocaleString('fr-FR')} ${cur}`;
const idem = z.string().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/).optional();

/**
 * Récupère une contribution par son ID.
 */
async function contributionInfo(id) {
  const c = await db.one(
    'SELECT id, tontine_id, member_id FROM contributions WHERE id = ?',
    [id]
  );
  if (!c) throw E.notFound('Contribution introuvable');
  return c;
}

// ============================================================
// Encaissement en espèces (par le trésorier / gestionnaire)
// ============================================================
router.post('/cash',
  validate({
    body: z.object({
      contributionId: s.id,
      note: z.string().trim().max(200).optional(),
      idempotencyKey: idem,
    }).strict(),
  }),
  asyncHandler(async (req, res) => {
    const c = await contributionInfo(req.body.contributionId);
    const a = await getAccess(req, c.tontine_id);
    requireRole(a, ['manager', 'treasurer'], req);

    const t = await ledger.recordCash({
      contributionId: c.id,
      tontineId: a.tontine.id,
      actorId: req.user.id,
      note: req.body.note,
      idempotencyKey: req.body.idempotencyKey,
    });

    await audit(req, {
      action: 'payment.cash_recorded',
      resourceType: 'transaction',
      resourceId: t.id,
      meta: { amount: t.amount },
    });

    await notifyMember(t.memberId, {
      type: 'payment.validated',
      title: 'Cotisation enregistrée',
      body: `Votre cotisation de ${money(t.amount, t.currency)} pour « ${t.tontineName} » a été enregistrée (${t.txnNumber}).`,
    }, { email: true });

    ok(res, { transactionId: t.id, txnNumber: t.txnNumber }, undefined, 201);
  })
);

// ============================================================
// Versement au bénéficiaire du tour
// ============================================================
router.post('/payout',
  validate({ body: z.object({ roundId: s.id, tontineId: s.id }).strict() }),
  asyncHandler(async (req, res) => {
    const a = await getAccess(req, req.body.tontineId);
    requireRole(a, ['manager', 'treasurer'], req);

    const t = await ledger.payoutRound({
      roundId: req.body.roundId,
      tontineId: a.tontine.id,
      actorId: req.user.id,
    });

    await audit(req, {
      action: 'payment.payout',
      resourceType: 'transaction',
      resourceId: t.id,
      meta: { amount: t.amount, round: t.roundNumber },
    });

    await notifyMember(t.beneficiaryMemberId, {
      type: 'payout.done',
      title: 'Versement effectué',
      body: `Le versement du tour ${t.roundNumber} de « ${a.tontine.name} » (${money(t.amount, t.currency)}) a été enregistré (${t.txnNumber}).`,
    }, { email: true });

    ok(res, {
      transactionId: t.id,
      txnNumber: t.txnNumber,
      amount: t.amount,
    }, undefined, 201);
  })
);

module.exports = router;