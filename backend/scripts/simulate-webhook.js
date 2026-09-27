'use strict';
// Envoie un webhook signé à l'API locale (test). Usage : node scripts/simulate-webhook.js <reference> [succeeded|failed]
// Note : avec le fournisseur "mock", le statut réel est piloté par la route de simulation ; préférez le bouton "Simuler" du frontend.
const crypto = require('crypto');
const config = require('../src/config');
const [reference, outcome = 'succeeded'] = process.argv.slice(2);
if (!reference) { console.error('Usage : node scripts/simulate-webhook.js <reference> [succeeded|failed]'); process.exit(1); }
const body = JSON.stringify({ id: `evt_${Date.now()}`, type: `payment.${outcome}`, reference });
const sig = crypto.createHmac('sha256', config.webhookSecret).update(body).digest('hex');
fetch(`http://localhost:${config.port}/api/webhooks/${config.paymentProvider}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': sig }, body })
  .then(async (r) => console.log(r.status, await r.text()));
