'use strict';

const mysql = require('mysql2/promise');
const config = require('./config');

const baseOptions = {
  host: String(config.db.host || '127.0.0.1').trim(),
  port: Number(config.db.port || 3306),
  database: String(config.db.database || 'tontine').trim(),

  waitForConnections: true,
  connectionLimit: 10,

  timezone: 'Z',
  dateStrings: ['DATE'],

  supportBigNumbers: true,
  bigNumberStrings: false,

  charset: 'utf8mb4'
};

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...baseOptions,
      user: String(config.db.user || '').trim(),
      password: config.db.password || ''
    });
  }

  return pool;
}

async function query(sql, params = [], conn = null) {
  const connection = conn || getPool();
  const [rows] = await connection.execute(sql, params);
  return rows;
}

async function one(sql, params = [], conn = null) {
  const rows = await query(sql, params, conn);
  return rows[0] || null;
}

async function tx(fn) {
  const conn = await getPool().getConnection();

  try {
    await conn.beginTransaction();

    const result = await fn(conn);

    await conn.commit();

    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      // Connexion déjà fermée.
    }

    throw err;
  } finally {
    conn.release();
  }
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  query,
  one,
  tx,
  close,
  getPool,
  baseOptions
};