'use strict';
const db = require('./db');
const logger = require('./logger');
const { sendMail } = require('./mailer');

// Crée une notification interne et, si demandé, un email. Ne doit jamais faire échouer l'opération métier.
async function notifyUser(userId, { type, title, body }, { email = false } = {}) {
  if (!userId) return;
  try {
    await db.query('INSERT INTO notifications (user_id, type, title, body) VALUES (?,?,?,?)', [userId, type, title.slice(0, 160), body.slice(0, 500)]);
    if (email) {
      const u = await db.one("SELECT email FROM users WHERE id = ? AND status = 'active' AND email_verified_at IS NOT NULL", [userId]);
      if (u) await sendMail({ to: u.email, subject: title, text: body });
    }
  } catch (err) {
    logger.error('Échec notification', { type, err });
  }
}

const notifyMember = async (memberId, payload, opts) => {
  const m = await db.one('SELECT user_id FROM tontine_members WHERE id = ?', [memberId]);
  if (m?.user_id) await notifyUser(m.user_id, payload, opts);
};

module.exports = { notifyUser, notifyMember };
