'use strict';
const express = require('express');
const argon2 = require('argon2');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const crypto = require('crypto');
const config = require('../config');
const db = require('../db');
const { validate, z, s } = require('../middleware/validate');
const { requireAuth, sessionCookieOptions } = require('../middleware/auth');
const { limiters } = require('../middleware/security');
const { asyncHandler, ok, E, camel, AppError, pageParams, pageMeta } = require('../utils/http');
const { randomToken, sha256 } = require('../utils/crypto');
const { audit } = require('../audit');
const { sendMail } = require('../mailer');

const router = express.Router();
const ARGON = { type: argon2.argon2id };
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const PIN_MAX_FAILS = 3;
const PIN_LOCK_MINUTES = 5;
const TOTP_MAX_FAILS = 3;
const TOTP_LOCK_MINUTES = 5;
const GENERIC = 'Si les informations sont valides, un email vous a été envoyé.';
let DUMMY_HASH;
const dummyHash = async () => (DUMMY_HASH ||= await argon2.hash('dummy-password-for-timing', ARGON));

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name ?? u.fullName,
  phone: u.phone,
  role: u.role,
  emailVerified: !!(u.email_verified_at ?? u.emailVerified),
  hasPin: !!u.pin_hash,
  emailNotifications: !!(u.email_notifications ?? u.emailNotifications),
  has2FA: !!u.totp_enabled,  // ✅ AJOUT
});

async function issueEmailToken(user, purpose, ttlMinutes) {
  const recent = await db.one(
    "SELECT COUNT(*) AS n FROM email_tokens WHERE user_id = ? AND purpose = ? AND created_at > (UTC_TIMESTAMP() - INTERVAL 1 HOUR)",
    [user.id, purpose],
  );
  if (recent.n >= 3) return null;
  const raw = randomToken(32);
  await db.query(
    'INSERT INTO email_tokens (user_id, purpose, token_hash, expires_at) VALUES (?,?,?, UTC_TIMESTAMP() + INTERVAL ? MINUTE)',
    [user.id, purpose, sha256(raw), String(ttlMinutes)],
  );
  return raw;
}

async function sendVerification(user) {
  const t = await issueEmailToken(user, 'verify_email', 60 * 24);
  if (!t) return;
  await sendMail({ to: user.email, subject: 'Confirmez votre adresse email', text: `Bonjour ${user.full_name},\n\nConfirmez votre compte (lien valable 24 h) :\n${config.appUrl}/verifier-email?token=${t}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.` });
}

async function createSession(req, res, userId) {
  const raw = randomToken(32);
  const csrf = randomToken(32);
  await db.query(
    'INSERT INTO sessions (user_id, token_hash, csrf_token, ip, user_agent, expires_at) VALUES (?,?,?,?,?, UTC_TIMESTAMP() + INTERVAL ? SECOND)',
    [userId, sha256(raw), csrf, req.ip || null, (req.get('user-agent') || '').slice(0, 255) || null, String(Math.floor(config.session.ttlMs / 1000))],
  );
  res.cookie(config.session.cookieName, raw, sessionCookieOptions());
  return csrf;
}

const revokeSessions = (userId, exceptId = 0) =>
  db.query('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL AND id <> ?', [userId, exceptId]);

// ✅ Génère 10 codes de secours (format XXXX-XXXX)
function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

// Les codes de secours sont hashés en SHA-256 avant stockage (comme les tokens email)
function hashBackupCodes(codes) {
  return codes.map((c) => sha256(c.toUpperCase()));
}

router.post('/register', limiters.register, validate({ body: z.object({ email: s.email, password: s.password, fullName: s.name, phone: s.phone.optional() }).strict() }),
  asyncHandler(async (req, res) => {
    const { email, password, fullName, phone } = req.body;
    const existing = await db.one('SELECT id, full_name, email, email_verified_at FROM users WHERE email = ?', [email]);
    if (!existing) {
      const hash = await argon2.hash(password, ARGON);
      const r = await db.query('INSERT INTO users (email, password_hash, full_name, phone) VALUES (?,?,?,?)', [email, hash, fullName, phone || null]);
      await sendVerification({ id: r.insertId, email, full_name: fullName });
      await audit(req, { action: 'auth.register', resourceType: 'user', resourceId: r.insertId, userId: r.insertId });
    } else {
      await argon2.hash(password, ARGON);
      if (!existing.email_verified_at) await sendVerification(existing);
      await audit(req, { action: 'auth.register', resourceType: 'user', result: 'failure', meta: { reason: 'exists' } });
    }
    ok(res, { message: GENERIC }, undefined, 202);
  }));

