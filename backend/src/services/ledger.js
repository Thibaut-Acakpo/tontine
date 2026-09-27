'use strict';
const config = require('../config');
const db = require('../db');
const { E } = require('../utils/http');
const { txnNumber } = require('../utils/crypto');

const MONEY = ['pending', 'validated'];

// Marque comme échouées les tentatives de paiement mobile restées "pending" trop longtemps.
async function expireStale(conn, contributionId) {
  await db.query(
    `UPDATE transactions SET status = 'failed'
      WHERE contribution_id = ? AND type = 'contribution' AND status = 'pending'
        AND created_at < (UTC_TIMESTAMP() - INTERVAL ? MINUTE)`,
    [contributionId, String(config.pendingPaymentMinutes)], conn,
  );
}

// Verrouille la cotisation puis valide toutes les règles métier côté serveur.
// Le montant vient TOUJOURS de la base (amount_due), jamais du client.
async function loadPayableContribution(conn, contributionId, tontineId) {
  const c = await db.one('SELECT * FROM contributions WHERE id = ? AND tontine_id = ? FOR UPDATE', [contributionId, tontineId], conn);
  if (!c) throw E.notFound();
  const round = await db.one('SELECT * FROM rounds WHERE id = ?', [c.round_id], conn);
  const tontine = await db.one('SELECT * FROM tontines WHERE id = ?', [tontineId], conn);
  if (tontine.status !== 'active') throw E.conflict('Cette tontine n\'est pas active');
  if (round.status !== 'open') throw E.conflict();
  if (c.status === 'paid') throw E.conflict('Cette cotisation est déjà réglée');
  const current = await db.one("SELECT MIN(round_number) AS n FROM rounds WHERE tontine_id = ? AND status = 'open'", [tontineId], conn);
  if (round.round_number !== current.n) throw E.conflict("Ce tour n'est pas encore ouvert aux paiements");
  await expireStale(conn, c.id);
  return { c, round, tontine };
}

