'use strict';
const config = require('../config');
const logger = require('../logger');

const ONESIGNAL_API = 'https://onesignal.com/api/v1/notifications';

// Envoyer une notification à un utilisateur
async function sendPushToUser(userId, title, body, data = {}) {
  if (!config.onesignal?.appId || !config.onesignal?.restApiKey) {
    logger.warn('OneSignal non configuré, notification ignorée', { userId });
    return { skipped: true };
  }

  try {
    const res = await fetch(ONESIGNAL_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${config.onesignal.restApiKey}`,
      },
      body: JSON.stringify({
        app_id: config.onesignal.appId,
        include_aliases: { external_id: [String(userId)] },
        target_channel: 'push',
        headings: { fr: title, en: title },
        contents: { fr: body, en: body },
        data,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      logger.error('OneSignal erreur', { userId, status: res.status, json });
      return { error: json };
    }
    logger.info('Push envoyé', { userId, id: json.id });
    return { success: true, id: json.id };
  } catch (e) {
    logger.error('OneSignal exception', { userId, error: e.message });
    return { error: e.message };
  }
}

// Envoyer à plusieurs utilisateurs d'un coup
async function sendPushToUsers(userIds, title, body, data = {}) {
  if (!userIds.length) return { skipped: true };
  if (!config.onesignal?.appId || !config.onesignal?.restApiKey) {
    return { skipped: true };
  }

  try {
    const res = await fetch(ONESIGNAL_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${config.onesignal.restApiKey}`,
      },
      body: JSON.stringify({
        app_id: config.onesignal.appId,
        include_aliases: { external_id: userIds.map(String) },
        target_channel: 'push',
        headings: { fr: title, en: title },
        contents: { fr: body, en: body },
        data,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      logger.error('OneSignal erreur (multi)', { status: res.status, json });
      return { error: json };
    }
    return { success: true, id: json.id, recipients: json.recipients };
  } catch (e) {
    logger.error('OneSignal exception (multi)', { error: e.message });
    return { error: e.message };
  }
}

module.exports = { sendPushToUser, sendPushToUsers };