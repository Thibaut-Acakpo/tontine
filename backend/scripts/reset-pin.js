import argon2 from 'argon2';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const NEW_PIN = '1234';
const EMAIL = 'acakpothibaut2@gmail.com';

const run = async () => {
  console.log('🔐 Hashage du PIN...');
  const hash = await argon2.hash(NEW_PIN, {
    type: argon2.argon2id,
    memoryCost: 65536,
    parallelism: 4,
    timeCost: 3,
  });

  console.log('📡 Connexion à la base...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [result] = await conn.execute(
    'UPDATE users SET pin_hash = ?, pin_failed_logins = 0, pin_locked_until = NULL WHERE email = ?',
    [hash, EMAIL]
  );

  if (result.affectedRows === 0) {
    console.log('❌ Aucun utilisateur trouvé avec cet email');
  } else {
    console.log(`✅ PIN réinitialisé à "${NEW_PIN}" pour ${EMAIL}`);
  }

  await conn.end();
};

run().catch((err) => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});