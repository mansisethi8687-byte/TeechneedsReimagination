// Phase 4: the mentee learning flow, its rules, and the leaderboard formula.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, stopDb, api, auth, cohort } = require('./helpers');
const Mentee = require('../models/Mentee');
const Quiz = require('../models/Quiz');
const { standings } = require('../services/leaderboard');

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
let c;
let other;

before(async () => {
  await startDb();
  c = await cohort();
  other = await cohort({ programName: 'Data Science' });
});
after(stopDb);

const quizBody = (extra = {}) => ({
  title: 'Graded quiz', program: c.program._id, maxScore: 60,
  startTime: new Date(Date.now() - HOUR), endTime: new Date(Date.now() + HOUR), revealScores: true,
  questions: [
    { questionText: 'A', options: ['x', 'y', 'z'], correctOptionIndex: 2, marks: 1 },
    { questionText: 'B', options: ['x', 'y'], correctOptionIndex: 0, marks: 2 },
  ],
  ...extra,
});
async function newMentee(name) {
  const res = await api().post('/api/mentees').set(auth(c.mentorToken)).send({ name, email: `${name.toLowerCase().replace(/\s/g, '')}@t.io`, programId: c.program._id });
  const login = await api().post('/api/m/login').send({ enrollmentNumber: res.body.mentee.enrollmentNumber, password: res.body.tempPassword });
  return { ...res.body.mentee, token: login.body.token };
}

// ---------------- Quiz ----------------

test('quiz: no answer key reaches the mentee while the quiz is open, even after submitting', async () => {
  const q = await api().post('/api/resources/quiz').set(auth(c.mentorToken)).send(quizBody());
  const rid = q.body.resource._id;

  const detail = await api().get(`/api/m/resources/${rid}`).set(auth(c.menteeToken));
  assert.equal(detail.status, 200);
  assert.doesNotMatch(JSON.stringify(detail.body), /correctOptionIndex/);

  const view = await api().get(`/api/m/resources/${rid}/quiz`).set(auth(c.menteeToken));
  assert.doesNotMatch(JSON.stringify(view.body), /correctOptionIndex/);

  const [q1, q2] = view.body.questions;
  const submit = await api().post(`/api/m/resources/${rid}/quiz/submit`).set(auth(c.menteeToken))
    .send({ answers: [{ questionId: q1.id, selectedOptionIndex: 2 }, { questionId: q2.id, selectedOptionIndex: 1 }] });
  assert.equal(submit.status, 200);
  assert.equal(submit.body.raw, 1);
  assert.equal(submit.body.totalMarks, 3);
  assert.equal(submit.body.score, 20, '1 of 3 marks on a 60-point quiz');
  assert.doesNotMatch(JSON.stringify(submit.body), /correctOptionIndex|"review"/);

  const after = await api().get(`/api/m/resources/${rid}/quiz`).set(auth(c.menteeToken));
  assert.equal(after.body.submission.score, 20);
  assert.equal(after.body.submission.answersRevealed, false);
  assert.ok(after.body.submission.answersRevealAt, 'tells the mentee when answers will be shown');
  assert.doesNotMatch(JSON.stringify(after.body), /correctOptionIndex|"correct":(true|false)/);

  // Once it closes (and the mentor chose to reveal), the review shows the key.
  await Quiz.updateOne({ resource: rid }, { endTime: new Date(Date.now() - 1000) });
  const closed = await api().get(`/api/m/resources/${rid}/quiz`).set(auth(c.menteeToken));
  assert.equal(closed.body.submission.answersRevealed, true);
  assert.deepEqual(closed.body.questions.map((x) => x.correctOptionIndex), [2, 0]);
  assert.deepEqual(closed.body.submission.answers.map((a) => a.correct), [true, false]);
});

