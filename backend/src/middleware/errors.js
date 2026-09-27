'use strict';
const { ZodError } = require('zod');
const multer = require('multer');
const logger = require('../logger');

function notFound(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ressource introuvable' } });
}

// Messages génériques pour l'utilisateur ; détails techniques uniquement dans les logs.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Une erreur est survenue';
  let details;

  if (err.expose && err.status) {
    ({ status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Données invalides';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.code === 'unrecognized_keys' ? 'Champ non autorisé' : i.message }));
  } else if (err instanceof multer.MulterError) {
    status = 400; code = 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux' : 'Fichier refusé';
  } else if (err.type === 'entity.too.large') {
    status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Requête trop volumineuse';
  } else if (err.type === 'entity.parse.failed') {
    status = 400; code = 'BAD_REQUEST'; message = 'Requête invalide';
  } else if (err.code === 'ER_DUP_ENTRY') {
    status = 409; code = 'CONFLICT'; message = "Cette opération n'est pas autorisée";
  }

  if (status >= 500) logger.error('Erreur serveur', { path: req.path, method: req.method, err });
  res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
}

module.exports = { notFound, errorHandler };
