'use strict';
const { z } = require('zod');

// Validation côté serveur : types, longueurs, formats. Les champs inattendus sont rejetés (.strict()).
function validate({ body, query, params } = {}) {
  return (req, res, next) => {
    try {
      if (body) req.body = body.parse(req.body ?? {});
      if (query) req.query = query.parse(req.query ?? {});
      if (params) req.params = params.parse(req.params ?? {});
      next();
    } catch (err) { next(err); }
  };
}

const id = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const email = z.string().trim().toLowerCase().email().max(190);
const password = z.string().min(10, '10 caractères minimum').max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Doit contenir au moins une lettre et un chiffre');
const name = z.string().trim().min(2).max(120);
const phone = z.string().trim().regex(/^\+?[0-9 ]{6,20}$/, 'Numéro invalide');
const token = z.string().min(20).max(200);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (AAAA-MM-JJ)').refine((v) => !Number.isNaN(Date.parse(v)), 'Date invalide');
const page = { page: z.coerce.number().int().min(1).max(100000).optional(), limit: z.coerce.number().int().min(1).max(100).optional() };

module.exports = { validate, z, s: { id, email, password, name, phone, token, date, page } };
