'use strict';

class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = true;
    this.details = details;
  }
}

const E = {
  badRequest: (m = 'Requête invalide', d) => new AppError(400, 'BAD_REQUEST', m, d),
  unauthorized: (m = 'Authentification requise') => new AppError(401, 'UNAUTHORIZED', m),
  forbidden: (m = 'Accès refusé') => new AppError(403, 'FORBIDDEN', m),
  notFound: (m = 'Ressource introuvable') => new AppError(404, 'NOT_FOUND', m),
  conflict: (m = "Cette opération n'est pas autorisée") => new AppError(409, 'CONFLICT', m),
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ok = (res, data = null, meta, status = 200) => res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });

const camelKey = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
function camel(v) {
  if (Array.isArray(v)) return v.map(camel);
  if (v && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[camelKey(k)] = camel(val);
    return out;
  }
  return v;
}

// Pagination bornée (toutes les grandes listes sont paginées).
function pageParams(q) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}
const pageMeta = (p, total) => ({ page: p.page, limit: p.limit, total, pages: Math.max(1, Math.ceil(total / p.limit)) });

module.exports = { AppError, E, asyncHandler, ok, camel, pageParams, pageMeta };
