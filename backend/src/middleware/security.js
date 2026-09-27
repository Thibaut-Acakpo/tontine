'use strict';
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { E } = require('../utils/http');

const allowedOrigins = new Set([...config.corsOrigins, new URL(config.appUrl).origin]);

// En-têtes de sécurité : CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS (prod).
const securityHeaders = [
  helmet({
    contentSecurityPolicy: config.serveFrontend
      ? { directives: { upgradeInsecureRequests: config.isProd ? [] : null, defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"] } }
      : { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: config.isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  }),
  (req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
    next();
  },
];

// CORS : liste blanche précise, méthodes et en-têtes limités, credentials activés.
const corsMiddleware = cors({
  origin(origin, cb) { cb(null, !origin || allowedOrigins.has(origin)); },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Idempotency-Key'],
  maxAge: 600,
});

// HTTPS obligatoire en production.
function enforceHttps(req, res, next) {
  if (!config.isProd || req.secure) return next();
  if (req.method === 'GET' || req.method === 'HEAD') return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  return next(E.forbidden('HTTPS requis'));
}

// Vérification de l'origine sur toute requête modifiante (défense CSRF complémentaire).
function checkOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path.startsWith('/webhooks/')) return next();
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin)) return next(E.forbidden());
  return next();
}

const limiterOpts = (windowMs, max, message) => ({
  windowMs, max, standardHeaders: true, legacyHeaders: false,
  skip: () => config.isTest && !process.env.TEST_RATE_LIMIT,
  handler: (req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message } }),
});
const tooMany = 'Trop de requêtes, réessayez plus tard';
const limiters = {
  global: rateLimit(limiterOpts(15 * 60 * 1000, 600, tooMany)),
  login: rateLimit(limiterOpts(15 * 60 * 1000, 10, 'Trop de tentatives, réessayez plus tard')),
  register: rateLimit(limiterOpts(60 * 60 * 1000, 10, tooMany)),
  emailSend: rateLimit(limiterOpts(60 * 60 * 1000, 5, tooMany)),
  sensitive: rateLimit(limiterOpts(15 * 60 * 1000, 60, tooMany)),
  webhook: rateLimit(limiterOpts(60 * 1000, 120, tooMany)),
};

module.exports = { securityHeaders, corsMiddleware, enforceHttps, checkOrigin, limiters, allowedOrigins };
