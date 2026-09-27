'use strict';
const db = require('../db');
const config = require('../config');
const logger = require('../logger');
const { getProvider } = require('./providers');
const { settleProviderPayment } = require('./ledger');
const { notifyMember } = require('../notify');
const { audit } = require('../audit');

// Traitement d'un webhook : signature -> anti-doublon -> vérification auprès du fournisseur -> écriture au grand livre.
async function processWebhookEvent({ provider: name, rawBody, signature, req = null }) {
  const provider = getProvider(name);
  if (!provider || name !== config.paymentProvider) return { httpStatus: 404, status: 'rejected' };
  const signatureValid = provider.verifySignature(rawBody, signature);
  let event = null;
  try { event = JSON.parse(rawBody); } catch (_) { /* rejeté ci-dessous */ }
  if (!signatureValid || !event || typeof event.id !== 'string' || typeof event.reference !== 'string' || event.id.length > 100) {
    await audit(req, { action: 'webhook.received', resourceType: 'webhook', result: 'denied', meta: { provider: name, signatureValid } });
    return { httpStatus: signatureValid ? 400 : 401, status: 'rejected' };
  }
  // Enregistre l'événement ; la contrainte UNIQUE (provider, event_id) bloque le rejeu.
  try {
    await db.query('INSERT INTO webhook_events (provider, event_id, signature_valid, payload) VALUES (?,?,1,?)', [name, event.id, rawBody.slice(0, 5000)]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return { httpStatus: 200, status: 'duplicate' };
    throw err;
  }
  // On ne se fie pas au contenu du webhook : on interroge le fournisseur pour statut et montant réels.
  const verified = await provider.verify(event.reference);
  const r = await settleProviderPayment({ reference: event.reference, providerStatus: verified.status, providerAmount: verified.amount });
  await db.query('UPDATE webhook_events SET status = ? WHERE provider = ? AND event_id = ?', [r.outcome === 'unknown' ? 'ignored' : 'processed', name, event.id]);
  await audit(req, { action: 'webhook.processed', resourceType: 'transaction', resourceId: r.txn?.id, userId: null, result: ['validated', 'failed', 'still_pending', 'duplicate'].includes(r.outcome) ? 'success' : 'failure', meta: { provider: name, outcome: r.outcome } });
  if (r.outcome === 'validated') {
    await notifyMember(r.txn.member_id, { type: 'payment.validated', title: 'Paiement confirmé', body: `Votre paiement (${r.txn.txn_number}) a bien été reçu.` }, { email: true });
  } else if (r.outcome === 'amount_mismatch') {
    logger.warn('Webhook : montant différent du montant attendu', { txn: r.txn.txn_number });
  }
  return { httpStatus: 200, status: r.outcome };
}

module.exports = { processWebhookEvent };
