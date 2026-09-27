'use strict';
// Déchiffre une sauvegarde vers un fichier .sql. Test de restauration recommandé sur une base VIDE :
//   node scripts/restore.js backups/tontine-XXXX.sql.gz.enc restore-test.sql
//   mysql -u root -p tontine_restore_test < restore-test.sql
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
const config = require('../src/config');

const [src, dest] = process.argv.slice(2);
const key = Buffer.from(config.backup.key, 'hex');
if (!src || !dest || key.length !== 32) { console.error('Usage : node scripts/restore.js <sauvegarde.enc> <sortie.sql> (BACKUP_ENCRYPTION_KEY requis)'); process.exit(1); }
const buf = fs.readFileSync(src);
const decipher = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
decipher.setAuthTag(buf.subarray(buf.length - 16));
try {
  const plain = zlib.gunzipSync(Buffer.concat([decipher.update(buf.subarray(12, buf.length - 16)), decipher.final()]));
  fs.writeFileSync(dest, plain, { mode: 0o600 });
  console.log(`Sauvegarde déchiffrée : ${dest} (${plain.length} octets). Intégrité vérifiée.`);
} catch (e) { console.error('Déchiffrement impossible : clé incorrecte ou fichier corrompu.'); process.exit(1); }
