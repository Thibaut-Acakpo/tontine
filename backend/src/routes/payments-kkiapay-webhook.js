'use strict';
const express = require('express');
const router = express.Router();

// On réexporte juste le handler du webhook depuis payments.js
router.post('/webhook', async (req, res, next) => {
  try {
    // Rediriger vers la logique du webhook dans payments.js
    const payments = require('./payments');
    // ⚠️ Ceci ne fonctionne pas directement car payments exporte un router.
    // Plus simple : dupliquer la logique ou utiliser une fonction.
    return res.status(500).json({ error: 'À configurer' });
  } catch (e) { next(e); }
});

module.exports = router;