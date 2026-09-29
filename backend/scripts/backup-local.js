'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// ✅ Chemins absolus, indépendants de config.js
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const MYSQLDUMP = 'C:\\wamp64\\bin\\mysql\\mysql8.4.7\\bin\\mysqldump.exe';

// Lecture directe du .env
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USER = process.env.DB_USER || 'Thibaut';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'tontine';

// Créer le dossier backups s'il n'existe pas
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`📁 Dossier créé : ${BACKUP_DIR}`);
}

const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const filename = `tontine-${date}.sql`;
const filepath = path.join(BACKUP_DIR, filename);

// Vérifier que mysqldump existe
if (!fs.existsSync(MYSQLDUMP)) {
  console.error(`❌ mysqldump introuvable : ${MYSQLDUMP}`);
  console.error('   Modifiez le chemin MYSQLDUMP dans le script.');
  process.exit(1);
}

// Construire la commande
const passwordArg = DB_PASSWORD ? `-p"${DB_PASSWORD}"` : '';
const cmd = `"${MYSQLDUMP}" -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} ${passwordArg} --routines --triggers --events --single-transaction "${DB_NAME}" > "${filepath}"`;

console.log('🔄 Sauvegarde en cours...');
console.log(`   Base   : ${DB_NAME}`);
console.log(`   Hôte   : ${DB_HOST}:${DB_PORT}`);
console.log(`   Fichier: ${filename}`);

exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
  if (err) {
    console.error('❌ Échec de la sauvegarde :', err.message);
    if (stderr) console.error('   Détail :', stderr);
    process.exit(1);
  }

  if (!fs.existsSync(filepath)) {
    console.error('❌ Le fichier de sauvegarde n\'a pas été créé.');
    process.exit(1);
  }

  const stats = fs.statSync(filepath);
  console.log(`✅ Sauvegarde réussie : ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

  // Rotation : garder les 30 dernières sauvegardes
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('tontine-') && f.endsWith('.sql'))
    .map((f) => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  if (files.length > 30) {
    files.slice(30).forEach((f) => {
      fs.unlinkSync(path.join(BACKUP_DIR, f.name));
      console.log(`🗑️ Ancienne sauvegarde supprimée : ${f.name}`);
    });
  }
});