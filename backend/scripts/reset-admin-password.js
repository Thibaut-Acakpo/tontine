'use strict';

require('dotenv').config();
const argon2 = require('argon2');
const mysql = require('mysql2/promise');

const NEW_PASSWORD = 'Thibaut1904';  // ← Ton nouveau mot de passe
const EMAIL = 'acakpothibaut2@gmail.com';

(async () => {
  console.log('🔐 Hashage du mot de passe...');
  const hash = await argon2.hash(NEW_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 65536,
    parallelism: 4,
    timeCost: 3,
  });
  console.log('✅ Hash généré :', hash.slice(0, 40) + '...');

  console.log('📡 Connexion à TiDB...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false },
  });
  console.log('✅ Connecté');

  const [result] = await conn.execute(
    'UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL WHERE email = ?',
    [hash, EMAIL]
  );

  if (result.affectedRows === 0) {
    console.log(`❌ Aucun utilisateur trouvé avec l'email ${EMAIL}`);
  } else {
    console.log(`✅ Mot de passe réinitialisé avec succès !`);
    console.log(`   Email    : ${EMAIL}`);
    console.log(`   Password : ${NEW_PASSWORD}`);
  }

  await conn.end();
})().catch((err) => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});