router.post('/verify-email', limiters.sensitive, validate({ body: z.object({ token: s.token }).strict() }),
  asyncHandler(async (req, res) => {
    const row = await db.one(
      "SELECT id, user_id FROM email_tokens WHERE token_hash = ? AND purpose = 'verify_email' AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()",
      [sha256(req.body.token)],
    );
    if (!row) throw E.badRequest('Lien invalide ou expiré');
    await db.tx(async (conn) => {
      await db.query('UPDATE email_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?', [row.id], conn);
      await db.query('UPDATE users SET email_verified_at = UTC_TIMESTAMP() WHERE id = ? AND email_verified_at IS NULL', [row.user_id], conn);
      const u = await db.one('SELECT email FROM users WHERE id = ?', [row.user_id], conn);
      await db.query('UPDATE tontine_members SET user_id = ?, invited_email = NULL WHERE invited_email = ? AND user_id IS NULL', [row.user_id, u.email], conn);
    });
    await audit(req, { action: 'auth.verify_email', resourceType: 'user', resourceId: row.user_id, userId: row.user_id });
    ok(res, { message: 'Adresse email confirmée' });
  }));

router.post('/resend-verification', limiters.emailSend, validate({ body: z.object({ email: s.email }).strict() }),
  asyncHandler(async (req, res) => {
    const u = await db.one("SELECT id, email, full_name FROM users WHERE email = ? AND email_verified_at IS NULL AND status = 'active'", [req.body.email]);
    if (u) await sendVerification(u);
    ok(res, { message: GENERIC });
  }));

router.post('/login', limiters.login, validate({ body: z.object({ email: s.email, password: z.string().min(1).max(128) }).strict() }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const u = await db.one('SELECT * FROM users WHERE email = ?', [email]);
    const locked = u?.locked_until && new Date(u.locked_until) > new Date();
    const valid = await argon2.verify(u ? u.password_hash : await dummyHash(), password).catch(() => false);
    const ip = req.ip || null;
    const ua = (req.get('user-agent') || '').slice(0, 255) || null;

    if (!u || u.status !== 'active' || locked || !valid) {
      if (u && !locked && u.status === 'active') {
        const fails = u.failed_logins + 1;
        if (fails >= MAX_FAILS) await db.query('UPDATE users SET failed_logins = 0, locked_until = UTC_TIMESTAMP() + INTERVAL ? MINUTE WHERE id = ?', [String(LOCK_MINUTES), u.id]);
        else await db.query('UPDATE users SET failed_logins = ? WHERE id = ?', [fails, u.id]);
      }
      if (u) {
        await db.query(
          'INSERT INTO login_history (user_id, ip, user_agent, result, reason) VALUES (?,?,?,?,?)',
          [u.id, ip, ua, 'failure', locked ? 'locked' : 'bad_password']
        );
      }
      await audit(req, { action: 'auth.login', resourceType: 'user', resourceId: u?.id, userId: u?.id ?? null, result: 'failure', meta: { locked: !!locked } });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Identifiants incorrects');
    }

    if (!u.email_verified_at) {
      await db.query(
        'INSERT INTO login_history (user_id, ip, user_agent, result, reason) VALUES (?,?,?,?,?)',
        [u.id, ip, ua, 'failure', 'email_unverified']
      );
      await audit(req, { action: 'auth.login', resourceType: 'user', resourceId: u.id, userId: u.id, result: 'failure', meta: { reason: 'unverified' } });
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Adresse email non confirmée');
    }

    await db.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?', [u.id]);

    // ✅ Vérifier si 2FA est activée
    if (u.totp_enabled) {
      // On ne crée PAS encore de session. On renvoie un "challenge" que le frontend va résoudre.
      // Pour simplifier, on crée une session "partielle" en attendant la vérification 2FA.
      // Approche : on ne crée la session qu'après validation du code TOTP.
      // On stocke temporairement le user_id dans un cookie de pré-auth signé.
      const preAuthToken = randomToken(32);
      await db.query(
        'INSERT INTO sessions (user_id, token_hash, csrf_token, ip, user_agent, expires_at) VALUES (?,?,?,?,?, UTC_TIMESTAMP() + INTERVAL 5 MINUTE)',
        [u.id, sha256(`preauth:${preAuthToken}`), 'preauth', ip, ua],
      );
      // On utilise le même cookie mais on marque la session comme "pending 2FA"
      // Le frontend redirige vers /2fa
      await audit(req, { action: 'auth.login_pending_2fa', resourceType: 'user', resourceId: u.id, userId: u.id });
      return ok(res, {
        requires2FA: true,
        preAuthToken,
        user: { id: u.id, email: u.email, fullName: u.full_name }, // minimal
      });
    }

    // ✅ Vérifier si PIN activé
    const csrfToken = await createSession(req, res, u.id);
    await db.query(
      'INSERT INTO login_history (user_id, ip, user_agent, result) VALUES (?,?,?,?)',
      [u.id, ip, ua, 'success']
    );
    await audit(req, { action: 'auth.login', resourceType: 'user', resourceId: u.id, userId: u.id });

    ok(res, {
      user: publicUser(u),
      csrfToken,
      requiresPin: !!u.pin_hash,
    });
  }));

