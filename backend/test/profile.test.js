// Phase 5: AI profile engine, writers, runners and access.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, stopDb, api, auth } = require('./helpers');
const { seed, DEMO } = require('../scripts/seed');
const { menteeFacts, mentorFacts } = require('../services/profile/facts');
const { menteeBadges } = require('../services/profile/badges');
const { growthRings } = require('../services/profile/avatar');
const { rulesWriter, writeNarrative, validate, promptPayload, geminiWriter, claudeWriter } = require('../services/profile/writer');
const { runSnapshot } = require('../services/profile/generate');
const runner = require('../services/profile/runner');
const ProfileSnapshot = require('../models/ProfileSnapshot');

const DAY = 24 * 3600 * 1000;
const NOW = new Date('2026-03-20T12:00:00Z');
const d = (offset) => new Date(NOW.getTime() + offset * DAY);

// A small, hand-checkable world.
const R = {
  v1: { _id: 'v1', title: 'HTTP basics', type: 'video', tags: ['http'], maxScore: 40, deadline: d(-10) },
  q1: { _id: 'q1', title: 'JS quiz', type: 'quiz', tags: ['javascript'], maxScore: 100, deadline: d(-5) },
  p1: { _id: 'p1', title: 'Portfolio', type: 'project', tags: ['javascript', 'css'], maxScore: 200, deadline: d(-2) },
  q2: { _id: 'q2', title: 'Missed quiz', type: 'quiz', tags: ['css'], maxScore: 50, deadline: d(-1) },
  v2: { _id: 'v2', title: 'React intro', type: 'video', tags: ['react'], maxScore: 40, deadline: d(3) },
  p2: { _id: 'p2', title: 'Notes app', type: 'project', tags: ['react'], maxScore: 300, deadline: d(9) },
};
const resources = Object.values(R);
const mentee = {
  _id: 'm1', name: 'Aanya Gupta', email: 'aanya@x.io', enrollmentNumber: 'TN-WD26-001', streak: 4, interests: ['react', 'ui design'],
  completedResources: [
    { resource: 'v1', score: 37, completedOn: d(-7) },                                             // 3 days late
    { resource: 'q1', score: 75, completedOn: d(-6) },                                             // on time
    { resource: 'p1', score: 170, submittedOn: d(-3), completedOn: d(-3), verified: true, verifiedAt: d(-1), feedback: 'Add tests.' },
  ],
};
const facts = menteeFacts({ mentee, resources, quizSubs: [{ resource: 'q1', rawScore: 3, totalMarks: 4 }], standing: { rank: 2, of: 6, movement: 1 }, programs: [{ name: 'Web Development' }], now: NOW });

describe('facts', () => {
  test('points count only work that is done or already due', () => {
    // v1 40 + q1 100 + p1 200 + q2 50 (missed, due) = 390 available; v2/p2 are future.
    assert.deepEqual(facts.points, { earned: 282, available: 390, rate: 72 });
  });
  test('deadlines, quizzes and projects come from the records', () => {
    assert.equal(facts.deadlines.onTime, 2);
    assert.equal(facts.deadlines.late, 1);
    assert.equal(facts.deadlines.onTimeRate, 67);
    assert.equal(facts.deadlines.missedQuizzes, 1);
    assert.equal(facts.quizzes.avgAccuracy, 75);
    assert.equal(facts.projects.avgScore, 85);
    assert.equal(facts.feedback[0].text, 'Add tests.');
  });
  test('topic mastery = earned / available per tag, strongest and weakest', () => {
    const t = Object.fromEntries(facts.topics.map((x) => [x.topic, x.mastery]));
    assert.equal(t.http, 93);           // 37/40
    assert.equal(t.javascript, 82);     // (75+170)/(100+200)
    assert.equal(t.css, 68);            // 170/(200+50)
    assert.equal(t.react, undefined, 'future-only topics are not scored yet');
    assert.equal(facts.strongest.topic, 'http');
    assert.equal(facts.weakest.topic, 'css');
  });
  test('open work excludes closed quizzes and is soonest first', () => {
    assert.deepEqual(facts.open.map((o) => o.resourceId), ['v2', 'p2']);
    assert.deepEqual(facts.interestsCovered, []);
    assert.deepEqual(facts.interestsUncovered, ['react', 'ui design']);
  });
  test('mentor facts: review turnaround, feedback rate, pending, inactivity', () => {
    const mf = mentorFacts({
      mentor: { name: 'Ishita Malhotra', expertise: ['react'] },
      programs: [{ name: 'Web Development' }],
      resources,
      mentees: [
        { name: 'A', lastActiveDate: d(-1), completedResources: mentee.completedResources },
        { name: 'B', lastActiveDate: d(-20), completedResources: [{ resource: 'p1', githubLink: 'https://g', submittedOn: d(-4), completedOn: d(-4), score: 0, verified: false }] },
      ],
      now: NOW,
    });
    assert.equal(mf.reviews.done, 1);
    assert.equal(mf.reviews.medianTurnaroundHours, 48);
    assert.equal(mf.reviews.feedbackRate, 100);
    assert.equal(mf.reviews.pending, 1);
    assert.equal(mf.reviews.oldestPendingDays, 4);
    assert.deepEqual(mf.cohort.inactive.map((m) => m.name), ['B']);
  });
});

