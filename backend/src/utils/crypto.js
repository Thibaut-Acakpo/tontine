'use strict';
const crypto = require('crypto');

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

function hmacHex(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Numéro de transaction unique et non devinable : TXN-20261005-9F3A1C7B2D
function txnNumber() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `TXN-${d}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

module.exports = { randomToken, sha256, safeEqual, hmacHex, txnNumber };
