const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { rateLimit } = require('../middleware/rateLimit');

// A stand-in login: "ok" succeeds, anything else is a 400 like the real routes.
function app(opts) {
  const a = express();
  a.use(express.json());
  a.post('/login', rateLimit(opts), (req, res) => (req.body.password === 'ok' ? res.json({ ok: true }) : res.status(400).json({ error: 'Invalid credentials' })));
  return a;
}

test('successful logins are never limited (a whole lab can share one IP)', async () => {
  const prev = process.env.DISABLE_RATE_LIMIT;
  delete process.env.DISABLE_RATE_LIMIT;
  try {
    const a = app({ perAccount: 3, perIp: 5 });
    for (let i = 0; i < 30; i++) {
      const res = await request(a).post('/login').send({ email: `student${i}@x.io`, password: 'ok' });
      assert.equal(res.status, 200);
    }
  } finally { process.env.DISABLE_RATE_LIMIT = prev; }
});

test('repeated failures lock that account, not other accounts', async () => {
  const prev = process.env.DISABLE_RATE_LIMIT;
  delete process.env.DISABLE_RATE_LIMIT;
  try {
    const a = app({ perAccount: 3, perIp: 50 });
    for (let i = 0; i < 3; i++) assert.equal((await request(a).post('/login').send({ email: 'v@x.io', password: 'bad' })).status, 400);
    const locked = await request(a).post('/login').send({ email: 'v@x.io', password: 'ok' });
    assert.equal(locked.status, 429);
    assert.ok(Number(locked.headers['retry-after']) > 0);
    assert.equal((await request(a).post('/login').send({ email: 'other@x.io', password: 'ok' })).status, 200);
  } finally { process.env.DISABLE_RATE_LIMIT = prev; }
});

test('spraying many accounts from one IP hits the per-IP ceiling', async () => {
  const prev = process.env.DISABLE_RATE_LIMIT;
  delete process.env.DISABLE_RATE_LIMIT;
  try {
    const a = app({ perAccount: 3, perIp: 5 });
    for (let i = 0; i < 5; i++) await request(a).post('/login').send({ email: `t${i}@x.io`, password: 'bad' });
    assert.equal((await request(a).post('/login').send({ email: 'fresh@x.io', password: 'bad' })).status, 429);
  } finally { process.env.DISABLE_RATE_LIMIT = prev; }
});
