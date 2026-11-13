const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, stopDb, api, auth } = require('./helpers');
const { seed, DEMO } = require('../scripts/seed');

let creds;
before(async () => { await startDb(); creds = await seed(); });
after(stopDb);

test('seed refuses to overwrite existing data without --reset', async () => {
  await assert.rejects(seed(), /already has data/);
});

test('every seeded account can sign in', async () => {
  assert.equal((await api().post('/api/admin/login').send({ email: DEMO.admin.email, password: DEMO.admin.password })).status, 200);
  for (const m of creds.mentors) {
    assert.equal((await api().post('/api/mentors/login').send({ email: m.email, password: m.password })).status, 200, m.email);
  }
  for (const m of creds.mentees) {
    assert.equal((await api().post('/api/m/login').send({ enrollmentNumber: m.enrollmentNumber, password: m.password })).status, 200, m.enrollmentNumber);
  }
});

test('the demo has something live to show in every panel', async () => {
  const mentor = await api().post('/api/mentors/login').send({ email: creds.mentors[0].email, password: creds.mentors[0].password });
  const queue = await api().get('/api/unverified-projects').set(auth(mentor.body.token));
  assert.ok(queue.body.unverifiedProjects.length >= 1, 'a project waiting for review');

  const first = creds.mentees[0];
  const login = await api().post('/api/m/login').send({ enrollmentNumber: first.enrollmentNumber, password: first.password });
  const dash = await api().get('/api/m/dashboard').set(auth(login.body.token));
  const resources = dash.body.programs[0].resources;
  assert.ok(resources.some((r) => r.type === 'quiz' && r.quizWindow?.state === 'open' && r.status === 'todo'), 'an open quiz to take');
  assert.ok(resources.some((r) => r.status === 'todo' && new Date(r.deadline) > new Date()), 'something due soon');
  assert.ok(dash.body.totalScore > 0);

  const board = await api().get('/api/m/leaderboard');
  assert.equal(board.body.length, creds.mentees.length);
  const scores = board.body.map((r) => r.totalScore);
  assert.ok(new Set(scores).size > scores.length / 2, 'scores are varied');

  // New mentees continue the sequence after the seeded ones.
  const program = (await api().get('/api/programs')).body.find((p) => p.code === 'WD');
  const add = await api().post('/api/mentees').set(auth(mentor.body.token))
    .send({ name: 'New Student', email: 'new@techneeds.demo', programId: program._id });
  assert.equal(add.status, 201);
  assert.match(add.body.mentee.enrollmentNumber, /-007$/);
});
