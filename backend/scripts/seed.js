// Demo cohort with realistic history, so every panel has something true to show.
// Usage:  node scripts/seed.js            (refuses if data exists)
//         node scripts/seed.js --reset    (wipes the TechNeeds collections first)
// The demo credentials below are test values for this app only.
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Mentor = require('../models/Mentor');
const Mentee = require('../models/Mentee');
const Program = require('../models/Program');
const Resource = require('../models/Resource');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const Counter = require('../models/Counter');
const { hashPassword } = require('../services/credentials');
const { gradeQuiz, recomputeTotal, DAY } = require('../services/scoring');

const DEMO = {
  admin: { name: 'TechNeeds Core Team', email: 'admin@techneeds.demo', password: 'techneeds-admin-demo' },
  mentorPassword: 'mentor-demo-2026',
  menteePassword: 'mentee-demo-2026',
};

const now = Date.now();
const at = (days, hours = 0) => new Date(now + days * DAY + hours * 3600 * 1000);

// Deterministic pseudo-random so the demo looks the same every time.
let s = 42;
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);

const PROGRAMS = [
  {
    name: 'Web Development', code: 'WD', description: 'Eight weeks from HTML to a deployed full-stack app.',
    mentors: [{ name: 'Ishita Malhotra', email: 'ishita@techneeds.demo', expertise: ['react', 'node', 'system design'] }],
    mentees: [
      ['Aanya Gupta', ['react', 'ui design']], ['Kavya Reddy', ['backend', 'databases']],
      ['Meher Kaur', ['react', 'animation']], ['Riya Sharma', ['devops', 'cloud']],
      ['Sana Qureshi', ['javascript', 'testing']], ['Tanvi Joshi', ['ui design', 'accessibility']],
    ],
    resources: [
      { type: 'video', title: 'How the web works: DNS, HTTP, browsers', tags: ['http', 'fundamentals'], due: -18, max: 30 },
      { type: 'video', title: 'Semantic HTML and accessible forms', tags: ['html', 'accessibility'], due: -15, max: 30 },
      { type: 'quiz', title: 'HTML & CSS checkpoint', tags: ['html', 'css'], due: -12, max: 100, questions: [
        ['Which element is best for a page’s primary navigation?', ['<div class="nav">', '<nav>', '<menu>', '<header>'], 1],
        ['What does `box-sizing: border-box` include in an element’s width?', ['Only content', 'Content and padding', 'Content, padding and border', 'Content, padding, border and margin'], 2],
        ['Which unit is relative to the root font size?', ['em', 'rem', 'vh', '%'], 1],
        ['Flexbox: which property aligns items on the cross axis?', ['justify-content', 'align-items', 'flex-direction', 'gap'], 1],
      ] },
      { type: 'video', title: 'JavaScript: closures, scope and the event loop', tags: ['javascript'], due: -9, max: 40 },
      { type: 'quiz', title: 'JavaScript fundamentals', tags: ['javascript'], due: -5, max: 100, questions: [
        ['`typeof null` returns…', ['"null"', '"object"', '"undefined"', '"number"'], 1],
        ['`[1,2,3].map(n => n * 2)` returns…', ['[2,4,6]', '[1,2,3]', '6', 'undefined'], 0],
        ['Which runs first?', ['setTimeout(fn, 0)', 'Promise.resolve().then(fn)', 'They run together', 'Depends on the browser'], 1],
        ['`const` prevents…', ['Mutating objects', 'Reassigning the binding', 'Both', 'Neither'], 1],
        ['`"2" + 2` is…', ['4', '"22"', 'NaN', 'TypeError'], 1],
      ] },
      { type: 'project', title: 'Personal portfolio, deployed', tags: ['html', 'css', 'deployment'], due: -1, max: 200 },
      { type: 'video', title: 'React components, props and state', tags: ['react'], due: 2, max: 40 },
      { type: 'quiz', title: 'React mental model', tags: ['react'], due: 4, max: 100, open: true, questions: [
        ['When does a component re-render?', ['Only on mount', 'When its state or props change', 'Every second', 'Only when the parent unmounts'], 1],
        ['Which hook runs side effects?', ['useMemo', 'useEffect', 'useRef', 'useId'], 1],
        ['Keys in a list should be…', ['Array indexes always', 'Stable and unique among siblings', 'Random each render', 'Optional'], 1],
      ] },
      { type: 'project', title: 'Full-stack notes app with auth', tags: ['react', 'node', 'databases'], due: 10, max: 300 },
    ],
  },
  {
    name: 'Data Structures & Algorithms', code: 'DSA', description: 'Problem solving for interviews, one pattern a week.',
    mentors: [{ name: 'Nikita Bansal', email: 'nikita@techneeds.demo', expertise: ['algorithms', 'c++', 'java'] }],
    mentees: [
      ['Diya Mehta', ['algorithms', 'competitive programming']], ['Ira Singh', ['java', 'interviews']],
      ['Pooja Verma', ['c++', 'graphs']], ['Zoya Khan', ['python', 'dynamic programming']],
    ],
    resources: [
      { type: 'video', title: 'Big-O without the hand-waving', tags: ['complexity'], due: -14, max: 30 },
      { type: 'quiz', title: 'Arrays and two pointers', tags: ['arrays', 'two pointers'], due: -8, max: 100, questions: [
        ['Time to find a pair summing to k in a sorted array with two pointers?', ['O(n²)', 'O(n log n)', 'O(n)', 'O(1)'], 2],
        ['Best structure for O(1) average lookup?', ['Array', 'Hash map', 'Linked list', 'Heap'], 1],
        ['Sliding window suits…', ['Contiguous subarray problems', 'Tree traversal', 'Sorting', 'Graph colouring'], 0],
      ] },
      { type: 'project', title: 'Implement an LRU cache with tests', tags: ['hashing', 'linked lists'], due: -1, max: 150 },
      { type: 'video', title: 'Recursion to dynamic programming', tags: ['dynamic programming', 'recursion'], due: 3, max: 40 },
      { type: 'quiz', title: 'Graphs: BFS and DFS', tags: ['graphs'], due: 6, max: 100, open: true, questions: [
        ['Shortest path in an unweighted graph?', ['DFS', 'BFS', 'Dijkstra only', 'Topological sort'], 1],
        ['Detecting a cycle in a directed graph uses…', ['Visited set only', 'Recursion stack / colours', 'Union-find only', 'Sorting'], 1],
      ] },
    ],
  },
];

