// Proves data survives a backend restart in persistent mode.
// Starts dev-persist on a fresh data dir, writes real data through the API,
// stops the process, starts it again on the same files, and reads it back.
// Usage: node scripts/persistence-check.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { DEMO } = require('./seed');

const PORT = 8131;
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = '.data/persistence-check';
const env = { ...process.env, PORT: String(PORT), MONGO_PORT: '27031', DATA_DIR, DISABLE_RATE_LIMIT: '1' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, url, body, token) {
  const res = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'x-auth-token': token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}
function start(label) {
  const child = spawn('node', ['scripts/dev-persist.js'], { cwd: path.join(__dirname, '..'), env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (d) => process.stdout.write(`   [${label}] ${d}`));
  child.stderr.on('data', (d) => process.stdout.write(`   [${label} err] ${d}`));
  return child;
}
async function waitHealthy() {
  for (let i = 0; i < 120; i++) {
    try { const h = await call('GET', '/api/health'); if (h.db === 'connected') return; } catch { /* starting */ }
    await sleep(500);
  }
  throw new Error('server did not become healthy');
}
const stop = (child) => new Promise((r) => { child.on('exit', r); child.kill('SIGTERM'); });

(async () => {
  fs.rmSync(path.join(__dirname, '..', DATA_DIR), { recursive: true, force: true });

  console.log('1. First boot on an empty data directory');
  let server = start('boot 1');
  await waitHealthy();

  const admin = await call('POST', '/api/admin/login', { email: DEMO.admin.email, password: DEMO.admin.password });
  const program = await call('POST', '/api/programs', { name: 'Persistence Check', code: 'PERS' }, admin.token);
  const mentor = await call('POST', '/api/mentors', { name: 'Persist Mentor', email: 'persist@techneeds.demo', programIds: [program._id] }, admin.token);
  const ml = await call('POST', '/api/mentors/login', { email: mentor.email, password: mentor.tempPassword });
  const added = await call('POST', '/api/mentees', { name: 'Persist Mentee', email: 'persist-mentee@techneeds.demo', programId: program._id }, ml.token);
  const quiz = await call('POST', '/api/resources/quiz', { title: 'Persist quiz', program: program._id, maxScore: 50, endTime: new Date(Date.now() + 86400000), questions: [{ questionText: '1+1', options: ['1', '2'], correctOptionIndex: 1 }] }, ml.token);
  const el = await call('POST', '/api/m/login', { enrollmentNumber: added.mentee.enrollmentNumber, password: added.tempPassword });
  const q = await call('GET', `/api/m/resources/${quiz.resource._id}/quiz`, null, el.token);
  const graded = await call('POST', `/api/m/resources/${quiz.resource._id}/quiz/submit`, { answers: [{ questionId: q.questions[0].id, selectedOptionIndex: 1 }] }, el.token);
  const before = await call('GET', '/api/stats');
  console.log(`   wrote: program ${program.code}, mentor, mentee ${added.mentee.enrollmentNumber}, quiz graded ${graded.score}/50`);
  console.log(`   stats before restart: ${JSON.stringify(before)}`);

  console.log('2. Stop the backend process (SIGTERM)');
  await stop(server);

  console.log('3. Second boot on the same data directory');
  server = start('boot 2');
  await waitHealthy();
  const after = await call('GET', '/api/stats');
  const again = await call('POST', '/api/m/login', { enrollmentNumber: added.mentee.enrollmentNumber, password: added.tempPassword });
  const dash = await call('GET', '/api/m/dashboard', null, again.token);
  const quizAfter = await call('GET', `/api/m/resources/${quiz.resource._id}/quiz`, null, again.token);
  const mentorAgain = await call('POST', '/api/mentors/login', { email: mentor.email, password: mentor.tempPassword });
  console.log(`   stats after restart:  ${JSON.stringify(after)}`);
  await stop(server);

  const checks = [
    ['counts identical after restart', JSON.stringify(before) === JSON.stringify(after)],
    ['generated mentee login still works', !!again.token],
    ['generated mentor login still works', !!mentorAgain.token],
    ['program still there', dash.programs.some((p) => p.code === 'PERS')],
    ['quiz attempt and score persisted', quizAfter.submission?.score === graded.score],
    ['mentee total persisted', dash.totalScore === graded.score],
    ['demo seed not re-run over existing data', after.programs === before.programs],
  ];
  console.log('');
  for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  const failed = checks.filter(([, ok]) => !ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} persistence checks passed`);
  fs.rmSync(path.join(__dirname, '..', DATA_DIR), { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