test('quiz: mentor can keep answers hidden even after it closes', async () => {
  const q = await api().post('/api/resources/quiz').set(auth(c.mentorToken)).send(quizBody({ title: 'Hidden', revealScores: false }));
  const rid = q.body.resource._id;
  const view = await api().get(`/api/m/resources/${rid}/quiz`).set(auth(c.menteeToken));
  await api().post(`/api/m/resources/${rid}/quiz/submit`).set(auth(c.menteeToken))
    .send({ answers: view.body.questions.map((x) => ({ questionId: x.id, selectedOptionIndex: 0 })) });
  await Quiz.updateOne({ resource: rid }, { endTime: new Date(Date.now() - 1000) });
  const closed = await api().get(`/api/m/resources/${rid}/quiz`).set(auth(c.menteeToken));
  assert.doesNotMatch(JSON.stringify(closed.body), /correctOptionIndex/);
  assert.equal(closed.body.submission.answersRevealAt, null);
});

test('quiz: every question must be answered with a real option', async () => {
  const q = await api().post('/api/resources/quiz').set(auth(c.mentorToken)).send(quizBody({ title: 'Validation' }));
  const rid = q.body.resource._id;
  const { body } = await api().get(`/api/m/resources/${rid}/quiz`).set(auth(c.menteeToken));
  const [q1, q2] = body.questions;

  const missing = await api().post(`/api/m/resources/${rid}/quiz/submit`).set(auth(c.menteeToken))
    .send({ answers: [{ questionId: q1.id, selectedOptionIndex: 0 }] });
  assert.equal(missing.status, 400);
  assert.match(missing.body.error, /missing: 2/);

  const outOfRange = await api().post(`/api/m/resources/${rid}/quiz/submit`).set(auth(c.menteeToken))
    .send({ answers: [{ questionId: q1.id, selectedOptionIndex: 0 }, { questionId: q2.id, selectedOptionIndex: 7 }] });
  assert.equal(outOfRange.status, 400);

  const notAnArray = await api().post(`/api/m/resources/${rid}/quiz/submit`).set(auth(c.menteeToken)).send({ answers: 'all of them' });
  assert.equal(notAnArray.status, 400);

  // Nothing was recorded by the rejected attempts, so a valid one still goes through.
  const ok = await api().post(`/api/m/resources/${rid}/quiz/submit`).set(auth(c.menteeToken))
    .send({ answers: [{ questionId: q1.id, selectedOptionIndex: 2 }, { questionId: q2.id, selectedOptionIndex: 0 }] });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.score, 60);
});

test('quiz: two simultaneous submissions score exactly once', async () => {
  const m = await newMentee('Race Tester');
  const q = await api().post('/api/resources/quiz').set(auth(c.mentorToken)).send(quizBody({ title: 'Race' }));
  const rid = q.body.resource._id;
  const { body } = await api().get(`/api/m/resources/${rid}/quiz`).set(auth(m.token));
  const answers = body.questions.map((x) => ({ questionId: x.id, selectedOptionIndex: 0 }));
  const results = await Promise.all([1, 2, 3].map(() => api().post(`/api/m/resources/${rid}/quiz/submit`).set(auth(m.token)).send({ answers })));
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409, 409]);
  const saved = await Mentee.findById(m._id).lean();
  assert.equal(saved.completedResources.filter((x) => String(x.resource) === rid).length, 1);
});

test('quiz: deadline enforced on the server (before open, after close)', async () => {
  const future = await api().post('/api/resources/quiz').set(auth(c.mentorToken))
    .send(quizBody({ title: 'Later', startTime: new Date(Date.now() + DAY), endTime: new Date(Date.now() + 2 * DAY) }));
  const fr = future.body.resource._id;
  assert.equal((await api().get(`/api/m/resources/${fr}/quiz`).set(auth(c.menteeToken))).status, 403);
  const detail = await api().get(`/api/m/resources/${fr}`).set(auth(c.menteeToken));
  assert.equal(detail.body.quizWindow.state, 'upcoming');

  const past = await api().post('/api/resources/quiz').set(auth(c.mentorToken)).send(quizBody({ title: 'Missed' }));
  await Quiz.updateOne({ resource: past.body.resource._id }, { endTime: new Date(Date.now() - 1000) });
  const late = await api().post(`/api/m/resources/${past.body.resource._id}/quiz/submit`).set(auth(c.menteeToken)).send({ answers: [] });
  assert.equal(late.status, 403);
  assert.match(late.body.error, /closed/);
});

