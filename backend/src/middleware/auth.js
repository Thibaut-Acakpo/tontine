'use strict';
const config = require('../config');
const db = require('../db');
const { sha256, safeEqual } = require('../utils/crypto');
const { E } = require('../utils/http');
const { audit } = require('../audit');

// Charge la session à partir du cookie HttpOnly. Le token brut n'est jamais stocké : on ne garde que son SHA-256.
async function loadSession(req, res, next) {
  try {
    const raw = req.cookies?.[config.session.cookieName];
    if (!raw || typeof raw !== 'string' || raw.length > 100) return next();
    const row = await db.one(
      `SELECT s.id AS session_id, s.csrf_token, s.last_seen_at, u.id, u.email, u.full_name, u.phone, u.role, u.email_verified_at, u.pin_hash, u.email_notifications, u.totp_enabled
        FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP()
          AND s.last_seen_at > (UTC_TIMESTAMP() - INTERVAL ? SECOND) AND u.status = 'active'`,
      [sha256(raw), String(Math.floor(config.session.idleMs / 1000))],
    );
    if (row) {
      req.session = { id: row.session_id, csrfToken: row.csrf_token };
      req.user = {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
        role: row.role,
        emailVerified: !!row.email_verified_at,
        hasPin: !!row.pin_hash,
        emailNotifications: !!row.email_notifications,
        has2FA: !!row.totp_enabled,
      };
      if (Date.now() - new Date(row.last_seen_at).getTime() > 60 * 1000) {
        await db.query('UPDATE sessions SET last_seen_at = UTC_TIMESTAMP() WHERE id = ?', [row.session_id]);
      }
    }
    next();
  } catch (err) { next(err); }
}

const requireAuth = (req, res, next) => (req.user ? next() : next(E.unauthorized()));

const requireAdmin = (req, res, next) => {
  if (!req.user) return next(E.unauthorized());
  if (req.user.role !== 'admin') {
    audit(req, { action: 'access.denied', resourceType: 'admin', result: 'denied' });
    return next(E.forbidden());
  }
  return next();
};

// Protection CSRF (cookies de session) : le jeton lié à la session doit être renvoyé dans X-CSRF-Token.
function csrfProtect(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!req.session) return next(); // pas de cookie de session => rien à protéger (requête non authentifiée)
  if (!safeEqual(req.get('x-csrf-token'), req.session.csrfToken)) return next(E.forbidden());
  return next();
}

function sessionCookieOptions() {
  return { httpOnly: true, secure: config.isProd, sameSite: config.session.sameSite, path: '/', maxAge: config.session.ttlMs };
}

module.exports = { loadSession, requireAuth, requireAdmin, csrfProtect, sessionCookieOptions };