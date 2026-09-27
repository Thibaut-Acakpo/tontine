'use strict';
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const h = require('./helpers');

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(64, 1)]);
const sign = (body) => crypto.createHmac('sha256', h.config.webhookSecret).update(body).digest('hex');

before(async () => { h.migrate(); await h.resetDb(); });
after(async () => { await h.db.close(); });

// Crée une tontine active avec 3 membres (manager + 2 membres) et renvoie tout le contexte.
async function activeTontine() {
  const [mgr, alice, bob] = [await h.makeUser('manager'), await h.makeUser('alice'), await h.makeUser('bob')];
  const M = await h.login(mgr);
  const created = await M.post('/api/tontines').send({ name: 'Tontine test', contributionAmount: 10000, frequency: 'monthly', startDate: '2026-10-01' });
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  for (const u of [alice, bob]) assert.equal((await M.post('/api/members').send({ tontineId: id, email: u.email, displayName: u.name })).status, 201);
  assert.equal((await M.post(`/api/tontines/${id}/start`).send({})).status, 200);
  const contribs = (await M.get(`/api/contributions?tontineId=${id}&limit=100`)).body.data;
  const rounds = (await M.get(`/api/tontines/${id}/rounds`)).body.data;
  return { M, id, mgr, alice, bob, contribs, rounds };
}

describe('Authentification', () => {
  test('routes protégées : 401 sans session', async () => {
    for (const p of ['/api/tontines', '/api/notifications', '/api/transactions?tontineId=1', '/api/admin/stats', '/api/users/me']) {
      assert.equal((await h.request(h.app).get(p)).status, 401, p);
    }
  });

  test('inscription -> confirmation email -> connexion, sans révéler l\'existence du compte', async () => {
    const email = 'nouveau@test.local';
    const r1 = await h.request(h.app).post('/api/auth/register').send({ email, password: h.PASSWORD, fullName: 'Nouveau Membre' });
    const r2 = await h.request(h.app).post('/api/auth/register').send({ email, password: h.PASSWORD, fullName: 'Nouveau Membre' });
    assert.equal(r1.status, 202);
    assert.deepEqual(r1.body, r2.body);
    let login = await h.request(h.app).post('/api/auth/login').send({ email, password: h.PASSWORD });
    assert.equal(login.status, 403); // email non confirmé
    const mail = h.mailer.sent.find((m) => m.to === email);
    const token = mail.text.match(/token=([\w-]+)/)[1];
    assert.equal((await h.request(h.app).post('/api/auth/verify-email').send({ token })).status, 200);
    assert.equal((await h.request(h.app).post('/api/auth/verify-email').send({ token })).status, 400); // usage unique
    login = await h.request(h.app).post('/api/auth/login').send({ email, password: h.PASSWORD });
    assert.equal(login.status, 200);
    assert.ok(!JSON.stringify(login.body).includes('password'));
    const row = await h.db.one('SELECT password_hash FROM users WHERE email = ?', [email]);
    assert.ok(row.password_hash.startsWith('$argon2id$'));
  });

  test('messages génériques + verrouillage après 5 échecs + injection SQL inoffensive', async () => {
    const u = await h.makeUser('lock');
    const bad = await h.request(h.app).post('/api/auth/login').send({ email: u.email, password: 'faux-mot-de-passe1' });
    const unknown = await h.request(h.app).post('/api/auth/login').send({ email: 'inconnu@test.local', password: 'faux-mot-de-passe1' });
    assert.equal(bad.status, 401);
    assert.deepEqual(bad.body, unknown.body);
    assert.equal((await h.request(h.app).post('/api/auth/login').send({ email: "' OR '1'='1", password: "' OR '1'='1" })).status, 400);
    assert.equal((await h.request(h.app).post('/api/auth/login').send({ email: u.email, password: "' OR '1'='1" })).status, 401);
    for (let i = 0; i < 4; i += 1) await h.request(h.app).post('/api/auth/login').send({ email: u.email, password: 'faux-mot-de-passe1' });
    const locked = await h.request(h.app).post('/api/auth/login').send({ email: u.email, password: h.PASSWORD });
    assert.equal(locked.status, 401); // bon mot de passe mais compte verrouillé
  });

  test('CSRF : requête modifiante sans jeton refusée', async () => {
    const u = await h.makeUser('csrf');
    const c = await h.login(u);
    assert.equal((await c.agent.post('/api/tontines').send({ name: 'X tontine', contributionAmount: 1000, frequency: 'weekly', startDate: '2026-10-01' })).status, 403);
    assert.equal((await c.agent.post('/api/tontines').set('X-CSRF-Token', 'mauvais').send({})).status, 403);
    assert.equal((await c.agent.post('/api/tontines').set('Origin', 'https://evil.example').set('X-CSRF-Token', c.csrf).send({})).status, 403);
  });

  test('expiration, révocation et déconnexion des sessions', async () => {
    const u = await h.makeUser('sess');
    const c = await h.login(u);
    assert.equal((await c.get('/api/auth/me')).status, 200);
    await h.db.query('UPDATE sessions SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE user_id = ?', [u.id]);
    assert.equal((await c.get('/api/auth/me')).status, 401);
    const c2 = await h.login(u);
    await c2.post('/api/auth/logout').send({});
    assert.equal((await c2.get('/api/auth/me')).status, 401);
    const c3 = await h.login(u);
    await h.db.query('UPDATE sessions SET last_seen_at = UTC_TIMESTAMP() - INTERVAL 3 HOUR WHERE user_id = ?', [u.id]);
    assert.equal((await c3.get('/api/auth/me')).status, 401); // inactivité
  });
});

