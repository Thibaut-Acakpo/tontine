'use strict';
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Aucun mot de passe, token, secret ou en-tête d'authentification ne doit atteindre les logs.
const SENSITIVE = /pass|token|secret|authorization|cookie|signature|hash|csrf|otp/i;

function redact(value, depth = 0) {
  if (value == null || depth > 4) return value;
  if (value instanceof Error) return { name: value.name, message: value.message, code: value.code, stack: config.isProd ? undefined : value.stack };
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE.test(k) ? '[REDACTED]' : redact(v, depth + 1);
    return out;
  }
  return value;
}

let stream = null;
function getStream() {
  if (stream || config.isTest) return stream;
  fs.mkdirSync(config.logDir, { recursive: true });
  stream = fs.createWriteStream(path.join(config.logDir, 'app.log'), { flags: 'a', mode: 0o600 });
  return stream;
}

function write(level, msg, meta) {
  if (config.isTest) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...(meta ? { meta: redact(meta) } : {}) });
  getStream().write(line + '\n');
  if (level === 'error' || !config.isProd) process[level === 'error' ? 'stderr' : 'stdout'].write(line + '\n');
}

module.exports = {
  redact,
  info: (m, meta) => write('info', m, meta),
  warn: (m, meta) => write('warn', m, meta),
  error: (m, meta) => write('error', m, meta),
};