describe('badges and avatar', () => {
  test('every badge states its evidence', () => {
    const b = menteeBadges(facts);
    assert.ok(b.length >= 3);
    for (const x of b) assert.ok(x.because && /\d/.test(x.because), `${x.id} cites a number`);
    assert.ok(b.some((x) => x.id === 'reviewers-pick'), '85% project average');
    assert.ok(!b.some((x) => x.id === 'quiz-ace'), 'one 75% quiz is not an ace');
  });
  test('avatar is deterministic, data-driven and escapes topic names', () => {
    const rings = [{ label: 'react', value: 80 }, { label: '<script>x</script>', value: 40 }];
    const a = growthRings({ id: 'abc', name: 'Aanya Gupta', rings });
    assert.equal(a, growthRings({ id: 'abc', name: 'Aanya Gupta', rings }));
    assert.notEqual(a, growthRings({ id: 'abc', name: 'Aanya Gupta', rings: [{ label: 'react', value: 81 }, rings[1]] }));
    assert.notEqual(a, growthRings({ id: 'xyz', name: 'Aanya Gupta', rings }));
    assert.ok(!a.includes('<script>'));
    assert.match(a, /&lt;script&gt;/);
    assert.match(a, />AG</);
  });
  test('avatar draws a full ring at 100% and nothing at 0%', () => {
    const full = growthRings({ id: 'abc', name: 'A B', rings: [{ label: 'x', value: 100 }] });
    assert.match(full, /<circle[^>]*r="70"[^>]*stroke:var\(--accent\)/);
    assert.doesNotMatch(full, /<path/);
    const none = growthRings({ id: 'abc', name: 'A B', rings: [{ label: 'x', value: 0 }] });
    assert.doesNotMatch(none, /stroke:var\(--accent\)/);
  });
});

