const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { startDb, stopDb, api, auth, cohort } = require('./helpers');
const Mentee = require('../models/Mentee');

let c;
before(async () => { await startDb(); c = await cohort(); });
after(stopDb);

test('admin routes reject anonymous, mentor and mentee callers', async () => {
  for (const headers of [{}, auth(c.mentorToken), auth(c.menteeToken)]) {
    const create = await api().post('/api/programs').set(headers).send({ name: 'Nope' });
    assert.ok([401, 403].includes(create.status), `create program got ${create.status}`);
    const mentor = await api().post('/api/mentors').set(headers).send({ name: 'x', email: 'x@x.io' });
    assert.ok([401, 403].includes(mentor.status));
    const list = await api().get('/api/mentors').set(headers);
    assert.ok([401, 403].includes(list.status));
  }
});

test('admin login fails with wrong password and works with the right one', async () => {
  const bad = await api().post('/api/admin/login').send({ email: 'admin@test.io', password: 'wrong' });
  assert.equal(bad.status, 400);
  const me = await api().get('/api/admin/me').set(auth(c.adminToken));
  assert.equal(me.status, 200);
  assert.equal(me.body.email, 'admin@test.io');
  assert.equal(me.body.password, undefined);
});

test('no response anywhere contains a password field', async () => {
  const bodies = [
    (await api().get('/api/mentors').set(auth(c.adminToken))).body,
    (await api().get('/api/programs')).body,
    (await api().get(`/api/${c.program._id}/mentees`).set(auth(c.mentorToken))).body,
    (await api().get('/api/mentors/me').set(auth(c.mentorToken))).body,
    (await api().get('/api/m/dashboard').set(auth(c.menteeToken))).body,
    (await api().post('/api/m/login').send({ enrollmentNumber: c.mentee.enrollmentNumber, password: c.menteePassword })).body,
    c.mentor,
    c.mentee,
  ];
  assert.doesNotMatch(JSON.stringify(bodies), /"password"/);
});

test('mentee passwords are stored as bcrypt hashes', async () => {
  const stored = await Mentee.findById(c.mentee._id).lean();
  assert.match(stored.password, /^\$2[aby]\$/);
  assert.notEqual(stored.password, c.menteePassword);
});

test('legacy plaintext mentee password still logs in and is upgraded to a hash', async () => {
  await Mentee.collection.insertOne({
    name: 'Legacy', email: 'legacy@test.io', enrollmentNumber: 'OLD-001', password: 'plain123',
    programs: [], completedResources: [], streak: 0, totalScore: 0,
  });
  const res = await api().post('/api/m/login').send({ enrollmentNumber: 'OLD-001', password: 'plain123' });
  assert.equal(res.status, 200);
  const after = await Mentee.findOne({ enrollmentNumber: 'OLD-001' }).lean();
  assert.match(after.password, /^\$2[aby]\$/);
  const again = await api().post('/api/m/login').send({ enrollmentNumber: 'OLD-001', password: 'plain123' });
  assert.equal(again.status, 200);
});

test('upstream-style tokens (id only, no role) are still accepted', async () => {
  const legacy = jwt.sign({ id: c.mentee._id }, process.env.JWT_SECRET);
  const res = await api().get('/api/m/dashboard').set(auth(legacy));
  assert.equal(res.status, 200);
});

test('a mentee token cannot be used as a mentor token', async () => {
  const res = await api().post('/api/resources').set(auth(c.menteeToken))
    .send({ title: 'x', type: 'video', program: c.program._id });
  assert.equal(res.status, 403);
});

test('program mentee list is no longer readable without auth', async () => {
  const res = await api().get(`/api/${c.program._id}/mentees`);
  assert.equal(res.status, 401);
});

test('a mentor from another program cannot read or act on this program', async () => {
  const other = await cohort({ programName: 'Data Science' });
  const read = await api().get(`/api/${c.program._id}/mentees`).set(auth(other.mentorToken));
  assert.equal(read.status, 403);
  const post = await api().post('/api/resources').set(auth(other.mentorToken))
    .send({ title: 'x', type: 'video', program: c.program._id });
  assert.equal(post.status, 403);
});