test('quiz: after the first attempt, max score and opening time are frozen; questions never change', async () => {
  const q = await api().post('/api/resources/quiz').set(auth(c.mentorToken)).send(quizBody({ title: 'Frozen' }));
  const rid = q.body.resource._id;
  const { body } = await api().get(`/api/m/resources/${rid}/quiz`).set(auth(c.menteeToken));
  await api().post(`/api/m/resources/${rid}/quiz/submit`).set(auth(c.menteeToken))
    .send({ answers: body.questions.map((x) => ({ questionId: x.id, selectedOptionIndex: 0 })) });

  const rescale = await api().patch(`/api/resources/${rid}`).set(auth(c.mentorToken)).send({ maxScore: 500 });
  assert.equal(rescale.status, 409);
  const reopen = await api().patch(`/api/resources/${rid}`).set(auth(c.mentorToken)).send({ startTime: new Date() });
  assert.equal(reopen.status, 409);
  const extend = await api().patch(`/api/resources/${rid}`).set(auth(c.mentorToken)).send({ endTime: new Date(Date.now() + 5 * DAY), title: 'Frozen (extended)' });
  assert.equal(extend.status, 200);
  const sneaky = await api().patch(`/api/resources/${rid}`).set(auth(c.mentorToken))
    .send({ questions: [{ questionText: 'new', options: ['a', 'b'], correctOptionIndex: 1 }] });
  assert.equal(sneaky.status, 200);
  const stored = await Quiz.findOne({ resource: rid }).lean();
  assert.deepEqual(stored.questions.map((x) => x.questionText), ['A', 'B']);
});

// ---------------- Video ----------------

test('video: completion persists, late penalty is 1 point per full day, no double scoring', async () => {
  const v = await api().post('/api/resources').set(auth(c.mentorToken)).send({
    title: 'Late video', type: 'video', url: 'https://youtu.be/late', program: c.program._id, maxScore: 30,
    deadline: new Date(Date.now() - 3 * DAY - HOUR),
  });
  const preview = await api().get(`/api/m/resources/${v.body._id}`).set(auth(c.menteeToken));
  assert.equal(preview.body.scoreIfCompletedNow, 27);
  assert.equal(preview.body.daysLate, 3);

  const done = await api().post(`/api/m/resources/${v.body._id}/complete`).set(auth(c.menteeToken));
  assert.equal(done.body.score, 27);
  const again = await api().post(`/api/m/resources/${v.body._id}/complete`).set(auth(c.menteeToken));
  assert.equal(again.body.alreadyCompleted, true);
  assert.equal(again.body.score, 27);

  const reread = await api().get(`/api/m/resources/${v.body._id}`).set(auth(c.menteeToken));
  assert.equal(reread.body.status, 'completed');
  assert.equal(reread.body.completion.score, 27);
  assert.equal(reread.body.completion.late, true);
});

// ---------------- Project ----------------