async function insertTxn(conn, t) {
  const number = txnNumber();
  const res = await db.query(
    `INSERT INTO transactions (txn_number, tontine_id, round_id, member_id, contribution_id, type, amount, currency, status, method, provider, provider_ref, idempotency_key, reverses_txn_id, note, created_by, validated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [number, t.tontineId, t.roundId, t.memberId ?? null, t.contributionId ?? null, t.type, t.amount, t.currency, t.status, t.method, t.provider ?? null, t.providerRef ?? null, t.idempotencyKey ?? null, t.reversesTxnId ?? null, t.note ?? null, t.createdBy ?? null, t.status === 'validated' ? new Date() : null],
    conn,
  );
  return { id: res.insertId, txnNumber: number };
}

const markPaid = (conn, contributionId) =>
  db.query("UPDATE contributions SET status = 'paid', paid_at = UTC_TIMESTAMP() WHERE id = ?", [contributionId], conn);

// Encaissement en espèces enregistré par un trésorier/gestionnaire : validé immédiatement.
async function recordCash({ contributionId, tontineId, actorId, note, idempotencyKey }) {
  return db.tx(async (conn) => {
    const { c, round, tontine } = await loadPayableContribution(conn, contributionId, tontineId);
    const t = await insertTxn(conn, { tontineId, roundId: round.id, memberId: c.member_id, contributionId: c.id, type: 'contribution', amount: c.amount_due, currency: tontine.currency, status: 'validated', method: 'cash', note, createdBy: actorId, idempotencyKey });
    await markPaid(conn, c.id);
    return { ...t, memberId: c.member_id, amount: c.amount_due, tontineName: tontine.name, currency: tontine.currency };
  });
}

// Initie un paiement mobile : transaction "pending", validée uniquement après confirmation du fournisseur.
async function initiateProviderPayment({ contributionId, tontineId, actorId, provider, reference, idempotencyKey }) {
  return db.tx(async (conn) => {
    const { c, round, tontine } = await loadPayableContribution(conn, contributionId, tontineId);
    const t = await insertTxn(conn, { tontineId, roundId: round.id, memberId: c.member_id, contributionId: c.id, type: 'contribution', amount: c.amount_due, currency: tontine.currency, status: 'pending', method: 'mobile_money', provider, providerRef: reference, createdBy: actorId, idempotencyKey });
    return { ...t, amount: c.amount_due, currency: tontine.currency };
  });
}

// Finalise un paiement à partir de la vérification auprès du fournisseur (jamais du montant reçu du client).
async function settleProviderPayment({ reference, providerStatus, providerAmount }) {
  return db.tx(async (conn) => {
    const t = await db.one('SELECT * FROM transactions WHERE provider_ref = ? FOR UPDATE', [reference], conn);
    if (!t) return { outcome: 'unknown' };
    if (t.status !== 'pending') return { outcome: 'duplicate', txn: t };
    if (providerStatus === 'pending') return { outcome: 'still_pending', txn: t };
    if (providerStatus !== 'succeeded' || Number(providerAmount) !== Number(t.amount)) {
      await db.query("UPDATE transactions SET status = 'failed' WHERE id = ?", [t.id], conn);
      return { outcome: providerStatus === 'succeeded' ? 'amount_mismatch' : 'failed', txn: t };
    }
    await db.query("UPDATE transactions SET status = 'validated', validated_at = UTC_TIMESTAMP() WHERE id = ?", [t.id], conn);
    await db.one('SELECT id FROM contributions WHERE id = ? FOR UPDATE', [t.contribution_id], conn);
    await markPaid(conn, t.contribution_id);
    return { outcome: 'validated', txn: t };
  });
}

// Versement (retrait) au bénéficiaire, uniquement quand toutes les cotisations du tour sont validées.
async function payoutRound({ roundId, tontineId, actorId }) {
  return db.tx(async (conn) => {
    const round = await db.one('SELECT * FROM rounds WHERE id = ? AND tontine_id = ? FOR UPDATE', [roundId, tontineId], conn);
    if (!round) throw E.notFound();
    const tontine = await db.one('SELECT * FROM tontines WHERE id = ?', [tontineId], conn);
    if (tontine.status !== 'active' || round.status !== 'open') throw E.conflict();
    const earlier = await db.one("SELECT COUNT(*) AS n FROM rounds WHERE tontine_id = ? AND round_number < ? AND status = 'open'", [tontineId, round.round_number], conn);
    if (earlier.n > 0) throw E.conflict('Les tours précédents doivent être soldés en premier');
    const pend = await db.one("SELECT COUNT(*) AS n FROM contributions WHERE round_id = ? AND status = 'pending'", [roundId], conn);
    if (pend.n > 0) throw E.conflict('Toutes les cotisations du tour doivent être réglées');
    const sum = await db.one("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE round_id = ? AND type = 'contribution' AND status = 'validated'", [roundId], conn);
    if (Number(sum.total) <= 0) throw E.conflict();
    const t = await insertTxn(conn, { tontineId, roundId, memberId: round.beneficiary_member_id, type: 'payout', amount: Number(sum.total), currency: tontine.currency, status: 'validated', method: 'cash', createdBy: actorId, note: `Versement du tour ${round.round_number}` });
    await db.query("UPDATE rounds SET status = 'paid_out' WHERE id = ?", [roundId], conn);
    const left = await db.one("SELECT COUNT(*) AS n FROM rounds WHERE tontine_id = ? AND status = 'open'", [tontineId], conn);
    if (left.n === 0) await db.query("UPDATE tontines SET status = 'completed' WHERE id = ?", [tontineId], conn);
    return { ...t, amount: Number(sum.total), beneficiaryMemberId: round.beneficiary_member_id, roundNumber: round.round_number, currency: tontine.currency };
  });
}

// Correction traçable : on ne modifie jamais le montant, on ajoute une écriture de contrepartie.
async function reverseTransaction({ txnId, tontineId, actorId, reason }) {
  return db.tx(async (conn) => {
    const t = await db.one('SELECT * FROM transactions WHERE id = ? AND tontine_id = ? FOR UPDATE', [txnId, tontineId], conn);
    if (!t) throw E.notFound();
    if (t.status !== 'validated' || !['contribution', 'payout'].includes(t.type)) throw E.conflict();
    const tontine = await db.one('SELECT * FROM tontines WHERE id = ? FOR UPDATE', [tontineId], conn);
    if (tontine.status === 'archived') throw E.conflict();
    const round = await db.one('SELECT * FROM rounds WHERE id = ? FOR UPDATE', [t.round_id], conn);
    if (t.type === 'contribution' && round.status === 'paid_out') throw E.conflict('Annulez d\'abord le versement de ce tour');
    const rev = await insertTxn(conn, { tontineId, roundId: t.round_id, memberId: t.member_id, contributionId: t.contribution_id, type: 'reversal', amount: t.amount, currency: t.currency, status: 'validated', method: t.method, reversesTxnId: t.id, note: reason, createdBy: actorId });
    await db.query("UPDATE transactions SET status = 'reversed' WHERE id = ?", [t.id], conn);
    if (t.type === 'contribution') {
      await db.query("UPDATE contributions SET status = 'pending', paid_at = NULL WHERE id = ?", [t.contribution_id], conn);
    } else {
      await db.query("UPDATE rounds SET status = 'open' WHERE id = ?", [t.round_id], conn);
      if (tontine.status === 'completed') await db.query("UPDATE tontines SET status = 'active' WHERE id = ?", [tontineId], conn);
    }
    return { ...rev, original: t };
  });
}

module.exports = { recordCash, initiateProviderPayment, settleProviderPayment, payoutRound, reverseTransaction, MONEY };
