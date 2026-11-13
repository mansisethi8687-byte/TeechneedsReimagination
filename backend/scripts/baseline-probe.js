// Phase 0 probe: drives the UNMODIFIED upstream API against a throwaway
// in-memory MongoDB and records which documented flows actually work.
// Usage: node scripts/baseline-probe.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

async function call(method, url, body, token) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-auth-token': token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data };
}

(async () => {
  const mongo = await MongoMemoryServer.create();
  const server = spawn('node', ['index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, MONGO_URI: mongo.getUri() + 'probe', JWT_SECRET: 'probe-secret', PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve) => server.stdout.on('data', (d) => d.toString().includes('MongoDB Connected') && resolve()));

  try {
    // Admin flow (no auth exists on these routes)
    const program = await call('POST', '/api/programs', { name: 'Web Dev Cohort' });
    record('Admin: create program', program.status === 201);
    const mentor = await call('POST', '/api/mentors', { name: 'M', email: 'm@x.io', password: 'pw12345' });
    record('Admin: create mentor (admin types the password)', mentor.status === 201);
    record('Admin routes require no authentication', true, 'POST /api/programs and /api/mentors succeeded with no token');
    record('Mentor password hash returned in response body', !!mentor.data?.password, 'bcrypt hash leaked in JSON');
    const assign = await call('POST', `/api/programs/${program.data._id}/add-mentor`, { mentorId: mentor.data._id });
    record('Admin: assign mentor to program', assign.status === 200);

    // Mentor flow
    const login = await call('POST', '/api/mentors/login', { email: 'm@x.io', password: 'pw12345' });
    record('Mentor: login', login.status === 200 && !!login.data.token);
    const mt = login.data.token;
    const mentee = await call('POST', '/api/mentees', { email: 'e@x.io', name: 'E', enrollmentNumber: 'ENR1', programId: program.data._id }, mt);
    record('Mentor: add mentee', mentee.status === 201);
    record('Enrollment number auto-generated', false, 'mentor must type enrollmentNumber; server never generates one');
    record('Mentee password stored in plaintext', mentee.data?.mentee?.password === mentee.data?.tempPassword, 'password field equals tempPassword');
    const dupe = await call('POST', '/api/mentees', { email: 'other@x.io', name: 'E2', enrollmentNumber: 'ENR1', programId: program.data._id }, mt);
    record('Duplicate enrollment number rejected', dupe.status >= 400, `status ${dupe.status} (unique index is on email+enrollment pair)`);

    const video = await call('POST', '/api/resources', { title: 'Intro video', type: 'video', url: 'https://youtu.be/x', program: program.data._id, maxScore: 50 }, mt);
    record('Mentor: post video resource', video.status === 201);
    const project = await call('POST', '/api/resources', { title: 'Portfolio', type: 'project', url: 'https://brief', program: program.data._id, maxScore: 200 }, mt);
    record('Mentor: post project resource', project.status === 201);
    const now = Date.now();
    const quiz = await call('POST', '/api/resources/quiz', {
      title: 'JS basics', program: program.data._id, maxScore: 2,
      startTime: new Date(now - 60000), endTime: new Date(now + 3600000),
      questions: [{ questionText: '1+1', options: ['1', '2'], correctOptionIndex: 1, marks: 2 }],
    }, mt);
    record('Mentor: post quiz', quiz.status === 201);
    record('Quiz created locked with no unlock endpoint', quiz.data?.resource?.isLocked === true, 'isLocked:true hard-coded; no route flips it');

    const noProgram = await call('POST', '/api/resources', { title: 'x', type: 'video', program: '000000000000000000000000' }, mt);
    record('Unknown program returns 404', noProgram.status === 404, `status ${noProgram.status}`);

    // Mentee flow
    const ml = await call('POST', '/api/m/login', { enrollmentNumber: 'ENR1', password: mentee.data.tempPassword });
    record('Mentee: login with enrollment + password', ml.status === 200);
    const et = ml.data.token;
    const dash = await call('GET', '/api/m/dashboard', null, et);
    record('Mentee: dashboard loads', dash.status === 200, `rank ${dash.data?.rank}, ${dash.data?.programs?.[0]?.resources?.length} resources`);

    const vComplete = await call('POST', `/api/m/resources/${video.data._id}/complete`, {}, et);
    record('Mentee: complete video', vComplete.status === 200, `score ${vComplete.data?.score}`);
    const pShortcut = await call('POST', `/api/m/resources/${project.data._id}/complete`, {}, et);
    record('Project can be "completed" without submission for full score', pShortcut.status === 200, `score ${pShortcut.data?.score} with no GitHub link`);

    const q = await call('GET', `/api/m/resources/${quiz.data.resource._id}/quiz`, null, et);
    const qs = await call('POST', `/api/m/resources/${quiz.data.resource._id}/quiz/submit`, { answers: [{ questionId: q.data?.questions?.[0]?.id, selectedOptionIndex: 1 }] }, et);
    record('Mentee: submit quiz', qs.status === 200, `status ${qs.status} ${qs.data?.error || ''}`);

    const sub = await call('POST', `/api/m/resources/${project.data._id}/project`, { githubLink: 'https://github.com/a/b', deployedLink: 'https://b.app', description: 'd' }, et);
    record('Mentee: submit project (API)', sub.status === 200);
    const unv = await call('GET', '/api/unverified-projects', null, mt);
    record('Mentor: list unverified projects', unv.status === 200, `${unv.data?.unverifiedProjects?.length} pending`);
    const ver = await call('PATCH', `/api/${mentee.data.mentee._id}/resources/${project.data._id}/verify`, { score: 150 }, mt);
    record('Mentor: verify project with score', ver.status === 200, `finalScore ${ver.data?.finalScore}`);

    const lb = await call('GET', '/api/m/leaderboard');
    record('Public leaderboard', lb.status === 200, JSON.stringify(lb.data?.map((r) => [r.rank, r.name, r.totalScore])));

    const leak = await call('GET', `/api/${program.data._id}/mentees`);
    record('Program mentee list (with passwords) readable without auth', leak.status === 200 && !!leak.data?.[0]?.password, 'GET /api/:programId/mentees has no auth');
    const me = await call('GET', '/api/mentors/me', null, mt);
    record('GET /api/mentors/me exists (called by lib/api.js)', me.status === 200, `status ${me.status}`);
  } catch (e) {
    record('probe crashed', false, e.stack);
  } finally {
    server.kill();
    await mongo.stop();
    const fails = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length} checks, ${results.length - fails} pass, ${fails} fail`);
  }
})();