test('project: validation, optional live link, resubmit until reviewed, then final', async () => {
  const p = await api().post('/api/resources').set(auth(c.mentorToken))
    .send({ title: 'Capstone', type: 'project', program: c.program._id, maxScore: 100, deadline: new Date(Date.now() - DAY) });
  const pid = p.body._id;
  const url = `/api/m/resources/${pid}/project`;

  assert.equal((await api().post(url).set(auth(c.menteeToken)).send({ description: 'No repository link given here.' })).status, 400);
  assert.equal((await api().post(url).set(auth(c.menteeToken)).send({ githubLink: 'javascript:alert(1)', description: 'Bad protocol on the repo link.' })).status, 400);
  assert.equal((await api().post(url).set(auth(c.menteeToken)).send({ githubLink: 'https://github.com/a/b', description: 'short' })).status, 400);

  const first = await api().post(url).set(auth(c.menteeToken)).send({ githubLink: 'https://github.com/a/b', description: 'First version of the capstone, no live link yet.' });
  assert.equal(first.status, 200);
  assert.equal(first.body.late, true, 'submitted after the deadline is accepted and flagged');
  assert.equal(first.body.resubmitted, false);

  const second = await api().post(url).set(auth(c.menteeToken))
    .send({ githubLink: 'https://github.com/a/b2', deployedLink: 'https://b2.app', description: 'Second version, now deployed with tests.' });
  assert.equal(second.body.resubmitted, true);

  const pending = await api().get(`/api/m/resources/${pid}`).set(auth(c.menteeToken));
  assert.equal(pending.body.status, 'submitted');
  assert.equal(pending.body.completion.score, null, 'no score shown until reviewed');
  assert.equal(pending.body.completion.githubLink, 'https://github.com/a/b2');

  // Only this program's mentor may score it, and only with a valid number.
  assert.equal((await api().patch(`/api/${c.mentee._id}/resources/${pid}/verify`).set(auth(other.mentorToken)).send({ score: 90 })).status, 403);
  assert.equal((await api().patch(`/api/${c.mentee._id}/resources/${pid}/verify`).set(auth(c.mentorToken)).send({ score: -5 })).status, 400);
  assert.equal((await api().patch(`/api/${c.mentee._id}/resources/${pid}/verify`).set(auth(c.mentorToken)).send({ score: 'ninety' })).status, 400);
  assert.equal((await api().patch(`/api/${c.mentee._id}/resources/${pid}/verify`).set(auth(c.menteeToken)).send({ score: 100 })).status, 403);

  const verify = await api().patch(`/api/${c.mentee._id}/resources/${pid}/verify`).set(auth(c.mentorToken)).send({ score: 85, feedback: 'Solid. Add error handling.' });
  assert.equal(verify.body.finalScore, 85);
  assert.equal((await api().patch(`/api/${c.mentee._id}/resources/${pid}/verify`).set(auth(c.mentorToken)).send({ score: 100 })).status, 400, 'no double scoring');

  const reviewed = await api().get(`/api/m/resources/${pid}`).set(auth(c.menteeToken));
  assert.equal(reviewed.body.status, 'verified');
  assert.equal(reviewed.body.completion.score, 85);
  assert.equal(reviewed.body.completion.feedback, 'Solid. Add error handling.');

  const locked = await api().post(url).set(auth(c.menteeToken)).send({ githubLink: 'https://github.com/a/b3', description: 'Trying again after the review is done.' });
  assert.equal(locked.status, 409);

  const activity = await api().get('/api/m/activity').set(auth(c.menteeToken));
  const review = activity.body.find((e) => e.kind === 'project_reviewed' && e.title === 'Capstone');
  assert.equal(review.score, 85);
  assert.equal(review.feedback, 'Solid. Add error handling.');
  assert.ok(activity.body.some((e) => e.kind === 'project_submitted' && e.title === 'Capstone' && e.late));
  const times = activity.body.map((e) => new Date(e.at).getTime());
  assert.deepEqual(times, [...times].sort((a, b) => b - a), 'newest first');
});

// ---------------- Permissions ----------------

test('permissions: mentees only see their own program; roles are not interchangeable', async () => {
  const foreign = await api().post('/api/resources').set(auth(other.mentorToken))
    .send({ title: 'Theirs', type: 'video', url: 'https://x.io', program: other.program._id });
  assert.equal((await api().get(`/api/m/resources/${foreign.body._id}`).set(auth(c.menteeToken))).status, 403);
  assert.equal((await api().get(`/api/m/resources/${foreign.body._id}`)).status, 401);
  assert.equal((await api().get('/api/m/activity').set(auth(c.mentorToken))).status, 403);
  assert.equal((await api().get('/api/m/activity')).status, 401);
  assert.equal((await api().get('/api/unverified-projects').set(auth(c.menteeToken))).status, 403);
  assert.equal((await api().post('/api/resources/quiz').set(auth(c.menteeToken)).send(quizBody())).status, 403);
  assert.equal((await api().get('/api/m/resources/000000000000000000000000').set(auth(c.menteeToken))).status, 404);
});

// ---------------- Leaderboard ----------------

