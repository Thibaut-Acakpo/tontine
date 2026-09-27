'use strict';
// Crée le premier compte administrateur (email vérifié). Usage :
//   ADMIN_EMAIL=vous@exemple.com ADMIN_PASSWORD='MotDePasseLong123' npm run seed
// PowerShell : $env:ADMIN_EMAIL="vous@exemple.com"; $env:ADMIN_PASSWORD="MotDePasseLong123"; npm run seed
const argon2 = require('argon2');
const config = require('../src/config');
const db = require('../src/db');

function validateAdminSeed(email, password) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const normalizedPassword = password || '';
  const isValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)
    && normalizedPassword.length >= 8;

  return {
    valid: isValid,
    email: normalizedEmail,
    password: normalizedPassword,
  };
}

async function seedAdmin() {
  config.assertSafe();
  const result = validateAdminSeed(process.env.ADMIN_EMAIL || '', process.env.ADMIN_PASSWORD || '');
  if (!result.valid) {
    console.error('ADMIN_EMAIL valide et ADMIN_PASSWORD (8+ caractères) requis.');
    process.exit(1);
  }
  const hash = await argon2.hash(result.password, { type: argon2.argon2id });
  await db.query(
    "INSERT INTO users (email, password_hash, full_name, role, email_verified_at) VALUES (?,?,?,'admin', UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE role = 'admin', password_hash = VALUES(password_hash), email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP())",
    [result.email, hash, 'Administrateur'],
  );
  console.log(`Administrateur prêt : ${result.email}`);
  await db.close();
}

if (require.main === module) {
  seedAdmin().catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { validateAdminSeed, seedAdmin };
