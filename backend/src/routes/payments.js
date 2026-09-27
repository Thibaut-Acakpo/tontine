'use strict';
const express = require('express');
const config = require('../config');
const db = require('../db');
const { validate, z, s } = require('../middleware/validate');
const { limiters } = require('../middleware/security');
const { asyncHandler, ok, E } = require('../utils/http');
const { getAccess, requireRole } = require('../services/access');
const ledger = require('../services/ledger');
const { getProvider, newReference, mock } = require('../services/providers');
const { processWebhookEvent } = require('../services/webhooks');
const { notifyMember } = require('../notify');
const { audit } = require('../audit');
const { sendPushToUser } = require('../services/onesignal');

const router = express.Router();
router.use(limiters.sensitive);

const money = (n, cur) => `${Number(n).toLocaleString('fr-FR')} ${cur}`;
const idem = z.string().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/).optional();

async function contributionInfo(id) {
  const c = await db.one('SELECT id, tontine_id, member_id FROM contributions WHERE id = ?', [id]);
  if (!c) throw E.forbidden();
  return c;
}

// ============================================================
// ✅ KKIAPAY : Initier un paiement (retourne les infos pour le widget frontend)
// ============================================================
router.post('/initiate', validate({ body: z.object({ contributionId: s.id }).strict() }), asyncHandler(async (req, res) => {
  // Si Kkiapay est configuré, on l'utilise. Sinon on retombe sur le provider interne.
  const useKkiapay = config.kkiapay?.publicKey && config.kkiapay?.privateKey;

  const c = await contributionInfo(req.body.contributionId);
  const a = await getAccess(req, c.tontine_id);
  const mine = await db.one('SELECT id FROM tontine_members WHERE id = ? AND user_id = ?', [c.member_id, req.user.id]);
  if (!mine) { await audit(req, { action: 'payment.initiate', resourceType: 'contribution', resourceId: c.id, result: 'denied' }); throw E.forbidden(); }

  if (useKkiapay) {
    // Mode Kkiapay : on renvoie juste le montant et la clé publique au frontend
    const contribution = await db.one('SELECT amount_due, currency FROM contributions WHERE id = ?', [c.id]);
    await audit(req, { action: 'payment.initiate_kkiapay', resourceType: 'contribution', resourceId: c.id });
    return ok(res, {
      mode: 'kkiapay',
      publicKey: config.kkiapay.publicKey,
      sandbox: config.kkiapay.sandbox,
      amount: Number(contribution.amount_due),
      currency: contribution.currency || 'XOF',
      contributionId: c.id,
      reference: `COT-${c.id}-${Date.now()}`,
    }, undefined, 201);
  }

  // Fallback : provider interne (mock)
  const provider = getProvider(config.paymentProvider);
  if (!provider) throw E.conflict('Le paiement en ligne n\'est pas activé. Contactez votre trésorier.');
  const reference = newReference();
  const idempotencyKey = z.string().max(80).safeParse(req.get('idempotency-key')).data || null;
  const t = await ledger.initiateProviderPayment({ contributionId: c.id, tontineId: a.tontine.id, actorId: req.user.id, provider: provider.name, reference, idempotencyKey });
  const checkout = await provider.createCheckout({ reference, amount: t.amount, currency: t.currency });
  await audit(req, { action: 'payment.initiate', resourceType: 'transaction', resourceId: t.id });
  ok(res, { transactionId: t.id, txnNumber: t.txnNumber, reference, amount: t.amount, currency: t.currency, checkoutUrl: checkout.checkoutUrl }, undefined, 201);
}));