test('leaderboard formula: score, then who reached it first, then account order', () => {
  const t = (d) => new Date(Date.UTC(2026, 0, d));
  const m = (id, ...events) => ({ _id: id, completedResources: events.map(([score, day], i) => ({ resource: `r${id}${i}`, score, completedOn: t(day) })) });
  const rows = standings([
    m('a', [50, 5]),
    m('b', [30, 2], [20, 3]), // 50 too, reached on day 3: ahead of "a"
    m('c', [70, 9]),
    m('d'),                   // nothing yet
    m('e', [50, 5]),          // same score and time as "a": account order decides
  ], { at: t(20) });
  assert.deepEqual(rows.map((r) => [r.mentee._id, r.total, r.rank]), [['c', 70, 1], ['b', 50, 2], ['a', 50, 3], ['e', 50, 4], ['d', 0, 5]]);

  // A project scores from the moment it is reviewed, not when it was submitted.
  const proj = { _id: 'p', completedResources: [{ resource: 'x', score: 90, verified: true, submittedOn: t(1), completedOn: t(1), verifiedAt: t(10) }] };
  assert.equal(standings([proj], { at: t(5) })[0].total, 0);
  assert.equal(standings([proj], { at: t(11) })[0].total, 90);
});

test('leaderboard API: updates after grading, highlights by id, movement only with history', async () => {
  const fresh = await cohort({ programName: 'Rankings Lab' });
  const pid = fresh.program._id;
  const add = async (name) => {
    const r = await api().post('/api/mentees').set(auth(fresh.mentorToken)).send({ name, email: `${name}@rank.io`, programId: pid });
    return r.body.mentee;
  };
  const [x, y] = [await add('xavi'), await add('yara')];
  const video = await api().post('/api/resources').set(auth(fresh.mentorToken)).send({ title: 'V', type: 'video', url: 'https://v.io', program: pid, maxScore: 40 });

  // History: yara completed it 10 days ago; xavi today. Nobody else scored.
  await Mentee.updateOne({ _id: y._id }, { $push: { completedResources: { resource: video.body._id, score: 40, completedOn: new Date(Date.now() - 10 * DAY) } } });
  await Mentee.updateOne({ _id: x._id }, { $push: { completedResources: { resource: video.body._id, score: 40, completedOn: new Date() } } });

  const board = (await api().get(`/api/m/leaderboard?program=${pid}`)).body;
  const by = Object.fromEntries(board.map((r) => [r.name, r]));
  assert.equal(by.yara.rank, 1, 'same score, reached earlier');
  assert.equal(by.xavi.rank, 2);
  assert.equal(by.yara.movement, 0, 'was #1 a week ago, still #1');
  assert.equal(by.xavi.movement, null, 'no score a week ago: no movement shown');
  assert.equal(by['Mentee One'].movement, null);
  assert.equal(by.xavi.id, x._id);

  // A project review moves xavi up immediately.
  const proj = await api().post('/api/resources').set(auth(fresh.mentorToken)).send({ title: 'P', type: 'project', program: pid, maxScore: 100 });
  await Mentee.updateOne({ _id: x._id }, { $push: { completedResources: { resource: proj.body._id, githubLink: 'https://github.com/x/p', description: 'xavi project submission text', submittedOn: new Date(), completedOn: new Date(), score: 0, verified: false } } });
  const before = (await api().get(`/api/m/leaderboard?program=${pid}`)).body.find((r) => r.name === 'xavi');
  assert.equal(before.totalScore, 40, 'unreviewed project counts 0');
  await api().patch(`/api/${x._id}/resources/${proj.body._id}/verify`).set(auth(fresh.mentorToken)).send({ score: 70 });
  const afterBoard = (await api().get(`/api/m/leaderboard?program=${pid}`)).body;
  assert.equal(afterBoard[0].name, 'xavi');
  assert.equal(afterBoard[0].totalScore, 110);

  // Deterministic: identical reloads give identical order.
  const again = (await api().get(`/api/m/leaderboard?program=${pid}`)).body;
  assert.deepEqual(again.map((r) => r.id), afterBoard.map((r) => r.id));
});

test('dashboard rank agrees with the leaderboard', async () => {
  const dash = await api().get('/api/m/dashboard').set(auth(c.menteeToken));
  const board = (await api().get(`/api/m/leaderboard?program=${c.program._id}`)).body;
  const me = board.find((r) => r.id === c.mentee._id);
  assert.equal(dash.body.programs[0].standing.rank, me.rank);
  assert.equal(dash.body.programs[0].standing.score, me.totalScore);
});
