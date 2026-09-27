'use strict';
const cron = require('node-cron');
const db = require('../db');
const config = require('../config');
const logger = require('../logger');
const { sendPushToUser } = require('./onesignal');

// Envoie les rappels aux membres ayant une cotisation à échéance dans 3 jours
async function sendReminders() {
  try {
    logger.info('CRON: envoi des rappels de cotisation');

    const contributions = await db.query(`
      SELECT c.id, c.amount_due, c.member_id, m.user_id, m.display_name,
             t.name AS tontine_name, t.currency, r.due_date, r.round_number
        FROM contributions c
        JOIN tontine_members m ON m.id = c.member_id
        JOIN tontines t ON t.id = c.tontine_id
        JOIN rounds r ON r.id = c.round_id
       WHERE c.status = 'pending'
         AND m.user_id IS NOT NULL
         AND r.due_date = DATE_ADD(CURDATE(), INTERVAL 3 DAY)
         AND t.status = 'active'
    `);

    for (const c of contributions) {
      const amount = Number(c.amount_due).toLocaleString('fr-FR');
      const currency = c.currency === 'XOF' ? 'FCFA' : c.currency;
      await sendPushToUser(
        c.user_id,
        `Rappel : cotisation à venir`,
        `${c.tontine_name} - Tour ${c.round_number} : ${amount} ${currency} à payer avant le ${new Date(c.due_date).toLocaleDateString('fr-FR')}.`,
        { type: 'reminder', contributionId: String(c.id) }
      );
    }

    logger.info(`CRON: ${contributions.length} rappel(s) envoyé(s)`);
  } catch (e) {
    logger.error('CRON erreur rappels', { error: e.message });
  }
}

// Démarre tous les cron jobs
function startCron() {
  if (!config.cron?.enabled) {
    logger.info('CRON désactivé (CRON_ENABLED=0)');
    return;
  }

  const hour = config.cron.reminderHour || 8;

  // Tous les jours à HH:00 UTC
  cron.schedule(`0 ${hour} * * *`, sendReminders, { timezone: 'UTC' });

  logger.info(`CRON démarré (rappels quotidiens à ${hour}h UTC)`);
}

module.exports = { startCron, sendReminders };