describe('writers', () => {
  test('rules writer cites facts and only recommends real open resources', () => {
    const n = rulesWriter(facts);
    assert.match(n.summary, /282 of 390/);
    assert.match(n.summary, /#2 of 6/);
    const ids = n.recommendations.map((r) => r.resourceId).filter(Boolean);
    assert.ok(ids.every((x) => ['v2', 'p2'].includes(x)));
    assert.ok(n.recommendations.some((r) => r.resourceId === 'v2' && /react/.test(r.why)), 'interest-aligned pick');
  });
  test('the LLM sees no email, enrollment number or surname', () => {
    const payload = JSON.stringify(promptPayload(facts));
    assert.doesNotMatch(payload, /aanya@x\.io|TN-WD26-001|Gupta/);
    assert.match(payload, /"firstName":"Aanya"/);
  });
  test('validation drops recommendations that point at invented resources', () => {
    const out = validate({ summary: 'ok', strengths: [], focus: [], recommendations: [
      { title: 'Real', why: 'x', resourceId: 'v2' }, { title: 'Invented', why: 'x', resourceId: 'zzz' }, { title: 'Advice', why: 'x', resourceId: null },
    ] }, facts);
    assert.deepEqual(out.narrative.recommendations.map((r) => r.title), ['Real', 'Advice']);
    assert.equal(out.droppedRecommendations, 1);
    assert.throws(() => validate({ summary: '', strengths: [], focus: [], recommendations: [] }, facts));
  });
  test('gemini adapter: parses JSON output and records the model', async () => {
    let sent;
    const fetchImpl = async (url, init) => {
      sent = { url, body: JSON.parse(init.body), key: init.headers['x-goog-api-key'] };
      return { ok: true, json: async () => ({ modelVersion: 'gemini-test', candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: 'You earned 282 of 390.', strengths: ['http 93%'], focus: ['css 68%'], recommendations: [{ title: 'React intro', why: 'interest', resourceId: 'v2' }] }) }] } }] }) };
    };
    const out = await geminiWriter(facts, { apiKey: 'k', model: 'gemini-test', fetchImpl });
    assert.equal(out.engine, 'gemini');
    assert.equal(out.model, 'gemini-test');
    assert.equal(sent.key, 'k');
    assert.equal(sent.body.generationConfig.responseMimeType, 'application/json');
    assert.equal(out.narrative.recommendations[0].resourceId, 'v2');
  });
  test('grounding check flags numbers that are not in the facts', () => {
    const { ungroundedNumbers } = require('../services/profile/writer');
    const ok = ungroundedNumbers({ summary: 'You earned 282 of 390 points and rank #2 of 6, 75% on quizzes.', strengths: ['css at 68%'], focus: [], recommendations: [] }, facts);
    assert.deepEqual(ok, []);
    // Numbers in field names count: activeDays14 -> "the last 14 days" (seen in a live Gemini run).
    assert.deepEqual(ungroundedNumbers({ summary: 'Active on more days in the last 14 days.', strengths: [], focus: [], recommendations: [] }, facts), []);
    const bad = ungroundedNumbers({ summary: 'You earned 999 points and rank #1.', strengths: [], focus: [], recommendations: [] }, facts);
    assert.ok(bad.includes('999'));
  });
  test('gemini adapter: tries the next model when one is overloaded, sends low thinking', async () => {
    const tried = [];
    const fetchImpl = async (url, init) => {
      const model = decodeURIComponent(url.split('/models/')[1].split(':')[0]);
      tried.push(model);
      assert.equal(JSON.parse(init.body).generationConfig.thinkingConfig.thinkingLevel, 'LOW');
      if (model === 'a') return { ok: false, status: 503, text: async () => 'overloaded' };
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"thinking"}', thought: true }, { text: JSON.stringify({ summary: 'ok', strengths: [], focus: [], recommendations: [] }) }] } }] }) };
    };
    const out = await geminiWriter(facts, { apiKey: 'k', models: ['a', 'b'], fetchImpl });
    assert.deepEqual(tried, ['a', 'b']);
    assert.equal(out.model, 'b');
    assert.match(out.attempts[0], /a 503/);
  });
  test('any LLM failure falls back to the rules engine and says why', async () => {
    const failing = async () => ({ ok: false, status: 503, text: async () => 'overloaded' });
    const g = await writeNarrative(facts, { engine: 'gemini', apiKey: 'k', fetchImpl: failing });
    assert.equal(g.engine, 'rules');
    assert.match(g.fallbackReason, /gemini unavailable: Gemini: .*503/);
    assert.match(g.narrative.summary, /282 of 390/);

    const refusing = { messages: { parse: async () => ({ stop_reason: 'refusal', stop_details: { category: 'test' }, parsed_output: null }) } };
    const c = await writeNarrative(facts, { engine: 'claude', client: refusing });
    assert.equal(c.engine, 'rules');
    assert.match(c.fallbackReason, /Claude declined \(test\)/);
  });
  test('claude adapter: uses structured output from the official SDK', async () => {
    let req;
    const client = { messages: { parse: async (r) => { req = r; return { stop_reason: 'end_turn', model: 'claude-opus-5-5', parsed_output: { summary: 'You earned 282 of 390 points.', strengths: [], focus: [], recommendations: [] } }; } } };
    const out = await claudeWriter(facts, { client });
    assert.equal(out.engine, 'claude');
    assert.equal(req.model, 'claude-opus-5-5');
    assert.equal(req.output_config.effort, 'low');
    assert.ok(req.output_config.format, 'structured output format set');
  });
});

