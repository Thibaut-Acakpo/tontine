'use strict';
const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { securityHeaders, corsMiddleware, enforceHttps, checkOrigin, limiters } = require('./middleware/security');
const { loadSession, requireAuth, requireAdmin, csrfProtect } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errors');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(enforceHttps);
  app.use(securityHeaders);
  app.use(corsMiddleware);

  // Webhooks génériques : corps brut + signature, avant le parseur JSON global.
  app.use('/api/webhooks', limiters.webhook, require('./routes/webhooks'));

  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());
  app.use('/api', limiters.global, checkOrigin, loadSession, csrfProtect);

  app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

  // ⚠️ Route TEMPORAIRE de setup (à retirer après usage)
  app.use('/api/setup', require('./routes/setup'));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', requireAuth, require('./routes/users'));
  app.use('/api/tontines', requireAuth, require('./routes/tontines'));
  app.use('/api/members', requireAuth, require('./routes/members'));
  app.use('/api/contributions', requireAuth, require('./routes/contributions'));
  app.use('/api/payments', requireAuth, require('./routes/payments'));
  app.use('/api/transactions', requireAuth, require('./routes/transactions'));
  app.use('/api/notifications', requireAuth, require('./routes/notifications'));
  app.use('/api/admin', requireAdmin, require('./routes/admin'));

  if (config.serveFrontend && fs.existsSync(config.frontendDist)) {
    app.use(express.static(config.frontendDist, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(config.frontendDist, 'index.html')));
  }

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };