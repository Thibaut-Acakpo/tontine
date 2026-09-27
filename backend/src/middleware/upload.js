'use strict';
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const { AppError } = require('../utils/http');
const { randomToken } = require('../utils/crypto');

const ALLOWED = {
  '.jpg': { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  '.jpeg': { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  '.png': { mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47] },
  '.pdf': { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] },
};

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1, fields: 0 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const rule = ALLOWED[ext];
    // Extension ET type MIME déclaré doivent correspondre à la liste blanche (exécutables, svg, html... refusés).
    if (!rule || rule.mime !== file.mimetype) return cb(new AppError(400, 'UPLOAD_REJECTED', 'Type de fichier non autorisé (JPG, PNG ou PDF)'));
    return cb(null, true);
  },
}).single('file');

// Contrôle du contenu réel (octets magiques), puis écriture hors du dossier public sous un nom aléatoire.
async function saveUploadedFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const rule = ALLOWED[ext];
  if (!rule.magic.every((b, i) => file.buffer[i] === b)) throw new AppError(400, 'UPLOAD_REJECTED', 'Contenu du fichier invalide');
  fs.mkdirSync(config.uploadDir, { recursive: true, mode: 0o700 });
  const storedName = randomToken(30).replace(/[^A-Za-z0-9]/g, 'x').slice(0, 40).padEnd(40, 'x');
  await fs.promises.writeFile(path.join(config.uploadDir, storedName), file.buffer, { mode: 0o600, flag: 'wx' });
  const safeOriginal = path.basename(file.originalname).replace(/[^\w.\- ]/g, '_').slice(0, 120);
  return { storedName, mime: rule.mime, size: file.size, originalName: safeOriginal };
}

module.exports = { uploader, saveUploadedFile };
