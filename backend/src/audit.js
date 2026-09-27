'use strict';
const db = require('./db');
const logger = require('./logger');

// Journal d'audit : utilisateur, action, date, ressource, résultat. Les métadonnées sont expurgées.
async function audit(req, { action, resourceType = null, resourceId = null, result = 'success', userId, meta = null, conn = null }) {
  try {
    const uid = userId ?? req?.user?.id ?? null;
    const safeMeta = meta ? JSON.stringify(logger.redact(meta)) : null;
    await db.query(
      'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, result, ip, user_agent, metadata) VALUES (?,?,?,?,?,?,?,?)',
      [uid, action, resourceType, resourceId != null ? String(resourceId) : null, result, req?.ip || null, (req?.get?.('user-agent') || '').slice(0, 255) || null, safeMeta],
      conn,
    );
  } catch (err) {
    logger.error('Échec écriture audit', { action, err });
  }
}

module.exports = { audit };
