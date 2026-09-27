'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const env = process.env;
const isProd = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';
const root = path.join(__dirname, '..');
const abs = (p) => (path.isAbsolute(p) ? p : path.join(root, p));
const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);
const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

const config = {
  env: env.NODE_ENV || 'development',
  isProd,
  isTest,
  port: int(env.PORT, 3001),
  appUrl: (env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  corsOrigins: list(env.CORS_ORIGINS || env.APP_URL || 'http://localhost:5173'),
  trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true' ? 1 : 0,
  serveFrontend: env.SERVE_FRONTEND === '1',
  db: {
    host: env.DB_HOST || '127.0.0.1',
    port: int(env.DB_PORT, 3306),
    database: env.DB_NAME || 'tontine',
    user: env.DB_USER || '',
    password: env.DB_PASSWORD || '',
    adminUser: env.DB_ADMIN_USER || env.DB_USER || '',
    adminPassword: env.DB_ADMIN_PASSWORD ?? env.DB_PASSWORD ?? '',
  },
  session: {
    cookieName: isProd ? '__Host-sid' : 'sid',
    ttlMs: int(env.SESSION_TTL_HOURS, 12) * 3600 * 1000,
    idleMs: int(env.SESSION_IDLE_MINUTES, 60) * 60 * 1000,
    sameSite: ['lax', 'strict'].includes(env.COOKIE_SAMESITE) ? env.COOKIE_SAMESITE : 'lax',
  },
  paymentProvider: env.PAYMENT_PROVIDER || 'none',
  webhookSecret: env.WEBHOOK_SECRET || '',
  pendingPaymentMinutes: 30,
  mail: {
    host: env.SMTP_HOST || '',
    port: int(env.SMTP_PORT, 587),
    user: env.SMTP_USER || '',
    password: env.SMTP_PASSWORD || '',
    from: env.MAIL_FROM || 'Tontine <no-reply@localhost>',
  },

  // ✅ NOUVEAU : Kkiapay
  kkiapay: {
    publicKey: env.KKIAPAY_PUBLIC_KEY || '',
    privateKey: env.KKIAPAY_PRIVATE_KEY || '',
    secret: env.KKIAPAY_SECRET || '',
    sandbox: env.KKIAPAY_SANDBOX !== 'false',
  },

  // ✅ NOUVEAU : OneSignal
  onesignal: {
    appId: env.ONESIGNAL_APP_ID || '',
    restApiKey: env.ONESIGNAL_REST_API_KEY || '',
  },

  // ✅ NOUVEAU : Cron
  cron: {
    enabled: env.CRON_ENABLED === '1',
    reminderHour: int(env.CRON_REMINDER_HOUR, 8),
  },

  uploadDir: abs(env.UPLOAD_DIR || 'storage/uploads'),
  maxUploadBytes: int(env.MAX_UPLOAD_MB, 2) * 1024 * 1024,
  logDir: abs(env.LOG_DIR || 'logs'),
  backup: {
    dir: abs(env.BACKUP_DIR || 'backups'),
    key: env.BACKUP_ENCRYPTION_KEY || '',
    keep: int(env.BACKUP_KEEP, 14),
  },
  frontendDist: path.join(root, '..', 'frontend', 'dist'),
};

// Vérifications au démarrage : on refuse de démarrer avec une configuration dangereuse en production.
config.assertSafe = function assertSafe() {
  const problems = [];
  if (!config.db.user) problems.push('DB_USER manquant');
  if (isProd) {
    if (!config.db.password) problems.push('DB_PASSWORD manquant');
    if (config.db.user === 'root') problems.push("DB_USER ne doit pas être 'root'");
    if (!config.appUrl.startsWith('https://')) problems.push('APP_URL doit être en https en production');
    if (config.corsOrigins.includes('*')) problems.push("CORS_ORIGINS ne doit pas contenir '*'");
    if (config.paymentProvider === 'mock') problems.push('PAYMENT_PROVIDER=mock interdit en production');
    if (config.webhookSecret.length < 32) problems.push('WEBHOOK_SECRET trop court (>= 32 caractères)');
    if (!config.mail.host) problems.push('SMTP_HOST manquant (emails obligatoires)');
  }
  if (config.paymentProvider !== 'none' && config.webhookSecret.length < 16) problems.push('WEBHOOK_SECRET manquant');
  if (problems.length) {
    throw new Error('Configuration invalide :\n - ' + problems.join('\n - '));
  }
};

module.exports = config;