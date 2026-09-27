'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const seed = require('../scripts/seed');

test('mot de passe de 8 caractères numériques est accepté', () => {
  assert.equal(seed.validateAdminSeed('admin@example.com', '12345678').valid, true);
});
