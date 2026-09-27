'use strict';
const config = require('./config');
const logger = require('./logger');
const db = require('./db');
const { createApp } = require('./app');
const { startCron } = require('./services/cron');

try { config.assertSafe(); } catch (err) { process.stderr.write(`${err.message}\n`); process.exit(1); }

const server = createApp().listen(config.port, () => logger.info(`API démarrée sur le port ${config.port} (${config.env})`));

// ✅ Démarrer les tâches cron (rappels push quotidiens)
startCron();

const shutdown = (sig) => {
  logger.info(`Arrêt (${sig})`);
  server.close(() => db.close().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => logger.error('unhandledRejection', { err }));