// ✅ NOUVEAU : Vérification du code 2FA (après login)
router.post('/2fa/verify', limiters.sensitive, validate({
  body: z.object({
    preAuthToken: z.string().min(10).max(100),
    code: z.string().min(6).max(10),
  }).strict()
}), asyncHandler(async (req, res) => {
  const { preAuthToken, code } = req.body;

  // Retrouver la session de pré-auth
  const preSession = await db.one(
    `SELECT s.id AS session_id, s.user_id, u.email, u.totp_secret, u.totp_backup_codes, u.totp_failed_logins, u.totp_locked_until
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP()
        AND u.status = 'active' AND u.totp_enabled = 1`,
    [sha256(`preauth:${preAuthToken}`)]
  );
  if (!preSession) throw E.badRequest('Session expirée. Reconnectez-vous.');

  // Verrouillage
  const locked = preSession.totp_locked_until && new Date(preSession.totp_locked_until) > new Date();
  if (locked) {
    const remainingMs = new Date(preSession.totp_locked_until) - Date.now();
    const min = Math.ceil(remainingMs / 60000);
    throw new AppError(423, 'TOTP_LOCKED', `2FA verrouillée. Réessayez dans ${min} minute${min > 1 ? 's' : ''}.`);
  }

  // Vérifier le code TOTP
  const cleanCode = code.replace(/\s|-/g, '').toUpperCase();
  let isValid = false;
  let usedBackupCode = false;

  // 1. Essayer TOTP (6 chiffres)
  if (/^\d{6}$/.test(cleanCode)) {
    isValid = authenticator.verify({ token: cleanCode, secret: preSession.totp_secret });
  }

  // 2. Sinon essayer code de secours (format XXXX-XXXX)
  if (!isValid && preSession.totp_backup_codes) {
    const hashedCodes = JSON.parse(preSession.totp_backup_codes);
    const codeHash = sha256(cleanCode);
    const idx = hashedCodes.indexOf(codeHash);
    if (idx !== -1) {
      isValid = true;
      usedBackupCode = true;
      // Retirer le code utilisé
      const remaining = hashedCodes.filter((_, i) => i !== idx);
      await db.query('UPDATE users SET totp_backup_codes = ? WHERE id = ?', [JSON.stringify(remaining), preSession.user_id]);
    }
  }

  if (!isValid) {
    const fails = preSession.totp_failed_logins + 1;
    const remaining = TOTP_MAX_FAILS - fails;
    if (fails >= TOTP_MAX_FAILS) {
      await db.query('UPDATE users SET totp_failed_logins = 0, totp_locked_until = UTC_TIMESTAMP() + INTERVAL ? MINUTE WHERE id = ?', [String(TOTP_LOCK_MINUTES), preSession.user_id]);
      await audit(req, { action: 'auth.2fa_verify', resourceType: 'user', resourceId: preSession.user_id, result: 'failure', meta: { reason: 'max_attempts' } });
      throw new AppError(423, 'TOTP_LOCKED', `Trop de tentatives. 2FA verrouillée pendant ${TOTP_LOCK_MINUTES} minutes.`);
    }
    await db.query('UPDATE users SET totp_failed_logins = ? WHERE id = ?', [fails, preSession.user_id]);
    await audit(req, { action: 'auth.2fa_verify', resourceType: 'user', resourceId: preSession.user_id, result: 'failure', meta: { remaining } });
    throw new AppError(401, 'INVALID_2FA', `Code invalide. Il vous reste ${remaining} tentative${remaining > 1 ? 's' : ''}.`);
  }

  // Code valide : on supprime la session de pré-auth et on en crée une vraie
  await db.query('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE id = ?', [preSession.session_id]);
  await db.query('UPDATE users SET totp_failed_logins = 0, totp_locked_until = NULL WHERE id = ?', [preSession.user_id]);

  const u = await db.one('SELECT * FROM users WHERE id = ?', [preSession.user_id]);
  const csrfToken = await createSession(req, res, u.id);

  const ip = req.ip || null;
  const ua = (req.get('user-agent') || '').slice(0, 255) || null;
  await db.query(
    'INSERT INTO login_history (user_id, ip, user_agent, result, reason) VALUES (?,?,?,?,?)',
    [u.id, ip, ua, 'success', usedBackupCode ? 'backup_code' : 'totp']
  );
  await audit(req, { action: 'auth.2fa_verify', resourceType: 'user', resourceId: u.id, meta: { usedBackupCode } });

  ok(res, {
    user: publicUser(u),
    csrfToken,
    requiresPin: !!u.pin_hash,
    usedBackupCode,
  });
}));

