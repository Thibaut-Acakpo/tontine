'use strict';
// Configuration de test : base dédiée (variables TEST_DB_*), jamais la base de développement.
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'tontine_test';
process.env.DB_USER = process.env.TEST_DB_USER || 'tt_app';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? 'apppw';
process.env.DB_ADMIN_USER = process.env.TEST_DB_ADMIN_USER || 'tt_admin';
process.env.DB_ADMIN_PASSWORD = process.env.TEST_DB_ADMIN_PASSWORD ?? 'adminpw';
process.env.PAYMENT_PROVIDER = 'mock';
process.env.WEBHOOK_SECRET = 'test-webhook-secret-test-webhook-secret';
process.env.UPLOAD_DIR = require('os').tmpdir() + '/tontine-test-uploads';

const { execFileSync } = require('child_process');
const path = require('path');
const mysql = require('mysql2/promise');
const argon2 = require('argon2');
const request = require('supertest');
const config = require('../src/config');
const db = require('../src/db');
const { createApp } = require('../src/app');
const mailer = require('../src/mailer');

const app = createApp();
const PASSWORD = 'MotDePasse123';

function migrate() {
  execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'migrate.js')], { env: process.env, stdio: 'pipe' });
}

async function resetDb() {
  const c = await mysql.createConnection({ host: config.db.host, user: config.db.adminUser, password: config.db.adminPassword, database: config.db.database });
  await c.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of ['uploads', 'webhook_events', 'audit_logs', 'notifications', 'transactions', 'contributions', 'rounds', 'tontine_members', 'tontines', 'email_tokens', 'sessions', 'users']) await c.query(`TRUNCATE TABLE ${t}`);
  await c.query('SET FOREIGN_KEY_CHECKS = 1');
  await c.end();
  mailer.sent.length = 0;
}

let counter = 0;
async function makeUser(name, role = 'member') {
  counter += 1;
  const email = `${name}${counter}@test.local`;
  const hash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  const r = await db.query("INSERT INTO users (email, password_hash, full_name, role, email_verified_at) VALUES (?,?,?,?, UTC_TIMESTAMP())", [email, hash, name, role]);
  return { id: r.insertId, email, name };
}

// Retourne un client authentifié qui ajoute automatiquement le jeton CSRF.
async function login(user) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login échoué: ${res.status} ${JSON.stringify(res.body)}`);
  const csrf = res.body.data.csrfToken;
  const wrap = (m) => (url) => agent[m](url).set('X-CSRF-Token', csrf);
  return { agent, csrf, get: (u) => agent.get(u), post: wrap('post'), patch: wrap('patch'), put: wrap('put'), delete: wrap('delete') };
}

module.exports = { app, db, request, migrate, resetDb, makeUser, login, PASSWORD, mailer, config };