describe('Autorisation entre utilisateurs et entre tontines', () => {
  test('un étranger ne peut rien lire ni modifier ; un simple membre ne peut pas encaisser', async () => {
    const t = await activeTontine();
    const stranger = await h.login(await h.makeUser('stranger'));
    for (const p of [`/api/tontines/${t.id}`, `/api/tontines/${t.id}/rounds`, `/api/members?tontineId=${t.id}`, `/api/contributions?tontineId=${t.id}`, `/api/transactions?tontineId=${t.id}`]) {
      assert.equal((await stranger.get(p)).status, 403, p);
    }
    assert.equal((await stranger.post('/api/payments/cash').send({ contributionId: t.contribs[0].id })).status, 403);
    assert.equal((await stranger.patch(`/api/tontines/${t.id}`).send({ name: 'Piratée' })).status, 403);
    const alice = await h.login(t.alice);
    assert.equal((await alice.post('/api/payments/cash').send({ contributionId: t.contribs[0].id })).status, 403);
    assert.equal((await alice.post('/api/admin/stats').send({})).status, 403);
    assert.equal((await alice.get('/api/admin/stats')).status, 403);
    // un membre ne voit que ses propres cotisations
    const mine = (await alice.get(`/api/contributions?tontineId=${t.id}&limit=100`)).body.data;
    assert.ok(mine.length > 0 && mine.every((c) => c.isMine));
  });

  test('validation stricte : champs inattendus et types invalides rejetés', async () => {
    const c = await h.login(await h.makeUser('val'));
    const bad = { name: 'Ok tontine', contributionAmount: 1000, frequency: 'weekly', startDate: '2026-10-01' };
    assert.equal((await c.post('/api/tontines').send({ ...bad, role: 'admin' })).status, 400);
    assert.equal((await c.post('/api/tontines').send({ ...bad, contributionAmount: -5 })).status, 400);
    assert.equal((await c.post('/api/tontines').send({ ...bad, contributionAmount: '1000' })).status, 400);
    assert.equal((await c.post('/api/tontines').send({ ...bad, name: '<script>'.repeat(30) })).status, 400);
    assert.equal((await c.get('/api/tontines?limit=100000')).status, 400);
  });
});

