// One test per problem-statement flow, all through the HTTP API.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, stopDb, api, auth, cohort } = require('./helpers');

let c;
before(async () => { await startDb(); c = await cohort(); });
after(stopDb);

const HOUR = 3600 * 1000;

test('A1/A2/A3 admin creates a program, onboards a mentor with generated credentials', async () => {
  const program = await api().post('/api/programs').set(auth(c.adminToken)).send({ name: 'Machine Learning Cohort' });
  assert.equal(program.status, 201);
  assert.equal(program.body.code, 'MLC');

  const mentor = await api().post('/api/mentors').set(auth(c.adminToken)).send({ name: 'Riya', email: 'riya@test.io' });
  assert.equal(mentor.status, 201);
  assert.equal(typeof mentor.body.tempPassword, 'string');
  assert.ok(mentor.body.tempPassword.length >= 12);

  const assign = await api().post(`/api/programs/${program.body._id}/add-mentor`).set(auth(c.adminToken)).send({ mentorId: mentor.body._id });
  assert.equal(assign.status, 200);
  // Assigning twice must not duplicate (upstream pushed duplicates).
  const again = await api().post(`/api/programs/${program.body._id}/add-mentor`).set(auth(c.adminToken)).send({ mentorId: mentor.body._id });
  assert.equal(again.body.program.mentors.length, 1);

  const login = await api().post('/api/mentors/login').send({ email: 'riya@test.io', password: mentor.body.tempPassword });
  assert.equal(login.status, 200);
  assert.equal(login.body.role, 'mentor');

  const overview = await api().get('/api/admin/overview').set(auth(c.adminToken));
  assert.equal(overview.body.programs, 2);
});

test('M2/M3 enrollment numbers are generated, sequential and unique; passwords shown once', async () => {
  const add = (n) => api().post('/api/mentees').set(auth(c.mentorToken))
    .send({ name: `Student ${n}`, email: `s${n}@test.io`, programId: c.program._id });
  const a = await add(1);
  const b = await add(2);
  assert.equal(a.status, 201);
  assert.match(a.body.mentee.enrollmentNumber, /^TN-WD\d{2}-\d{3}$/);
  const seq = (x) => Number(x.body.mentee.enrollmentNumber.slice(-3));
  assert.equal(seq(b), seq(a) + 1);
  assert.ok(a.body.tempPassword);

  const dupe = await api().post('/api/mentees').set(auth(c.mentorToken))
    .send({ name: 'Dupe', email: 'dupe@test.io', programId: c.program._id, enrollmentNumber: a.body.mentee.enrollmentNumber });
  assert.equal(dupe.status, 409);

  const reset = await api().post(`/api/mentees/${a.body.mentee._id}/reset-password`).set(auth(c.mentorToken));
  assert.equal(reset.status, 200);
  const login = await api().post('/api/m/login').send({ enrollmentNumber: a.body.mentee.enrollmentNumber, password: reset.body.tempPassword });
  assert.equal(login.status, 200);
});

test('M4/M7 mentor posts a video with deadline and max score; mentee completes it', async () => {
  const video = await api().post('/api/resources').set(auth(c.mentorToken)).send({
    title: 'HTTP in 20 minutes', type: 'video', url: 'https://youtu.be/abc', program: c.program._id,
    deadline: new Date(Date.now() + 48 * HOUR), maxScore: 40, tags: ['backend', 'http'],
  });
  assert.equal(video.status, 201);
  assert.equal(video.body.maxScore, 40);
  assert.deepEqual(video.body.tags, ['backend', 'http']);

  const done = await api().post(`/api/m/resources/${video.body._id}/complete`).set(auth(c.menteeToken));
  assert.equal(done.status, 200);
  assert.equal(done.body.score, 40);
  assert.equal(done.body.streak, 1);
  // Completing twice does not double-score.
  const twice = await api().post(`/api/m/resources/${video.body._id}/complete`).set(auth(c.menteeToken));
  assert.equal(twice.body.score, 40);
});

test('unknown program returns 404 instead of 500', async () => {
  const res = await api().post('/api/resources').set(auth(c.mentorToken))
    .send({ title: 'x', type: 'video', program: '000000000000000000000000' });
  assert.equal(res.status, 404);
});

