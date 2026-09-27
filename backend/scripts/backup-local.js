'use strict';
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const filename = `tontine-${date}.sql`;
const filepath = path.join(BACKUP_DIR, filename);

// ⚠️ Adaptez le chemin vers mysqldump.exe si votre version MySQL change
const MYSQLDUMP = 'C:\\wamp64\\bin\\mysql\\mysql8.4.7\\bin\\mysqldump.exe';

const cmd = `"${MYSQLDUMP}" -h ${config.db.host} -P ${config.db.port} -u ${config.db.user} ${config.db.password ? `-p${config.db.password}` : ''} --routines --triggers --events ${config.db.database} > "${filepath}"`;

console.log('🔄 Sauvegarde en cours...');
exec(cmd, (err) => {
  if (err) {
    console.error('❌ Échec de la sauvegarde :', err.message);
    process.exit(1);
  }
  const stats = fs.statSync(filepath);
  console.log(`✅ Sauvegarde réussie : ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

  // Nettoyer : garder les 30 dernières
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('tontine-') && f.endsWith('.sql'))
    .sort()
    .reverse();
  files.slice(30).forEach((f) => {
    fs.unlinkSync(path.join(BACKUP_DIR, f));
    console.log(`🗑️ Ancienne sauvegarde supprimée : ${f}`);
  });
});