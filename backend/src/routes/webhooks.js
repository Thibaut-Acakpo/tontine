'use strict';
const express = require('express');
const { asyncHandler } = require('../utils/http');
const { processWebhookEvent } = require('../services/webhooks');

const router = express.Router();

// Corps brut (Buffer) nécessaire pour vérifier la signature HMAC. Ni cookie, ni CSRF : l'authenticité vient de la signature.
router.post('/:provider', express.raw({ type: '*/*', limit: '100kb' }), asyncHandler(async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  const r = await processWebhookEvent({ provider: String(req.params.provider).slice(0, 30), rawBody: raw, signature: req.get('x-signature'), req });
  res.status(r.httpStatus).json({ received: r.httpStatus === 200 });
}));

module.exports = router;
