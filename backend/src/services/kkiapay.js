'use strict';
const config = require('../config');

const BASE_URL = config.kkiapay?.sandbox
  ? 'https://sandbox.kkiapay.me/api/v1'
  : 'https://api.kkiapay.me/api/v1';

async function kkiapayFetch(path, method = 'GET', body) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-public-key': config.kkiapay.publicKey,
      'x-private-key': config.kkiapay.privateKey,
      'x-secret-key': config.kkiapay.secret,
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(`Kkiapay: ${res.status} ${data?.message || text}`);
    err.details = data;
    throw err;
  }
  return data;
}

// Vérifier le statut d'une transaction Kkiapay
async function verifyTransaction(transactionId) {
  return kkiapayFetch(`/transactions/${transactionId}`, 'GET');
}

// Initier un remboursement
async function refundTransaction(transactionId, amount) {
  return kkiapayFetch('/refunds', 'POST', { transactionId, amount });
}

module.exports = { verifyTransaction, refundTransaction };