// Each mentee gets a "diligence" profile, so the leaderboard and AI profiles differ.
const DILIGENCE = [0.95, 0.85, 0.7, 0.55, 0.9, 0.4, 0.8, 0.65, 0.5, 0.75];

async function seed({ reset = false } = {}) {
  const existing = await Promise.all([Program, Mentor, Mentee].map((m) => m.estimatedDocumentCount()));
  if (existing.some((n) => n > 0)) {
    if (!reset) throw new Error('Database already has data. Re-run with --reset to wipe and reseed.');
    await Promise.all([Admin, Mentor, Mentee, Program, Resource, Quiz, QuizSubmission, Counter].map((m) => m.deleteMany({})));
  }

  await Admin.create({ ...DEMO.admin, password: await hashPassword(DEMO.admin.password) });
  const mentorHash = await hashPassword(DEMO.mentorPassword);
  const menteeHash = await hashPassword(DEMO.menteePassword);
  const credentials = { admin: DEMO.admin, mentors: [], mentees: [] };
  let menteeIndex = 0;

  for (const spec of PROGRAMS) {
    const program = await Program.create({
      name: spec.name, code: spec.code, description: spec.description,
      startDate: at(-21), endDate: at(35), createdAt: at(-21),
    });
    const mentors = await Mentor.insertMany(spec.mentors.map((m) => ({ ...m, password: mentorHash, programs: [program._id] })));
    program.mentors = mentors.map((m) => m._id);
    credentials.mentors.push(...spec.mentors.map((m) => ({ email: m.email, password: DEMO.mentorPassword, program: spec.name })));

    const resources = [];
    for (const r of spec.resources) {
      const deadline = at(r.due);
      const resource = await Resource.create({
        title: r.title, type: r.type, tags: r.tags, maxScore: r.max, deadline, program: program._id,
        addedBy: mentors[0]._id, url: r.type === 'quiz' ? undefined : `https://techneeds.demo/${r.type}/${r.tags[0].replace(/\s+/g, '-')}`,
        description: r.type === 'project' ? 'Submit a public GitHub repo and a live link. Explain your decisions in the description.' : undefined,
        createdAt: at(r.due - 7),
      });
      if (r.type === 'quiz') {
        const quiz = await Quiz.create({
          resource: resource._id,
          questions: r.questions.map(([questionText, options, correctOptionIndex]) => ({ questionText, options, correctOptionIndex, marks: 1 })),
          startTime: at(r.due - 6), endTime: deadline, revealScores: true,
        });
        resource.quiz = quiz._id;
        await resource.save();
        resource._quiz = quiz;
      }
      resources.push(resource);
    }
    program.resources = resources.map((r) => r._id);
    await program.save();

    for (const [name, interests] of spec.mentees) {
      const seq = spec.mentees.findIndex((m) => m[0] === name) + 1;
      const enrollmentNumber = `TN-${spec.code}${String(new Date().getFullYear()).slice(-2)}-${String(seq).padStart(3, '0')}`;
      const diligence = DILIGENCE[menteeIndex++ % DILIGENCE.length];
      const mentee = new Mentee({
        name, email: `${name.split(' ')[0].toLowerCase()}@techneeds.demo`, enrollmentNumber,
        password: menteeHash, programs: [program._id], createdBy: mentors[0]._id, interests,
      });

      const activeDays = new Set();
      for (const [i, resource] of resources.entries()) {
        const spec_r = spec.resources[i];
        const isPast = resource.deadline.getTime() < now;
        // Future items: diligent mentees have started some of them.
        if (!isPast && (spec_r.type !== 'video' || rand() > diligence * 0.8)) continue;
        if (isPast && rand() > diligence + 0.1) continue;

        const lateDays = rand() > diligence ? Math.ceil(rand() * 2) : 0;
        const when = new Date(Math.min(now - 3600 * 1000, resource.deadline.getTime() - (lateDays ? -lateDays * DAY : rand() * 3 * DAY)));
        activeDays.add(when.toDateString());

        if (resource.type === 'video') {
          mentee.completedResources.push({ resource: resource._id, score: Math.max(0, resource.maxScore - lateDays), completedOn: when });
        } else if (resource.type === 'quiz') {
          const quiz = resource._quiz;
          const answers = quiz.questions.map((q, qi) => ({
            questionIndex: qi,
            selectedOptionIndex: rand() < diligence ? q.correctOptionIndex : (q.correctOptionIndex + 1) % q.options.length,
          }));
          const graded = gradeQuiz(quiz, answers, resource.maxScore);
          await QuizSubmission.create({
            quiz: quiz._id, resource: resource._id, mentee: mentee._id, answers: graded.answers,
            score: graded.score, rawScore: graded.raw, totalMarks: graded.totalMarks, submittedAt: when,
          });
          mentee.completedResources.push({ resource: resource._id, score: graded.score, completedOn: when });
        } else {
          const handle = name.split(' ')[0].toLowerCase();
          // Older projects are reviewed; recent ones alternate so each mentor has a review queue.
          resource._submissions = (resource._submissions || 0) + 1;
          const verified = resource.deadline.getTime() < now - 1.5 * DAY || resource._submissions % 2 === 0;
          mentee.completedResources.push({
            resource: resource._id, completedOn: when, submittedOn: when,
            githubLink: `https://github.com/${handle}-dev/${resource.tags[0].replace(/\s+/g, '-')}`,
            deployedLink: `https://${handle}-${resource.tags[0].replace(/\s+/g, '')}.vercel.app`,
            description: `Built with ${resource.tags.join(', ')}. README covers setup, trade-offs and what I would do next.`,
            verified,
            score: verified ? Math.round(resource.maxScore * (0.55 + diligence * 0.4)) : 0,
            verifiedAt: verified ? new Date(when.getTime() + DAY) : undefined,
            feedback: verified ? (diligence > 0.8 ? 'Clear structure and good commit history. Add a few tests next time.' : 'Works, but the README needs setup steps and the layout breaks on mobile.') : undefined,
          });
        }
      }

      // Streak: consecutive active days ending today or yesterday.
      if (diligence > 0.6) {
        const run = Math.round(diligence * 6);
        for (let d = 0; d < run; d++) activeDays.add(new Date(now - d * DAY).toDateString());
      }
      let streak = 0;
      for (let d = 0; activeDays.has(new Date(now - d * DAY).toDateString()); d++) streak++;
      mentee.streak = streak;
      const last = [...activeDays].map((x) => new Date(x)).sort((a, b) => b - a)[0];
      mentee.lastActiveDate = streak ? new Date(now - 3600 * 1000) : last;
      recomputeTotal(mentee);
      await mentee.save();
      credentials.mentees.push({ name, enrollmentNumber, password: DEMO.menteePassword, program: spec.name });
    }

    await Counter.findByIdAndUpdate(`enrollment:${program._id}`, { seq: spec.mentees.length }, { upsert: true });
  }

  return credentials;
}

module.exports = { seed, DEMO };

if (require.main === module) {
  const { env, assertRuntimeEnv } = require('../config/env');
  assertRuntimeEnv();
  (async () => {
    await mongoose.connect(env.MONGO_URI);
    const creds = await seed({ reset: process.argv.includes('--reset') });
    console.log('Seeded demo cohort.');
    console.log(`Admin   ${creds.admin.email} / ${creds.admin.password}`);
    for (const m of creds.mentors) console.log(`Mentor  ${m.email} / ${m.password}  (${m.program})`);
    for (const m of creds.mentees.slice(0, 3)) console.log(`Mentee  ${m.enrollmentNumber} / ${m.password}  ${m.name}`);
    console.log(`        …and ${creds.mentees.length - 3} more mentees, same password.`);
    await mongoose.disconnect();
  })().catch(async (err) => {
    console.error(err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
}
