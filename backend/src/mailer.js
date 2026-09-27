'use strict';
const fs = require('fs');
const path = require('path');
const emailjs = require('@emailjs/nodejs');
const config = require('./config');
const logger = require('./logger');

let transport = null;
const sent = []; // uniquement utilisé par les tests

async function sendMail({ to, subject, text }) {
  if (config.isTest) { sent.push({ to, subject, text }); return; }

  // Mode 1 : SMTP direct (si configuré)
  if (config.mail.host) {
    if (!transport) {
      const nodemailer = require('nodemailer');
      transport = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.port === 465,
        auth: config.mail.user ? { user: config.mail.user, pass: config.mail.password } : undefined,
      });
    }
    await transport.sendMail({ from: config.mail.from, to, subject, text });
    return;
  }

  // Mode 2 : EmailJS (si configuré)
  if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY) {
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      { to_email: to, subject, message: text },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY, // recommandé pour la sécurité [citation:1][citation:2]
      }
    );
    logger.info('Email envoyé via EmailJS', { to });
    return;
  }

  // Mode 3 (défaut) : écriture dans un fichier local
  fs.mkdirSync(config.logDir, { recursive: true });
  fs.appendFileSync(path.join(config.logDir, 'mail-outbox.log'), `\n=== ${new Date().toISOString()} ===\nÀ: ${to}\nObjet: ${subject}\n\n${text}\n`, { mode: 0o600 });
  logger.info('Email écrit dans logs/mail-outbox.log (ni SMTP ni EmailJS configuré)', { to });
}

module.exports = { sendMail, sent };