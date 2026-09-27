'use strict';
// Crée la base et les tables avec le compte ADMIN (DB_ADMIN_USER). L'API n'utilise jamais ce compte.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');

(async () => {
  const conn = await mysql.createConnection({ host: config.db.host, port: config.db.port, user: config.db.adminUser, password: config.db.adminPassword, multipleStatements: false });
  const dbName = config.db.database.replace(/[^A-Za-z0-9_]/g, '');
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${dbName}\``);
  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
  const blocks = sql.split(/^-- @@\s*$/m).map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) await conn.query(block);
  console.log(`Migration terminée : ${blocks.length} blocs exécutés sur la base "${dbName}".`);
  await conn.end();
})().catch((e) => { console.error('Migration échouée :', e.message); process.exit(1); });
