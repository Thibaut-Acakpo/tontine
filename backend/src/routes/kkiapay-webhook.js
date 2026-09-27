'use strict';
const express = require('express');
const config = require('../config');
const db = require('../db');
const { asyncHandler, E } = require('../utils/http');
const { notifyMember } = require('../notify');
const { sendPushToUser } = require('../services/onesignal');

const router = express.Router();

const money = (n, cur) => `${Number(n).toLocaleString('fr-FR')} ${cur}`;

// ✅ Webhook public appelé par Kkiapay (pas d'auth, pas de CSRF)
router.post('/', asyncHandler(async (req, res) => {
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
    // En cas d'échec, on utilise le statut reçu
  }

  const isSuccess = String(verifiedStatus).toUpperCase().includes('SUCCESS');
  if (!isSuccess) {
    return res.json({ ok: true, message: 'Paiement non réussi, ignoré' });
  }

  // Mettre à jour la contribution
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
    // Peut arriver si la transaction existe déjà
  }

  // Notifications
  const c = await db.one(
    `SELECT c.*, t.name AS tontine_name, m.user_id AS member_user_id
       FROM contributions c
       JOIN tontines t ON t.id = c.tontine_id
       JOIN tontine_members m ON m.id = c.member_id
      WHERE c.id = ?`, [contributionId]);

  if (c) {
    const amount = money(c.amount_due, 'XOF');

    if (c.member_user_id) {
      await notifyMember(c.member_id, {
        type: 'payment.validated',
        title: 'Paiement confirmé',
        body: `Votre cotisation de ${amount} pour « ${c.tontine_name} » a été confirmée.`,
      }, { email: true });
      await sendPushToUser(c.member_user_id, 'Paiement confirmé', `${amount} payés pour ${c.tontine_name}`);
    }

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

module.exports = router;