describe('Finances', () => {
  test('encaissement, double paiement, versement, annulation traçable', async () => {
    const t = await activeTontine();
    const r1 = t.rounds[0];
    const first = t.contribs.filter((c) => c.roundId === r1.id);
    assert.equal(first.length, 3);
    // le client ne peut pas imposer un montant
    assert.equal((await t.M.post('/api/payments/cash').send({ contributionId: first[0].id, amount: 1 })).status, 400);
    assert.equal((await t.M.post('/api/payments/payout').send({ tontineId: t.id, roundId: r1.id })).status, 409); // rien payé
    const paid = await t.M.post('/api/payments/cash').send({ contributionId: first[0].id });
    assert.equal(paid.status, 201);
    assert.match(paid.body.data.txnNumber, /^TXN-\d{8}-[0-9A-F]{10}$/);
    assert.equal((await t.M.post('/api/payments/cash').send({ contributionId: first[0].id })).status, 409); // double paiement
    // tour suivant fermé aux paiements
    const r2c = t.contribs.find((c) => c.roundId === t.rounds[1].id);
    assert.equal((await t.M.post('/api/payments/cash').send({ contributionId: r2c.id })).status, 409);
    for (const c of first.slice(1)) assert.equal((await t.M.post('/api/payments/cash').send({ contributionId: c.id })).status, 201);
    const payout = await t.M.post('/api/payments/payout').send({ tontineId: t.id, roundId: r1.id });
    assert.equal(payout.status, 201);
    assert.equal(payout.body.data.amount, 30000);
    assert.equal((await t.M.post('/api/payments/payout').send({ tontineId: t.id, roundId: r1.id })).status, 409); // double versement
    // annulation d'une cotisation impossible tant que le versement existe, puis correction traçable
    const txns = (await t.M.get(`/api/transactions?tontineId=${t.id}&limit=50`)).body.data;
    const contribTxn = txns.find((x) => x.type === 'contribution');
    const payoutTxn = txns.find((x) => x.type === 'payout');
    assert.equal((await t.M.post(`/api/transactions/${contribTxn.id}/reverse`).send({ reason: 'Erreur de saisie' })).status, 409);
    assert.equal((await t.M.post(`/api/transactions/${payoutTxn.id}/reverse`).send({ reason: 'Versement erroné' })).status, 201);
    assert.equal((await t.M.post(`/api/transactions/${contribTxn.id}/reverse`).send({ reason: 'Erreur de saisie' })).status, 201);
    assert.equal((await t.M.post(`/api/transactions/${contribTxn.id}/reverse`).send({ reason: 'Encore une fois' })).status, 409);
    const after = (await t.M.get(`/api/transactions?tontineId=${t.id}&limit=50`)).body.data;
    assert.equal(after.find((x) => x.id === contribTxn.id).status, 'reversed');
    assert.equal(after.filter((x) => x.type === 'reversal').length, 2);
    const logs = await h.db.query("SELECT action FROM audit_logs WHERE action IN ('payment.cash_recorded','payment.payout','transaction.reverse')");
    assert.ok(logs.length >= 6);
  });

  test('base de données : transactions immuables et non supprimables', async () => {
    const t = await h.db.one("SELECT id FROM transactions WHERE status = 'validated' LIMIT 1");
    await assert.rejects(h.db.query('UPDATE transactions SET amount = 1 WHERE id = ?', [t.id]));
    await assert.rejects(h.db.query('DELETE FROM transactions WHERE id = ?', [t.id]));
    await assert.rejects(h.db.query("UPDATE transactions SET status = 'pending' WHERE id = ?", [t.id]));
  });

  test('doubles paiements concurrents : un seul est accepté', async () => {
    const t = await activeTontine();
    const c = t.contribs.find((x) => x.roundId === t.rounds[0].id);
    const results = await Promise.all(Array.from({ length: 6 }, () => t.M.post('/api/payments/cash').send({ contributionId: c.id })));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    const n = await h.db.one("SELECT COUNT(*) AS n FROM transactions WHERE contribution_id = ? AND status = 'validated'", [c.id]);
    assert.equal(n.n, 1);
  });
});