// ============================================================
// ✅ KKIAPAY : Webhook appelé par Kkiapay pour confirmer le paiement
// ============================================================
router.post('/kkiapay/webhook', asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const transactionId = payload.transactionId || payload.transaction_id;
  const contributionId = payload?.data?.contributionId || payload?.contributionId;
  const status = payload.status || payload.state;
  const method = payload.method || payload.paymentMethod || 'kkiapay';

  if (!transactionId || !contributionId) {
    return res.status(400).json({ error: 'Paramètres manquants' });
  }

  // Vérifier auprès de Kkiapay (source de vérité)
  let verifiedStatus = status;
  try {
    if (config.kkiapay?.privateKey) {
      const { verifyTransaction } = require('../services/kkiapay');
      const v = await verifyTransaction(transactionId);
      verifiedStatus = v.status || v.state || status;
    }
  } catch (e) {
    // En cas d'échec de vérification, on utilise le statut reçu
  }

  const isSuccess = String(verifiedStatus).toUpperCase().includes('SUCCESS');

  if (!isSuccess) {
    return res.json({ ok: true, message: 'Paiement non réussi, ignoré' });
  }

  try {
    await db.tx(async (conn) => {
      const c = await db.one('SELECT * FROM contributions WHERE id = ? FOR UPDATE', [contributionId], conn);
      if (!c) throw E.notFound();
      if (c.status === 'paid') return;

      const txnNumber = `TXN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
      await db.query(
        `INSERT INTO transactions (txn_number, tontine_id, round_id, contribution_id, member_id, type, amount, currency, method, status, kkiapay_reference, kkiapay_status, kkiapay_method, kkiapay_payload)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          txnNumber, c.tontine_id, c.round_id, c.id, c.member_id,
          'contribution', c.amount_due, 'XOF', 'mobile_money', 'validated',
          transactionId, verifiedStatus, method, JSON.stringify(payload),
        ],
        conn
      );
      await db.query("UPDATE contributions SET status = 'paid', paid_at = UTC_TIMESTAMP() WHERE id = ?", [c.id], conn);
    });
  } catch (e) {
    // Peut arriver si la transaction existe déjà — on ignore
  }

  // Notifier le membre + le gestionnaire
  const c = await db.one(
    `SELECT c.*, t.name AS tontine_name, m.user_id AS member_user_id
       FROM contributions c
       JOIN tontines t ON t.id = c.tontine_id
       JOIN tontine_members m ON m.id = c.member_id
      WHERE c.id = ?`, [contributionId]);

  if (c) {
    const amount = money(c.amount_due, 'XOF');
    // Notifier le membre
    if (c.member_user_id) {
      await notifyMember(c.member_id, {
        type: 'payment.validated',
        title: 'Paiement confirmé',
        body: `Votre cotisation de ${amount} pour « ${c.tontine_name} » a été confirmée.`,
      }, { email: true });
      await sendPushToUser(c.member_user_id, 'Paiement confirmé', `${amount} payés pour ${c.tontine_name}`);
    }

    // Notifier les gestionnaires
    const managers = await db.query(
      "SELECT user_id FROM tontine_members WHERE tontine_id = ? AND user_id IS NOT NULL AND user_id <> ? AND tontine_role IN ('manager','treasurer')",
      [c.tontine_id, c.member_user_id]
    );
    for (const m of managers) {
      await notifyMember(m.user_id, {
        type: 'payment.received',
        title: 'Cotisation reçue',
        body: `${c.tontine_name} : ${amount} reçus en ligne.`,
      }, { email: false });
      await sendPushToUser(m.user_id, 'Cotisation reçue', `${amount} pour ${c.tontine_name}`);
    }
  }

  res.json({ ok: true, message: 'Paiement traité' });
}));

// Encaissement en espèces par le trésorier / gestionnaire.
router.post('/cash', validate({ body: z.object({ contributionId: s.id, note: z.string().trim().max(200).optional(), idempotencyKey: idem }).strict() }), asyncHandler(async (req, res) => {
  const c = await contributionInfo(req.body.contributionId);
  const a = await getAccess(req, c.tontine_id);
  requireRole(a, ['manager', 'treasurer'], req);
  const t = await ledger.recordCash({ contributionId: c.id, tontineId: a.tontine.id, actorId: req.user.id, note: req.body.note, idempotencyKey: req.body.idempotencyKey });
  await audit(req, { action: 'payment.cash_recorded', resourceType: 'transaction', resourceId: t.id, meta: { amount: t.amount } });
  await notifyMember(t.memberId, { type: 'payment.validated', title: 'Cotisation enregistrée', body: `Votre cotisation de ${money(t.amount, t.currency)} pour « ${t.tontineName} » a été enregistrée (${t.txnNumber}).` }, { email: true });
  ok(res, { transactionId: t.id, txnNumber: t.txnNumber }, undefined, 201);
}));

router.post('/payout', validate({ body: z.object({ roundId: s.id, tontineId: s.id }).strict() }), asyncHandler(async (req, res) => {
  const a = await getAccess(req, req.body.tontineId);
  requireRole(a, ['manager', 'treasurer'], req);
  const t = await ledger.payoutRound({ roundId: req.body.roundId, tontineId: a.tontine.id, actorId: req.user.id });
  await audit(req, { action: 'payment.payout', resourceType: 'transaction', resourceId: t.id, meta: { amount: t.amount, round: t.roundNumber } });
  await notifyMember(t.beneficiaryMemberId, { type: 'payout.done', title: 'Versement effectué', body: `Le versement du tour ${t.roundNumber} de « ${a.tontine.name} » (${money(t.amount, t.currency)}) a été enregistré (${t.txnNumber}).` }, { email: true });

  // ✅ Push au bénéficiaire
  const benef = await db.one('SELECT user_id FROM tontine_members WHERE id = ?', [t.beneficiaryMemberId]);
  if (benef?.user_id) {
    await sendPushToUser(benef.user_id, 'Versement reçu', `${money(t.amount, t.currency)} reçus de ${a.tontine.name}`);
  }

  ok(res, { transactionId: t.id, txnNumber: t.txnNumber, amount: t.amount }, undefined, 201);
}));

// Simulateur de fournisseur : DÉVELOPPEMENT UNIQUEMENT
if (!config.isProd && config.paymentProvider === 'mock') {
  router.post('/dev/simulate', validate({ body: z.object({ reference: z.string().min(5).max(80), outcome: z.enum(['succeeded', 'failed']) }).strict() }), asyncHandler(async (req, res) => {
    const t = await db.one('SELECT t.id, m.user_id FROM transactions t JOIN tontine_members m ON m.id = t.member_id WHERE t.provider_ref = ?', [req.body.reference]);
    if (!t || (t.user_id !== req.user.id && req.user.role !== 'admin')) throw E.forbidden();
    mock.setState(req.body.reference, req.body.outcome);
    const raw = JSON.stringify({ id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, type: `payment.${req.body.outcome}`, reference: req.body.reference });
    const result = await processWebhookEvent({ provider: 'mock', rawBody: raw, signature: mock.signature(raw) });
    ok(res, { status: result.status });
  }));
}

module.exports = router;