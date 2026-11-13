// Walks the demo script against a running API (local dev:mem or deployed).
// Usage: API_URL=http://localhost:8000 node scripts/smoke.js
// Uses the seeded demo credentials from scripts/seed.js. Creates one extra
// program, mentor and mentee, so run it against demo data only.
const { DEMO } = require('./seed');

const BASE = process.env.API_URL || 'http://localhost:8000';
let step = 0;

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-auth-token': token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}
const log = (msg) => console.log(`${String(++step).padStart(2)}. ${msg}`);

(async () => {
  const health = await call('GET', '/api/health');
  log(`health: db ${health.db}`);
  const stats = await call('GET', '/api/stats');
  log(`public stats: ${stats.programs} programs, ${stats.mentees} mentees, ${stats.completions} completions`);

  const admin = await call('POST', '/api/admin/login', { email: DEMO.admin.email, password: DEMO.admin.password });
  log(`admin signed in as ${admin.admin.email}`);
  const tag = Date.now().toString(36).slice(-4).toUpperCase();
  const program = await call('POST', '/api/programs', { name: `Smoke Cohort ${tag}`, code: `SM${tag.slice(0, 3)}` }, admin.token);
  log(`admin created program "${program.name}" (code ${program.code})`);
  const mentor = await call('POST', '/api/mentors', { name: 'Smoke Mentor', email: `smoke-${tag}@techneeds.demo`, programIds: [program._id] }, admin.token);
  log(`admin onboarded mentor; generated password length ${mentor.tempPassword.length}`);

  const ml = await call('POST', '/api/mentors/login', { email: mentor.email, password: mentor.tempPassword });
  log('mentor signed in with the generated password');
  const added = await call('POST', '/api/mentees', { name: 'Smoke Mentee', email: `smoke-mentee-${tag}@techneeds.demo`, programId: program._id }, ml.token);
  log(`mentor added mentee; enrollment number ${added.mentee.enrollmentNumber}`);
  const video = await call('POST', '/api/resources', { title: 'Smoke video', type: 'video', url: 'https://example.com/v', program: program._id, maxScore: 20, deadline: new Date(Date.now() + 86400000) }, ml.token);
  const quiz = await call('POST', '/api/resources/quiz', {
    title: 'Smoke quiz', program: program._id, maxScore: 50, endTime: new Date(Date.now() + 3600000),
    questions: [{ questionText: '2+2', options: ['3', '4'], correctOptionIndex: 1 }, { questionText: '3+3', options: ['6', '7'], correctOptionIndex: 0 }],
  }, ml.token);
  const project = await call('POST', '/api/resources', { title: 'Smoke project', type: 'project', url: 'https://example.com/p', program: program._id, maxScore: 100 }, ml.token);
  log('mentor published a video, a quiz and a project with deadlines and max scores');

  const el = await call('POST', '/api/m/login', { enrollmentNumber: added.mentee.enrollmentNumber, password: added.tempPassword });
  log('mentee signed in with enrollment number + generated password');
  await call('POST', `/api/m/resources/${video._id}/complete`, null, el.token);
  const q = await call('GET', `/api/m/resources/${quiz.resource._id}/quiz`, null, el.token);
  const qr = await call('POST', `/api/m/resources/${quiz.resource._id}/quiz/submit`, { answers: [{ questionId: q.questions[0].id, selectedOptionIndex: 1 }, { questionId: q.questions[1].id, selectedOptionIndex: 1 }] }, el.token);
  log(`mentee completed the video and scored ${qr.score}/${qr.maxScore} on the quiz (${qr.correct}/${qr.questions} correct)`);
  await call('POST', `/api/m/resources/${project._id}/project`, { githubLink: 'https://github.com/smoke/p', deployedLink: 'https://smoke.example', description: 'Smoke submission' }, el.token);
  log('mentee submitted the project');

  const queue = await call('GET', '/api/unverified-projects', null, ml.token);
  const v = await call('PATCH', `/api/${added.mentee._id}/resources/${project._id}/verify`, { score: 85, feedback: 'Nice' }, ml.token);
  log(`mentor saw ${queue.unverifiedProjects.length} in the review queue and scored it ${v.finalScore}`);

  const dash = await call('GET', '/api/m/dashboard', null, el.token);
  const board = await call('GET', `/api/m/leaderboard?program=${program._id}`);
  log(`mentee dashboard total ${dash.totalScore}, streak ${dash.streak}; program leaderboard #1 is ${board[0].name} with ${board[0].totalScore}`);

  const seeded = await call('GET', '/api/m/leaderboard?limit=3');
  log(`global top 3: ${seeded.map((r) => `${r.name} ${r.totalScore}`).join(', ')}`);
  console.log(`\nSmoke passed against ${BASE}`);
})().catch((err) => {
  console.error(`\nSmoke FAILED at step ${step + 1}: ${err.message}`);
  process.exit(1);
});