describe('Paiement en ligne et webhooks', () => {
  test('paiement mobile : initiation, simulation signée, rejeu ignoré, signature invalide refusée', async () => {
    const t = await activeTontine();
    const A = await h.login(t.alice);
    const aliceContrib = (await A.get(`/api/contributions?tontineId=${t.id}&limit=100`)).body.data.find((c) => c.roundId === t.rounds[0].id);
    const B = await h.login(t.bob);
    assert.equal((await B.post('/api/payments/initiate').send({ contributionId: aliceContrib.id })).status, 403); // pas sa cotisation
    assert.equal((await A.post('/api/payments/initiate').send({ contributionId: aliceContrib.id, amount: 1 })).status, 400);
    const init = await A.post('/api/payments/initiate').send({ contributionId: aliceContrib.id });
    assert.equal(init.status, 201);
    assert.equal(init.body.data.amount, 10000);
    assert.equal((await A.post('/api/payments/initiate').send({ contributionId: aliceContrib.id })).status, 409); // paiement déjà en cours
    assert.equal((await t.M.post('/api/payments/cash').send({ contributionId: aliceContrib.id })).status, 409);
    const ref = init.body.data.reference;
    const forged = JSON.stringify({ id: 'evt_forged', type: 'payment.succeeded', reference: ref });
    assert.equal((await h.request(h.app).post('/api/webhooks/mock').set('content-type', 'application/json').set('x-signature', 'deadbeef').send(forged)).status, 401);
    assert.equal((await h.request(h.app).post('/api/webhooks/mock').set('content-type', 'application/json').send(forged)).status, 401);
    // signature valide mais le fournisseur n'a pas confirmé le paiement : rien n'est validé
    assert.equal((await h.request(h.app).post('/api/webhooks/mock').set('content-type', 'application/json').set('x-signature', sign(forged)).send(forged)).status, 200);
    let row = await h.db.one('SELECT status FROM transactions WHERE provider_ref = ?', [ref]);
    assert.equal(row.status, 'pending'); // le fournisseur n'a rien confirmé
  });

  test('paiement mobile réussi, notification créée, rejeu du webhook sans double traitement', async () => {
    const t = await activeTontine();
    const A = await h.login(t.alice);
    const c = (await A.get(`/api/contributions?tontineId=${t.id}&limit=100`)).body.data.find((x) => x.roundId === t.rounds[0].id);
    const init = await A.post('/api/payments/initiate').send({ contributionId: c.id });
    const ref = init.body.data.reference;
    const sim = await A.post('/api/payments/dev/simulate').send({ reference: ref, outcome: 'succeeded' });
    assert.equal(sim.status, 200);
    assert.equal(sim.body.data.status, 'validated');
    assert.equal((await h.db.one('SELECT status FROM contributions WHERE id = ?', [c.id])).status, 'paid');
    const evt = JSON.stringify({ id: 'evt_replay', type: 'payment.succeeded', reference: ref });
    const send = () => h.request(h.app).post('/api/webhooks/mock').set('content-type', 'application/json').set('x-signature', sign(evt)).send(evt);
    assert.equal((await send()).status, 200);
    assert.equal((await send()).status, 200);
    assert.equal((await h.db.one('SELECT COUNT(*) AS n FROM webhook_events WHERE event_id = ?', ['evt_replay'])).n, 1);
    assert.equal((await h.db.one("SELECT COUNT(*) AS n FROM transactions WHERE contribution_id = ? AND status = 'validated'", [c.id])).n, 1);
    const notifs = (await A.get('/api/notifications')).body;
    assert.ok(notifs.data.some((n) => n.type === 'payment.validated'));
  });
});

describe('Uploads', () => {
  test('type, taille et contenu contrôlés ; accès limité', async () => {
    const t = await activeTontine();
    const c = t.contribs.find((x) => x.roundId === t.rounds[0].id);
    const tx = (await t.M.post('/api/payments/cash').send({ contributionId: c.id })).body.data.transactionId;
    const up = (name, buf, mime) => t.M.post(`/api/transactions/${tx}/proof`).attach('file', buf, { filename: name, contentType: mime });
    assert.equal((await up('virus.exe', Buffer.from('MZ'), 'application/octet-stream')).status, 400);
    assert.equal((await up('shell.php.png', Buffer.from('<?php'), 'image/png')).status, 400); // faux PNG (octets magiques)
    assert.equal((await up('page.html', Buffer.from('<script>'), 'text/html')).status, 400);
    assert.equal((await up('gros.png', Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]), 'image/png')).status, 400);
    const good = await up('recu.png', PNG, 'image/png');
    assert.equal(good.status, 201);
    const stranger = await h.login(await h.makeUser('stranger2'));
    assert.equal((await stranger.get(`/api/transactions/${tx}/proof/${good.body.data.id}`)).status, 403);
    const dl = await t.M.get(`/api/transactions/${tx}/proof/${good.body.data.id}`);
    assert.equal(dl.status, 200);
    assert.equal(dl.headers['x-content-type-options'], 'nosniff');
  });
});

describe('Réponses et en-têtes', () => {
  test('en-têtes de sécurité, erreurs génériques, pas de fuite technique', async () => {
    const r = await h.request(h.app).get('/api/health');
    assert.ok(r.headers['content-security-policy']);
    assert.equal(r.headers['x-content-type-options'], 'nosniff');
    assert.equal(r.headers['referrer-policy'], 'no-referrer');
    assert.ok(r.headers['permissions-policy']);
    assert.equal(r.headers['x-powered-by'], undefined);
    const bad = await h.request(h.app).post('/api/auth/login').set('content-type', 'application/json').send('{"email":');
    assert.equal(bad.status, 400);
    assert.ok(!/SyntaxError|at |node_modules/.test(JSON.stringify(bad.body)));
    assert.equal((await h.request(h.app).get('/api/inconnu')).status, 404);
  });

  test('CORS : origine non listée sans en-tête d\'autorisation', async () => {
    const r = await h.request(h.app).get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(r.headers['access-control-allow-origin'], undefined);
    const ok = await h.request(h.app).get('/api/health').set('Origin', 'http://localhost:5173');
    assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:5173');
  });
});
