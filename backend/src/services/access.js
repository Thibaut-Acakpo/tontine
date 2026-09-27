'use strict';
const db = require('../db');
const { E } = require('../utils/http');
const { audit } = require('../audit');

// Contrôle d'accès côté serveur : chaque ressource est toujours rattachée à une tontine dont on vérifie l'appartenance.
async function getAccess(req, tontineId) {
  const tontine = await db.one('SELECT * FROM tontines WHERE id = ?', [tontineId]);
  const member = await db.one('SELECT * FROM tontine_members WHERE tontine_id = ? AND user_id = ?', [tontineId, req.user.id]);
  const isAdmin = req.user.role === 'admin';
  if (!tontine || (!member && !isAdmin)) {
    await audit(req, { action: 'access.denied', resourceType: 'tontine', resourceId: tontineId, result: 'denied' });
    throw E.forbidden();
  }
  return { tontine, member, role: member ? member.tontine_role : 'admin', isAdmin };
}

function requireRole(access, roles, req) {
  if (access.isAdmin || roles.includes(access.role)) return;
  audit(req, { action: 'access.denied', resourceType: 'tontine', resourceId: access.tontine.id, result: 'denied' });
  throw E.forbidden();
}

const canManage = (a) => a.isAdmin || ['manager', 'treasurer'].includes(a.role);

module.exports = { getAccess, requireRole, canManage };
