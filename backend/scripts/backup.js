'use strict';
// Sauvegarde chiffrée (AES-256-GCM) de la base : mysqldump -> gzip -> chiffrement -> fichier .sql.gz.enc
// Rotation : conserve les BACKUP_KEEP dernières versions. À planifier (cron / Planificateur de tâches Windows).
// Copiez ensuite BACKUP_DIR vers un stockage SÉPARÉ du serveur (autre machine, bucket S3, etc.).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { spawn } = require('child_process');
const config = require('../src/config');

const key = Buffer.from(config.backup.key, 'hex');
if (key.length !== 32) { console.error('BACKUP_ENCRYPTION_KEY invalide (64 caractères hexadécimaux requis).'); process.exit(1); }
fs.mkdirSync(config.backup.dir, { recursive: true, mode: 0o700 });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = path.join(config.backup.dir, `tontine-${stamp}.sql.gz.enc`);
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const file = fs.createWriteStream(out, { mode: 0o600 });
file.write(iv);

// Le mot de passe passe par l'environnement (MYSQL_PWD), jamais dans la ligne de commande.
const dump = spawn('mysqldump', ['--single-transaction', '--routines', '--triggers', '-h', config.db.host, '-P', String(config.db.port), '-u', config.db.adminUser, config.db.database],
  { env: { ...process.env, MYSQL_PWD: config.db.adminPassword }, stdio: ['ignore', 'pipe', 'inherit'] });
dump.on('error', (e) => { console.error('mysqldump introuvable ou en échec :', e.message); process.exit(1); });
dump.stdout.pipe(zlib.createGzip()).pipe(cipher).on('data', (c) => file.write(c)).on('end', () => {
  file.write(cipher.getAuthTag());
  file.end();
});
dump.on('close', (code) => {
  if (code !== 0) { fs.rmSync(out, { force: true }); console.error('Sauvegarde échouée (code ' + code + ')'); process.exit(1); }
});
file.on('finish', () => {
  const all = fs.readdirSync(config.backup.dir).filter((f) => f.endsWith('.sql.gz.enc')).sort();
  all.slice(0, Math.max(0, all.length - config.backup.keep)).forEach((f) => fs.rmSync(path.join(config.backup.dir, f)));
  console.log(`Sauvegarde créée : ${out}`);
});