// ✅ NOUVEAU : Démarrer la configuration 2FA (génère le secret + QR code)
router.post('/2fa/setup', requireAuth, asyncHandler(async (req, res) => {
  const u = await db.one('SELECT id, email, totp_enabled FROM users WHERE id = ?', [req.user.id]);
  if (u.totp_enabled) throw E.conflict('La 2FA est déjà activée');

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(u.email, 'Tontine', secret);
  const qrCode = await QRCode.toDataURL(otpauth, { width: 240, margin: 1 });

  // On stocke temporairement le secret (pas encore activé)
  await db.query('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, u.id]);
  await audit(req, { action: 'auth.2fa_setup_start', resourceType: 'user', resourceId: u.id });

  ok(res, { secret, qrCode, otpauth });
}));

// ✅ NOUVEAU : Confirmer l'activation 2FA avec un premier code
router.post('/2fa/enable', requireAuth, limiters.sensitive, validate({
  body: z.object({ code: z.string().regex(/^\d{6}$/, 'Code à 6 chiffres requis') }).strict()
}), asyncHandler(async (req, res) => {
  const u = await db.one('SELECT id, totp_secret, totp_enabled FROM users WHERE id = ?', [req.user.id]);
  if (!u.totp_secret) throw E.badRequest('Aucune configuration en cours. Recommencez.');
  if (u.totp_enabled) throw E.conflict('La 2FA est déjà activée');

  const valid = authenticator.verify({ token: req.body.code, secret: u.totp_secret });
  if (!valid) {
    await audit(req, { action: 'auth.2fa_enable', resourceType: 'user', resourceId: u.id, result: 'failure' });
    throw E.badRequest('Code invalide. Vérifiez que l\'heure de votre téléphone est correcte.');
  }

  // Générer les codes de secours
  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = hashBackupCodes(backupCodes);

  await db.query(
    'UPDATE users SET totp_enabled = 1, totp_backup_codes = ? WHERE id = ?',
    [JSON.stringify(hashedBackupCodes), u.id]
  );
  await audit(req, { action: 'auth.2fa_enable', resourceType: 'user', resourceId: u.id });

  ok(res, { backupCodes, message: '2FA activée avec succès.' });
}));

// ✅ NOUVEAU : Désactiver la 2FA
router.post('/2fa/disable', requireAuth, limiters.sensitive, validate({
  body: z.object({ password: z.string().min(1).max(128) }).strict()
}), asyncHandler(async (req, res) => {
  const u = await db.one('SELECT password_hash, totp_enabled FROM users WHERE id = ?', [req.user.id]);
  if (!u.totp_enabled) throw E.badRequest('La 2FA n\'est pas activée');
  const valid = await argon2.verify(u.password_hash, req.body.password).catch(() => false);
  if (!valid) {
    await audit(req, { action: 'auth.2fa_disable', resourceType: 'user', resourceId: req.user.id, result: 'failure' });
    throw E.badRequest('Mot de passe incorrect');
  }
  await db.query('UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_backup_codes = NULL, totp_failed_logins = 0, totp_locked_until = NULL WHERE id = ?', [req.user.id]);
  await audit(req, { action: 'auth.2fa_disable', resourceType: 'user', resourceId: req.user.id });
  ok(res, { message: '2FA désactivée' });
}));

// ✅ NOUVEAU : Régénérer les codes de secours
router.post('/2fa/regenerate-backup-codes', requireAuth, limiters.sensitive, validate({
  body: z.object({ password: z.string().min(1).max(128), code: z.string().regex(/^\d{6}$/) }).strict()
}), asyncHandler(async (req, res) => {
  const u = await db.one('SELECT password_hash, totp_secret, totp_enabled FROM users WHERE id = ?', [req.user.id]);
  if (!u.totp_enabled) throw E.badRequest('2FA non activée');
  const validPw = await argon2.verify(u.password_hash, req.body.password).catch(() => false);
  if (!validPw) throw E.badRequest('Mot de passe incorrect');
  const validCode = authenticator.verify({ token: req.body.code, secret: u.totp_secret });
  if (!validCode) throw E.badRequest('Code 2FA invalide');

  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = hashBackupCodes(backupCodes);
  await db.query('UPDATE users SET totp_backup_codes = ? WHERE id = ?', [JSON.stringify(hashedBackupCodes), req.user.id]);
  await audit(req, { action: 'auth.2fa_regenerate_codes', resourceType: 'user', resourceId: req.user.id });
  ok(res, { backupCodes });
}));

// ✅ NOUVEAU : Statut 2FA
router.get('/2fa/status', requireAuth, asyncHandler(async (req, res) => {
  const u = await db.one('SELECT totp_enabled, totp_backup_codes FROM users WHERE id = ?', [req.user.id]);
  let backupCodesRemaining = 0;
  if (u.totp_backup_codes) {
    try { backupCodesRemaining = JSON.parse(u.totp_backup_codes).length; } catch { /* ignore */ }
  }
  ok(res, {
    enabled: !!u.totp_enabled,
    backupCodesRemaining,
  });
}));

// Vérifier le PIN
router.post('/pin/verify', requireAuth, limiters.sensitive, validate({
  body: z.object({ pin: z.string().regex(/^\d{4}$/, 'Le PIN doit comporter 4 chiffres') }).strict()
}), asyncHandler(async (req, res) => {
  const u = await db.one('SELECT id, pin_hash, pin_failed_logins, pin_locked_until FROM users WHERE id = ?', [req.user.id]);
  if (!u.pin_hash) throw E.badRequest('Aucun PIN configuré');

  const pinLocked = u.pin_locked_until && new Date(u.pin_locked_until) > new Date();
  if (pinLocked) {
    const remainingMs = new Date(u.pin_locked_until) - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    await audit(req, { action: 'auth.pin_verify', resourceType: 'user', resourceId: u.id, result: 'failure', meta: { reason: 'locked' } });
    throw new AppError(423, 'PIN_LOCKED', `PIN verrouillé. Réessayez dans ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.`);
  }

  const okPin = await argon2.verify(u.pin_hash, req.body.pin).catch(() => false);

  if (!okPin) {
    const fails = u.pin_failed_logins + 1;
    const remaining = PIN_MAX_FAILS - fails;
    if (fails >= PIN_MAX_FAILS) {
      await db.query('UPDATE users SET pin_failed_logins = 0, pin_locked_until = UTC_TIMESTAMP() + INTERVAL ? MINUTE WHERE id = ?', [String(PIN_LOCK_MINUTES), u.id]);
      await audit(req, { action: 'auth.pin_verify', resourceType: 'user', resourceId: u.id, result: 'failure', meta: { reason: 'max_attempts' } });
      throw new AppError(423, 'PIN_LOCKED', `Trop de tentatives. PIN verrouillé pendant ${PIN_LOCK_MINUTES} minutes.`);
    }
    await db.query('UPDATE users SET pin_failed_logins = ? WHERE id = ?', [fails, u.id]);
    await audit(req, { action: 'auth.pin_verify', resourceType: 'user', resourceId: u.id, result: 'failure', meta: { remaining } });
    throw new AppError(401, 'INVALID_PIN', `PIN incorrect. Il vous reste ${remaining} tentative${remaining > 1 ? 's' : ''}.`);
  }

  await db.query('UPDATE users SET pin_failed_logins = 0, pin_locked_until = NULL WHERE id = ?', [u.id]);
  await audit(req, { action: 'auth.pin_verify', resourceType: 'user', resourceId: u.id });
  ok(res, { message: 'PIN validé' });
}));

// Définir le PIN
router.post('/pin/set', requireAuth, limiters.sensitive, validate({
  body: z.object({
    pin: z.string().regex(/^\d{4}$/, 'Le PIN doit comporter 4 chiffres'),
    password: z.string().min(1).max(128),
  }).strict()
}), asyncHandler(async (req, res) => {
  const u = await db.one('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  const valid = await argon2.verify(u.password_hash, req.body.password).catch(() => false);
  if (!valid) {
    await audit(req, { action: 'auth.pin_set', resourceType: 'user', resourceId: req.user.id, result: 'failure', meta: { reason: 'bad_password' } });
    throw E.badRequest('Mot de passe incorrect');
  }
  const pin = req.body.pin;
  if (/^(\d)\1{3}$/.test(pin)) throw E.badRequest('PIN trop simple : évitez les chiffres identiques');
  if (['1234', '4321', '0123', '0000', '1111'].includes(pin)) throw E.badRequest('PIN trop simple : évitez les suites logiques');

  const hash = await argon2.hash(pin, ARGON);
  await db.query('UPDATE users SET pin_hash = ?, pin_failed_logins = 0, pin_locked_until = NULL WHERE id = ?', [hash, req.user.id]);
  await audit(req, { action: 'auth.pin_set', resourceType: 'user', resourceId: req.user.id });
  ok(res, { message: 'Code PIN enregistré' });
}));

// Désactiver le PIN
router.post('/pin/remove', requireAuth, limiters.sensitive, validate({
  body: z.object({ password: z.string().min(1).max(128) }).strict()
}), asyncHandler(async (req, res) => {
  const u = await db.one('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  const valid = await argon2.verify(u.password_hash, req.body.password).catch(() => false);
  if (!valid) {
    await audit(req, { action: 'auth.pin_remove', resourceType: 'user', resourceId: req.user.id, result: 'failure', meta: { reason: 'bad_password' } });
    throw E.badRequest('Mot de passe incorrect');
  }
  await db.query('UPDATE users SET pin_hash = NULL, pin_failed_logins = 0, pin_locked_until = NULL WHERE id = ?', [req.user.id]);
  await audit(req, { action: 'auth.pin_remove', resourceType: 'user', resourceId: req.user.id });
  ok(res, { message: 'Code PIN désactivé' });
}));

// Statut du PIN
router.get('/pin/status', requireAuth, asyncHandler(async (req, res) => {
  const u = await db.one('SELECT pin_hash IS NOT NULL AS has_pin, pin_locked_until FROM users WHERE id = ?', [req.user.id]);
  ok(res, {
    hasPin: !!u.has_pin,
    locked: u.pin_locked_until && new Date(u.pin_locked_until) > new Date(),
    lockedUntil: u.pin_locked_until || null,
  });
}));

// Historique des connexions
router.get('/login-history', requireAuth, validate({ query: z.object({ ...s.page }).strict() }), asyncHandler(async (req, res) => {
  const p = pageParams(req.query);
  const total = await db.one('SELECT COUNT(*) AS n FROM login_history WHERE user_id = ?', [req.user.id]);
  const rows = await db.query(
    'SELECT id, ip, user_agent, result, reason, created_at FROM login_history WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
    [req.user.id, String(p.limit), String(p.offset)]
  );
  ok(res, camel(rows), pageMeta(p, total.n));
}));

router.post('/logout', asyncHandler(async (req, res) => {
  if (req.session) {
    await db.query('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE id = ?', [req.session.id]);
    await audit(req, { action: 'auth.logout', resourceType: 'user', resourceId: req.user.id });
  }
  res.clearCookie(config.session.cookieName, { ...sessionCookieOptions(), maxAge: undefined });
  ok(res, { message: 'Déconnecté' });
}));

router.get('/me', requireAuth, (req, res) => ok(res, { user: req.user, csrfToken: req.session.csrfToken }));

router.post('/forgot-password', limiters.emailSend, validate({ body: z.object({ email: s.email }).strict() }),
  asyncHandler(async (req, res) => {
    const u = await db.one("SELECT id, email, full_name FROM users WHERE email = ? AND status = 'active'", [req.body.email]);
    if (u) {
      const t = await issueEmailToken(u, 'reset_password', 30);
      if (t) await sendMail({ to: u.email, subject: 'Réinitialisation du mot de passe', text: `Bonjour ${u.full_name},\n\nPour choisir un nouveau mot de passe (lien valable 30 min) :\n${config.appUrl}/reinitialiser-mot-de-passe?token=${t}\n\nSi vous n'avez rien demandé, ignorez ce message.` });
      await audit(req, { action: 'auth.forgot_password', resourceType: 'user', resourceId: u.id, userId: u.id });
    }
    ok(res, { message: GENERIC });
  }));

router.post('/reset-password', limiters.sensitive, validate({ body: z.object({ token: s.token, password: s.password }).strict() }),
  asyncHandler(async (req, res) => {
    const row = await db.one(
      "SELECT id, user_id FROM email_tokens WHERE token_hash = ? AND purpose = 'reset_password' AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()",
      [sha256(req.body.token)],
    );
    if (!row) throw E.badRequest('Lien invalide ou expiré');
    const hash = await argon2.hash(req.body.password, ARGON);
    await db.tx(async (conn) => {
      await db.query('UPDATE email_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?', [row.id], conn);
      await db.query('UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL WHERE id = ?', [hash, row.user_id], conn);
      await db.query('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL', [row.user_id], conn);
    });
    await audit(req, { action: 'auth.reset_password', resourceType: 'user', resourceId: row.user_id, userId: row.user_id });
    ok(res, { message: 'Mot de passe modifié. Vous pouvez vous connecter.' });
  }));

router.post('/change-password', requireAuth, limiters.sensitive, validate({ body: z.object({ currentPassword: z.string().min(1).max(128), newPassword: s.password }).strict() }),
  asyncHandler(async (req, res) => {
    const u = await db.one('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!(await argon2.verify(u.password_hash, req.body.currentPassword).catch(() => false))) {
      await audit(req, { action: 'auth.change_password', resourceType: 'user', resourceId: req.user.id, result: 'failure' });
      throw E.badRequest('Mot de passe actuel incorrect');
    }
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [await argon2.hash(req.body.newPassword, ARGON), req.user.id]);
    await revokeSessions(req.user.id, req.session.id);
    await audit(req, { action: 'auth.change_password', resourceType: 'user', resourceId: req.user.id });
    ok(res, { message: 'Mot de passe modifié' });
  }));

router.get('/sessions', requireAuth, asyncHandler(async (req, res) => {
  const rows = await db.query(
    'SELECT id, ip, user_agent, created_at, last_seen_at, expires_at FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP() ORDER BY last_seen_at DESC LIMIT 20',
    [req.user.id],
  );
  ok(res, camel(rows).map((r) => ({ ...r, current: r.id === req.session.id })));
}));

router.delete('/sessions/:id', requireAuth, validate({ params: z.object({ id: s.id }) }), asyncHandler(async (req, res) => {
  const r = await db.query('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ? AND revoked_at IS NULL', [req.params.id, req.user.id]);
  if (!r.affectedRows) throw E.notFound();
  await audit(req, { action: 'auth.session_revoked', resourceType: 'session', resourceId: req.params.id });
  ok(res, { message: 'Session révoquée' });
}));

module.exports = router;