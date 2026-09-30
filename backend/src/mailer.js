'use strict';
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

// Clients initialisés à la première utilisation
let resendClient = null;
let smtpTransport = null;

// Buffer utilisé uniquement par les tests
const sent = [];

// ✅ Résolution unifiée des variables Gmail/SMTP
// Accepte GMAIL_USER/GMAIL_APP_PASSWORD OU SMTP_USER/SMTP_PASSWORD
const getGmailUser = () => process.env.GMAIL_USER || process.env.SMTP_USER;
const getGmailPass = () => process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD;

/**
 * Récupère (ou initialise) le client Resend.
 */
function getResendClient() {
  if (!resendClient) {
    const { Resend } = require('resend');
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Récupère (ou initialise) le transport SMTP (Gmail, SMTP générique, etc.).
 */
function getSmtpTransport() {
  if (!smtpTransport) {
    const nodemailer = require('nodemailer');

    // ✅ Gmail spécifique (accepte GMAIL_* ou SMTP_*)
    const gmailUser = getGmailUser();
    const gmailPass = getGmailPass();
    if (gmailUser && gmailPass) {
      smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });
      return smtpTransport;
    }

    // SMTP générique (fallback si config.mail.host est défini)
    if (config.mail?.host) {
      smtpTransport = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.port === 465,
        auth: config.mail.user
          ? { user: config.mail.user, pass: config.mail.password }
          : undefined,
      });
      return smtpTransport;
    }

    return null;
  }
  return smtpTransport;
}

/**
 * Envoie un email via le premier canal disponible :
 *
 *   1. Gmail SMTP         (GMAIL_* ou SMTP_*)
 *   2. Resend             (RESEND_API_KEY)
 *   3. EmailJS            (si configuré)
 *   4. Fichier local      (dev sans config)
 *
 * @param {Object} options
 * @param {string} options.to          Destinataire
 * @param {string} options.subject     Sujet de l'email
 * @param {string} options.text        Contenu texte
 * @param {string} [options.html]      Contenu HTML (optionnel)
 * @param {string} [options.toName]    Nom du destinataire (optionnel)
 * @param {string} [options.fromName]  Nom de l'expéditeur (optionnel)
 */
async function sendMail({ to, subject, text, html, toName, fromName }) {
  // Mode test : on stocke en mémoire
  if (config.isTest) {
    sent.push({ to, subject, text });
    return;
  }

  // Nom par défaut de l'expéditeur
  const senderName = fromName || process.env.APP_NAME || 'Tontine';
  // Nom par défaut du destinataire (dérivé de l'email)
  const recipientName = toName || to.split('@')[0];

  const gmailUser = getGmailUser();
  const gmailPass = getGmailPass();

  // ============================================================
  // 1. GMAIL SMTP (prioritaire si configuré)
  // ============================================================
  if (gmailUser && gmailPass) {
    try {
      const transport = getSmtpTransport();
      await transport.sendMail({
        from: `"${senderName}" <${gmailUser}>`,
        to,
        subject,
        text,
        html,
      });
      logger.info('Email envoyé via Gmail SMTP', { to });
      return { provider: 'gmail-smtp' };
    } catch (err) {
      logger.error('Gmail SMTP a échoué, fallback vers Resend/EmailJS/fichier', {
        to,
        error: err.message,
      });
      // On continue vers le fallback
    }
  }

  // ============================================================
  // 2. SMTP GÉNÉRIQUE (si config.mail.host est défini)
  // ============================================================
  if (config.mail?.host && !gmailUser) {
    // Note : si Gmail est configuré, on saute cette étape (déjà tentée en 1)
    try {
      const transport = getSmtpTransport();
      await transport.sendMail({
        from: config.mail.from || `"${senderName}" <no-reply@localhost>`,
        to,
        subject,
        text,
        html,
      });
      logger.info('Email envoyé via SMTP générique', { to });
      return { provider: 'smtp' };
    } catch (err) {
      logger.error('SMTP générique a échoué, fallback vers Resend/EmailJS/fichier', {
        to,
        error: err.message,
      });
    }
  }

  // ============================================================
  // 3. RESEND
  // ============================================================
  if (process.env.RESEND_API_KEY) {
    try {
      const from = process.env.RESEND_FROM || `${senderName} <onboarding@resend.dev>`;
      const payload = {
        from,
        to,
        subject,
        text,
      };
      if (html) payload.html = html;

      const { data, error } = await getResendClient().emails.send(payload);

      if (error) {
        throw new Error(`Resend: ${error.message} (${error.name || 'unknown'})`);
      }

      logger.info('Email envoyé via Resend', { to, id: data?.id });
      return { provider: 'resend', id: data?.id };
    } catch (err) {
      logger.error('Resend a échoué, fallback vers EmailJS/fichier', { to, error: err.message });
    }
  }

  // ============================================================
  // 4. EMAILJS
  // ============================================================
  if (
    process.env.EMAILJS_SERVICE_ID &&
    process.env.EMAILJS_TEMPLATE_ID &&
    process.env.EMAILJS_PUBLIC_KEY
  ) {
    try {
      const emailjs = require('@emailjs/nodejs');
      await emailjs.send(
        process.env.EMAILJS_SERVICE_ID,
        process.env.EMAILJS_TEMPLATE_ID,
        {
          to_email: to,
          to_name: recipientName,
          from_name: senderName,
          subject,
          message: text,
        },
        {
          publicKey: process.env.EMAILJS_PUBLIC_KEY,
          privateKey: process.env.EMAILJS_PRIVATE_KEY,
        }
      );
      logger.info('Email envoyé via EmailJS', { to });
      return { provider: 'emailjs' };
    } catch (err) {
      logger.error('EmailJS a échoué, fallback vers fichier', { to, error: err.message });
    }
  }

  // ============================================================
  // 5. FICHIER LOCAL (dev sans config)
  // ============================================================
  try {
    fs.mkdirSync(config.logDir, { recursive: true });
    fs.appendFileSync(
      path.join(config.logDir, 'mail-outbox.log'),
      `\n=== ${new Date().toISOString()} ===\nÀ: ${to}\nDe: ${senderName}\nObjet: ${subject}\n\n${text}\n`,
      { mode: 0o600 }
    );
    logger.info('Email écrit dans logs/mail-outbox.log (aucun fournisseur configuré)', { to });
    return { provider: 'file' };
  } catch (err) {
    logger.error('Impossible d\'écrire dans mail-outbox.log', { to, error: err.message });
    throw err;
  }
}

module.exports = { sendMail, sent };