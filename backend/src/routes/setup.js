'use strict';
const express = require('express');
const argon2 = require('argon2');
const db = require('../db');
const config = require('../config');
const { asyncHandler } = require('../utils/http');

const router = express.Router();

// ⚠️ Route TEMPORAIRE à supprimer après usage.
// Protégée par une clé secrète stockée dans SETUP_KEY.
router.post('/reset-admin', asyncHandler(async (req, res) => {
  const { key, email, newPassword } = req.body;

  // 1. Vérifie la clé secrète
  if (!key || key !== config.setupKey) {
    return res.status(403).json({ success: false, error: { message: 'Clé invalide' } });
  }

  // 2. Valide les entrées
  if (!email || !newPassword || newPassword.length < 10) {
    return res.status(400).json({ success: false, error: { message: 'Paramètres invalides' } });
  }

  // 3. Hash le nouveau mot de passe
  const hash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    parallelism: 4,
    timeCost: 3,
  });

  // 4. Met à jour l'utilisateur
  const result = await db.query(
    'UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL WHERE email = ?',
    [hash, email]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, error: { message: 'Utilisateur introuvable' } });
  }

  res.json({ success: true, message: `Mot de passe réinitialisé pour ${email}` });
}));

module.exports = router;