describe('API and runners (seeded cohort)', () => {
  let creds; let aanya; let ishita; let nikita; let admin; let other;
  before(async () => {
    await startDb();
    creds = await seed();
    const login = (p, b) => api().post(p).send(b).then((r) => r.body);
    aanya = await login('/api/m/login', { enrollmentNumber: 'TN-WD26-001', password: DEMO.menteePassword });
    other = await login('/api/m/login', { enrollmentNumber: creds.mentees.find((m) => m.program !== 'Web Development').enrollmentNumber, password: DEMO.menteePassword });
    ishita = await login('/api/mentors/login', { email: 'ishita@techneeds.demo', password: DEMO.mentorPassword });
    nikita = await login('/api/mentors/login', { email: 'nikita@techneeds.demo', password: DEMO.mentorPassword });
    admin = await login('/api/admin/login', { email: DEMO.admin.email, password: DEMO.admin.password });
  });
  after(async () => { runner.__setRenderClient(undefined); await stopDb(); });

  const gen = (who, kind, id, body = {}) => api().post(`/api/profile/${kind}/${id}/generate`).set(auth(who.token)).send(body);

  test('mentee generates their own profile in-process; numbers match the dashboard', async () => {
    const r = await gen(aanya, 'mentee', aanya.mentee._id);
    assert.equal(r.status, 201);
    const s = r.body.snapshot;
    assert.equal(s.status, 'ready');
    assert.equal(s.runner, 'in-process');
    assert.equal(s.engine, 'rules');
    assert.match(s.avatarSvg, /^<svg/);
    assert.ok(s.badges.length >= 1);
    const dash = await api().get('/api/m/dashboard').set(auth(aanya.token));
    assert.equal(s.facts.points.earned, dash.body.totalScore);
    assert.equal(s.facts.standing.rank, dash.body.programs[0].standing.rank);
    const openIds = new Set(s.facts.open.map((o) => o.resourceId));
    assert.ok(s.narrative.recommendations.filter((x) => x.resourceId).every((x) => openIds.has(x.resourceId)));
  });

  test('regenerating without new activity reuses; new activity produces a new profile', async () => {
    const again = await gen(aanya, 'mentee', aanya.mentee._id);
    assert.equal(again.body.reused, true);
    // New activity: her mentor reviews the project she submitted.
    const queue = await api().get('/api/unverified-projects').set(auth(ishita.token));
    const mine = queue.body.unverifiedProjects.find((p) => p.menteeId === aanya.mentee._id);
    assert.ok(mine, 'seed leaves Aanya a project awaiting review');
    await api().patch(`/api/${aanya.mentee._id}/resources/${mine.resourceId}/verify`).set(auth(ishita.token)).send({ score: 180, feedback: 'Nice work.' });
    const fresh = await gen(aanya, 'mentee', aanya.mentee._id);
    assert.equal(fresh.body.reused, false);
    assert.notEqual(fresh.body.snapshot.id, again.body.snapshot.id);
    const forced = await gen(aanya, 'mentee', aanya.mentee._id, { force: true });
    assert.equal(forced.body.reused, false);
  });

  test('access: own mentor yes, other program no, peers no, admin yes', async () => {
    const id = aanya.mentee._id;
    assert.equal((await api().get(`/api/profile/mentee/${id}`).set(auth(ishita.token))).status, 200);
    assert.equal((await gen(ishita, 'mentee', id)).status < 300, true);
    assert.equal((await api().get(`/api/profile/mentee/${id}`).set(auth(nikita.token))).status, 403);
    assert.equal((await api().get(`/api/profile/mentee/${id}`).set(auth(other.token))).status, 403);
    assert.equal((await api().get(`/api/profile/mentee/${id}`)).status, 401);
    assert.equal((await api().get(`/api/profile/mentee/${id}`).set(auth(admin.token))).status, 200);
    // Mentees can view their own mentor's profile but not regenerate it.
    const mentorView = await api().get(`/api/profile/mentor/${ishita.mentor._id}`).set(auth(aanya.token));
    assert.equal(mentorView.status, 200);
    assert.equal(mentorView.body.canGenerate, false);
    assert.equal((await gen(aanya, 'mentor', ishita.mentor._id)).status, 403);
    assert.equal((await api().get(`/api/profile/mentor/${nikita.mentor._id}`).set(auth(aanya.token))).status, 403);
  });

  test('mentor profile: reviews and cohort facts', async () => {
    const r = await gen(ishita, 'mentor', ishita.mentor._id);
    assert.equal(r.body.snapshot.status, 'ready');
    const f = r.body.snapshot.facts;
    assert.equal(f.kind, 'mentor');
    assert.equal(f.mentees, 6);
    assert.ok(f.reviews.done >= 1);
    assert.ok(f.published.total >= 9);
  });

  test('render workflow runner: queue, task run, poll, ready', async () => {
    process.env.RENDER_WORKFLOW_SLUG = 'techneeds-workflows';
    process.env.RENDER_USE_LOCAL_DEV = 'true';
    let started;
    let runStatus = 'running';
    runner.__setRenderClient({ workflows: {
      startTask: async (slug, input, opts) => { started = { slug, input, opts }; return { taskRunId: 'trn-local-1' }; },
      getTaskRun: async () => ({ status: runStatus }),
    } });
    try {
      const r = await gen(admin, 'mentee', aanya.mentee._id, { force: true });
      assert.equal(r.status, 202);
      const s = r.body.snapshot;
      assert.equal(s.runner, 'render-workflow');
      assert.equal(s.status, 'queued');
      assert.equal(s.runId, 'trn-local-1');
      assert.equal(started.slug, 'techneeds-workflows/generateProfile');
      assert.deepEqual(started.input, [String(s.id)]);
      assert.equal(started.opts.idempotencyKey, `profile-${s.id}`);

      const polling = await api().get(`/api/profile/jobs/${s.id}`).set(auth(aanya.token));
      assert.equal(polling.body.status, 'queued');

      // What workflows/main.js does inside the task run:
      await runSnapshot(s.id, { runner: 'render-workflow' });
      runStatus = 'succeeded';
      const done = await api().get(`/api/profile/jobs/${s.id}`).set(auth(aanya.token));
      assert.equal(done.body.status, 'ready');
      assert.equal(done.body.runner, 'render-workflow');
      assert.ok(done.body.narrative.summary);
    } finally {
      delete process.env.RENDER_WORKFLOW_SLUG;
      delete process.env.RENDER_USE_LOCAL_DEV;
    }
  });

  test('render workflow failures fall back to in-process and say why', async () => {
    process.env.RENDER_WORKFLOW_SLUG = 'techneeds-workflows';
    process.env.RENDER_USE_LOCAL_DEV = 'true';
    try {
      runner.__setRenderClient({ workflows: { startTask: async () => { throw new Error('task server not running'); }, getTaskRun: async () => ({}) } });
      const a = await gen(admin, 'mentee', aanya.mentee._id, { force: true });
      assert.equal(a.body.snapshot.status, 'ready');
      assert.equal(a.body.snapshot.runner, 'in-process');
      assert.match(a.body.snapshot.workflowError, /task server not running/);

      runner.__setRenderClient({ workflows: { startTask: async () => ({ taskRunId: 'trn-fails' }), getTaskRun: async () => ({ status: 'failed', error: 'boom' }) } });
      const b = await gen(admin, 'mentee', aanya.mentee._id, { force: true });
      assert.equal(b.body.snapshot.status, 'queued');
      const polled = await api().get(`/api/profile/jobs/${b.body.snapshot.id}`).set(auth(admin.token));
      assert.equal(polled.body.status, 'ready');
      assert.equal(polled.body.runner, 'in-process');
      assert.match(polled.body.workflowError, /failed: boom/);
    } finally {
      delete process.env.RENDER_WORKFLOW_SLUG;
      delete process.env.RENDER_USE_LOCAL_DEV;
    }
  });

  test('GET returns the latest ready profile and the pipeline in use', async () => {
    const r = await api().get(`/api/profile/mentee/${aanya.mentee._id}`).set(auth(aanya.token));
    assert.equal(r.body.latest.status, 'ready');
    assert.equal(r.body.canGenerate, true);
    assert.deepEqual(r.body.pipeline, { runner: 'in-process', engine: 'rules', local: false });
    assert.ok(await ProfileSnapshot.countDocuments() >= 5, 'history kept');
  });
});