test('M5 mentor posts a quiz; mentee takes it once; score is scaled to maxScore', async () => {
  const quiz = await api().post('/api/resources/quiz').set(auth(c.mentorToken)).send({
    title: 'JavaScript basics', program: c.program._id, maxScore: 100,
    startTime: new Date(Date.now() - HOUR), endTime: new Date(Date.now() + HOUR),
    questions: [
      { questionText: 'typeof null', options: ['null', 'object'], correctOptionIndex: 1, marks: 2 },
      { questionText: '2 + "2"', options: ['4', '22'], correctOptionIndex: 1, marks: 1 },
      { questionText: '[] == false', options: ['true', 'false'], correctOptionIndex: 0, marks: 1 },
    ],
  });
  assert.equal(quiz.status, 201);
  assert.equal(quiz.body.resource.isLocked, false);
  const rid = quiz.body.resource._id;

  const view = await api().get(`/api/m/resources/${rid}/quiz`).set(auth(c.menteeToken));
  assert.equal(view.status, 200);
  assert.equal(view.body.questions.length, 3);
  assert.equal(view.body.questions[0].correctOptionIndex, undefined, 'answers must not leak');

  const qs = view.body.questions;
  const submit = await api().post(`/api/m/resources/${rid}/quiz/submit`).set(auth(c.menteeToken)).send({
    answers: [
      { questionId: qs[0].id, selectedOptionIndex: 1 },
      { questionId: qs[1].id, selectedOptionIndex: 1 },
      { questionId: qs[2].id, selectedOptionIndex: 1 },
    ],
  });
  assert.equal(submit.status, 200);
  assert.equal(submit.body.raw, 3);
  assert.equal(submit.body.totalMarks, 4);
  assert.equal(submit.body.score, 75);

  const resubmit = await api().post(`/api/m/resources/${rid}/quiz/submit`).set(auth(c.menteeToken)).send({ answers: [] });
  assert.equal(resubmit.status, 409);
});

test('quiz is refused before it opens and after it closes', async () => {
  const make = (start, end) => api().post('/api/resources/quiz').set(auth(c.mentorToken)).send({
    title: 'Timed', program: c.program._id, startTime: start, endTime: end,
    questions: [{ questionText: 'q', options: ['a', 'b'], correctOptionIndex: 0 }],
  });
  const future = await make(new Date(Date.now() + HOUR), new Date(Date.now() + 2 * HOUR));
  const res = await api().post(`/api/m/resources/${future.body.resource._id}/quiz/submit`).set(auth(c.menteeToken)).send({ answers: [] });
  assert.equal(res.status, 403);
  const peek = await api().get(`/api/m/resources/${future.body.resource._id}/quiz`).set(auth(c.menteeToken));
  assert.equal(peek.status, 403);
});

test('quiz builder rejects a question without a valid correct option', async () => {
  const res = await api().post('/api/resources/quiz').set(auth(c.mentorToken)).send({
    title: 'Bad', program: c.program._id, endTime: new Date(Date.now() + HOUR),
    questions: [{ questionText: 'q', options: ['a', 'b'], correctOptionIndex: 5 }],
  });
  assert.equal(res.status, 400);
});

test('M6 project: cannot be checkbox-completed; submit, review queue, verify with feedback', async () => {
  const project = await api().post('/api/resources').set(auth(c.mentorToken)).send({
    title: 'Portfolio site', type: 'project', url: 'https://brief.example', program: c.program._id, maxScore: 200,
  });
  const pid = project.body._id;

  const shortcut = await api().post(`/api/m/resources/${pid}/complete`).set(auth(c.menteeToken));
  assert.equal(shortcut.status, 400, 'upstream awarded full marks here');

  const badUrl = await api().post(`/api/m/resources/${pid}/project`).set(auth(c.menteeToken))
    .send({ githubLink: 'not a url', deployedLink: 'https://x.app', description: 'd' });
  assert.equal(badUrl.status, 400);

  const submit = await api().post(`/api/m/resources/${pid}/project`).set(auth(c.menteeToken))
    .send({ githubLink: 'https://github.com/me/site', deployedLink: 'https://me.app', description: 'My portfolio site built with HTML, CSS and a little JS.' });
  assert.equal(submit.status, 200);

  const queue = await api().get('/api/unverified-projects').set(auth(c.mentorToken));
  const item = queue.body.unverifiedProjects.find((p) => String(p.resourceId) === pid);
  assert.ok(item);
  assert.equal(item.maxScore, 200);

  const verify = await api().patch(`/api/${c.mentee._id}/resources/${pid}/verify`).set(auth(c.mentorToken))
    .send({ score: 999, feedback: 'Clean layout, add tests.' });
  assert.equal(verify.status, 200);
  assert.equal(verify.body.finalScore, 200, 'clamped to maxScore');

  const twice = await api().patch(`/api/${c.mentee._id}/resources/${pid}/verify`).set(auth(c.mentorToken)).send({ score: 10 });
  assert.equal(twice.status, 400);

  const resubmit = await api().post(`/api/m/resources/${pid}/project`).set(auth(c.menteeToken))
    .send({ githubLink: 'https://github.com/me/site', deployedLink: 'https://me.app', description: 'Trying to resubmit after the review was done.' });
  assert.equal(resubmit.status, 409);

  const dash = await api().get('/api/m/dashboard').set(auth(c.menteeToken));
  const r = dash.body.programs[0].resources.find((x) => x._id === pid);
  assert.equal(r.status, 'verified');
  assert.equal(r.feedback, 'Clean layout, add tests.');
});

test('E2 mentee cannot complete a resource from a program they are not in', async () => {
  const other = await cohort({ programName: 'Cloud' });
  const v = await api().post('/api/resources').set(auth(other.mentorToken))
    .send({ title: 'Other video', type: 'video', url: 'https://x.io', program: other.program._id });
  const res = await api().post(`/api/m/resources/${v.body._id}/complete`).set(auth(c.menteeToken));
  assert.equal(res.status, 403);
});

test('E3/E4 dashboard totals match the leaderboard; program filter works', async () => {
  const dash = await api().get('/api/m/dashboard').set(auth(c.menteeToken));
  assert.equal(dash.status, 200);
  assert.equal(dash.body.totalScore, 40 + 75 + 200);
  assert.ok(dash.body.rank >= 1);

  const board = await api().get(`/api/m/leaderboard?program=${c.program._id}`);
  assert.equal(board.status, 200);
  const me = board.body.find((r) => r.id === c.mentee._id);
  assert.equal(me.totalScore, dash.body.totalScore);
  assert.equal(me.rank, 1);
  assert.ok(board.body.every((r) => r.name), 'only names and scores are public');
  assert.doesNotMatch(JSON.stringify(board.body), /email|password|enrollment/i);
});

test('P5 mentee sets interest tags', async () => {
  const res = await api().patch('/api/m/me').set(auth(c.menteeToken)).send({ interests: ['React', 'system design', 'react'] });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.interests, ['react', 'system design']);
});

test('mentor edits a deadline and deletes a resource; totals stay consistent', async () => {
  const v = await api().post('/api/resources').set(auth(c.mentorToken))
    .send({ title: 'Temp', type: 'video', url: 'https://t.io', program: c.program._id, maxScore: 10 });
  const patch = await api().patch(`/api/resources/${v.body._id}`).set(auth(c.mentorToken)).send({ maxScore: 15, isLocked: true });
  assert.equal(patch.body.maxScore, 15);
  assert.equal(patch.body.isLocked, true);
  const locked = await api().post(`/api/m/resources/${v.body._id}/complete`).set(auth(c.menteeToken));
  assert.equal(locked.status, 403);
  await api().patch(`/api/resources/${v.body._id}`).set(auth(c.mentorToken)).send({ isLocked: false });
  await api().post(`/api/m/resources/${v.body._id}/complete`).set(auth(c.menteeToken));
  const before = (await api().get('/api/m/dashboard').set(auth(c.menteeToken))).body.totalScore;
  const del = await api().delete(`/api/resources/${v.body._id}`).set(auth(c.mentorToken));
  assert.equal(del.status, 200);
  const after = (await api().get('/api/m/dashboard').set(auth(c.menteeToken))).body.totalScore;
  assert.equal(after, before - 15);
});

test('public stats and health', async () => {
  const stats = await api().get('/api/stats');
  assert.equal(stats.status, 200);
  assert.ok(stats.body.mentees >= 1);
  const health = await api().get('/api/health');
  assert.equal(health.body.db, 'connected');
});
