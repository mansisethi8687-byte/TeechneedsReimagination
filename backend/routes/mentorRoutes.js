// Upstream paths are all kept. What changed behind them is noted per route.
const express = require('express');
const Mentor = require('../models/Mentor');
const Program = require('../models/Program');
const Resource = require('../models/Resource');
const Mentee = require('../models/Mentee');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const { authenticate } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { HttpError, notFound } = require('../middleware/errors');
const {
  generatePassword, hashPassword, verifyPassword, signToken, deriveProgramCode, nextEnrollmentNumber,
} = require('../services/credentials');
const { requireProgramStaff, requireProgramMember, loadResource, ids } = require('../services/access');
const { recomputeTotal, findCompletion } = require('../services/scoring');
const v = require('../services/validate');

const router = express.Router();
const admin = authenticate('admin');
const mentor = authenticate('mentor');
const staff = authenticate('admin', 'mentor');
const anyRole = authenticate('admin', 'mentor', 'mentee');

// ---------- Mentors ----------

// Create mentor. Changed: admin only; the server generates the password and
// returns it once as `tempPassword` (a supplied password is still accepted).
router.post('/mentors', admin, async (req, res) => {
  const b = req.body || {};
  const name = v.text(b.name, 'name', { required: true, max: 80 });
  const email = v.email(b.email);
  const tempPassword = b.password ? v.text(b.password, 'password', { max: 128 }) : generatePassword();
  if (tempPassword.length < 8) throw new HttpError(400, 'password must be at least 8 characters');

  const programIds = Array.isArray(b.programIds) ? b.programIds : b.programId ? [b.programId] : [];
  const programs = programIds.length ? await Program.find({ _id: { $in: programIds } }) : [];
  if (programs.length !== programIds.length) throw notFound('Program');

  const created = await Mentor.create({
    name, email: email, password: await hashPassword(tempPassword),
    programs: programs.map((p) => p._id),
    expertise: v.tags(b.expertise, 'expertise'),
  });
  if (programs.length) {
    await Program.updateMany({ _id: { $in: programs.map((p) => p._id) } }, { $addToSet: { mentors: created._id } });
  }
  res.status(201).json({ ...created.toJSON(), mentor: created, tempPassword });
});

// Changed: admin only, password hashes no longer returned.
router.get('/mentors', admin, async (req, res) => {
  res.json(await Mentor.find().sort({ createdAt: -1 }).populate('programs', 'name code'));
});

// New: lib/api.js upstream already called this route; it did not exist.
router.get('/mentors/me', mentor, async (req, res) => {
  res.json(await Mentor.findById(req.mentor._id).populate('programs', 'name code description'));
});

router.patch('/mentors/me', mentor, async (req, res) => {
  const b = req.body || {};
  const update = v.defined({ bio: v.text(b.bio, 'bio', { max: 280 }), expertise: v.tags(b.expertise, 'expertise') });
  res.json(await Mentor.findByIdAndUpdate(req.mentor._id, update, { new: true }));
});

// Mentor Login. Changed: role in token, rate limited, no hash in response.
router.post('/mentors/login', rateLimit({ scope: 'mentor' }), async (req, res) => {
  const { email, password } = req.body || {};
  const found = email ? await Mentor.findOne({ email: String(email).toLowerCase().trim() }) : null;
  const check = found ? await verifyPassword(password, found.password) : { ok: false };
  if (!check.ok) throw new HttpError(400, 'Invalid credentials');
  res.json({ token: signToken(found, 'mentor'), role: 'mentor', mentor: found });
});

// ---------- Programs ----------

// Public list (the mentor panel and landing page use it). Hashes no longer leak.
router.get('/programs', async (req, res) => {
  const [programs, counts] = await Promise.all([
    Program.find().sort({ createdAt: -1 }).populate('mentors', 'name email'),
    Mentee.aggregate([{ $unwind: '$programs' }, { $group: { _id: '$programs', n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  // Added: menteeCount (a number only) so public pages can pick the largest cohort.
  res.json(programs.map((p) => ({ ...p.toJSON(), menteeCount: byId.get(String(p._id)) || 0 })));
});

router.get('/programs/:programId', staff, async (req, res) => {
  await requireProgramStaff(req, req.params.programId);
  const program = await Program.findById(req.params.programId).populate('mentors', 'name email').populate('resources');
  const menteeCount = await Mentee.countDocuments({ programs: program._id });
  res.json({ ...program.toJSON(), menteeCount });
});

// Create Program. Changed: admin only; optional code/description.
router.post('/programs', admin, async (req, res) => {
  const b = req.body || {};
  const name = v.text(b.name, 'name', { required: true, max: 80 });
  const code = (v.text(b.code, 'code', { max: 6 }) || deriveProgramCode(name)).toUpperCase();
  if (!/^[A-Z0-9]{2,6}$/.test(code)) throw new HttpError(400, 'code must be 2-6 letters or digits');
  const program = await Program.create({
    name, code,
    description: v.text(b.description, 'description', { max: 500 }),
    startDate: v.date(b.startDate, 'startDate'),
    endDate: v.date(b.endDate, 'endDate'),
  });
  res.status(201).json(program);
});

// Add Mentor to Program. Changed: admin only; $addToSet (upstream pushed duplicates).
router.post('/programs/:programId/add-mentor', admin, async (req, res) => {
  const [program, found] = await Promise.all([
    Program.findById(req.params.programId),
    Mentor.findById((req.body || {}).mentorId),
  ]);
  if (!program || !found) throw notFound('Program/Mentor');
  const [p, m] = await Promise.all([
    Program.findByIdAndUpdate(program._id, { $addToSet: { mentors: found._id } }, { new: true }),
    Mentor.findByIdAndUpdate(found._id, { $addToSet: { programs: program._id } }, { new: true }),
  ]);
  res.json({ program: p, mentor: m });
});

// ---------- Resources ----------

function resourceFields(b, { partial = false } = {}) {
  return v.defined({
    title: v.text(b.title, 'title', { required: !partial, max: 140 }),
    url: v.url(b.url, 'url'),
    description: v.text(b.description, 'description', { max: 2000 }),
    deadline: v.date(b.deadline, 'deadline'),
    maxScore: v.number(b.maxScore, 'maxScore', { min: 0, max: 10000 }),
    tags: v.tags(b.tags),
    isLocked: typeof b.isLocked === 'boolean' ? b.isLocked : undefined,
  });
}

// Add video or project resource. Changed: validated, whitelisted fields, 404 for
// unknown program (was 500). Quizzes go through /resources/quiz.
router.post('/resources', mentor, async (req, res) => {
  const b = req.body || {};
  const program = await requireProgramStaff(req, b.program);
  if (!['video', 'project'].includes(b.type)) {
    throw new HttpError(400, 'type must be "video" or "project" (quizzes use /api/resources/quiz)');
  }
  const resource = await Resource.create({
    ...resourceFields(b), type: b.type, program: program._id, addedBy: req.mentor._id,
  });
  await Program.updateOne({ _id: program._id }, { $addToSet: { resources: resource._id } });
  res.status(201).json(resource);
});

function quizQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) throw new HttpError(400, 'Add at least one question');
  if (questions.length > 100) throw new HttpError(400, 'At most 100 questions');
  return questions.map((q, i) => {
    const n = i + 1;
    const questionText = v.text(q?.questionText, `Question ${n}`, { required: true, max: 1000 });
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o ?? '').trim()) : [];
    if (options.filter(Boolean).length < 2 || options.some((o) => !o)) {
      throw new HttpError(400, `Question ${n} needs at least two non-empty options`);
    }
    const correctOptionIndex = Number(q.correctOptionIndex);
    if (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex >= options.length) {
      throw new HttpError(400, `Question ${n} needs a correct option`);
    }
    const marks = v.number(q.marks ?? 1, `Question ${n} marks`, { min: 1, max: 100 });
    return { questionText, options, correctOptionIndex, marks };
  });
}

// Changed: quizzes are created unlocked (upstream locked them with no way to
// unlock, so no mentee could ever submit). Availability = startTime..endTime.
router.post('/resources/quiz', mentor, async (req, res) => {
  const b = req.body || {};
  const program = await requireProgramStaff(req, b.program);
  const questions = quizQuestions(b.questions);
  const startTime = v.date(b.startTime, 'startTime') || new Date();
  const endTime = v.date(b.endTime, 'endTime', { required: true });
  if (endTime <= startTime) throw new HttpError(400, 'endTime must be after startTime');
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  const resource = await Resource.create({
    title: v.text(b.title, 'title', { required: true, max: 140 }),
    description: v.text(b.description, 'description', { max: 2000 }),
    tags: v.tags(b.tags),
    type: 'quiz',
    program: program._id,
    maxScore: v.number(b.maxScore, 'maxScore', { min: 1, max: 10000 }) ?? totalMarks,
    isLocked: b.isLocked === true,
    addedBy: req.mentor._id,
    deadline: endTime,
  });
  const quiz = await Quiz.create({
    resource: resource._id, questions, startTime, endTime, revealScores: !!b.revealScores,
  });
  resource.quiz = quiz._id;
  await resource.save();
  await Program.updateOne({ _id: program._id }, { $addToSet: { resources: resource._id } });
  res.status(201).json({ message: 'Quiz resource created', resource, quiz });
});

// New: full resource for its mentors (quiz answers included).
router.get('/resources/:id', staff, async (req, res) => {
  const resource = await loadResource(req.params.id);
  await requireProgramStaff(req, resource.program);
  const quiz = resource.type === 'quiz' ? await Quiz.findOne({ resource: resource._id }) : null;
  res.json({ resource, quiz });
});

// New: edit deadline / max score / lock state etc.
router.patch('/resources/:id', mentor, async (req, res) => {
  const b = req.body || {};
  const resource = await loadResource(req.params.id);
  await requireProgramStaff(req, resource.program);
  const fields = resourceFields(b, { partial: true });
  // Questions are never editable through the API. Once anyone has attempted a
  // quiz, its max score and opening time are frozen too (changing them would
  // rescale or invalidate scores already given); the closing time can still move.
  if (resource.type === 'quiz' && await QuizSubmission.exists({ resource: resource._id })) {
    const startTime = v.date(b.startTime, 'startTime');
    const quizNow = await Quiz.findOne({ resource: resource._id }).select('startTime');
    if ((fields.maxScore !== undefined && fields.maxScore !== resource.maxScore)
      || (startTime && quizNow && startTime.getTime() !== quizNow.startTime.getTime())) {
      throw new HttpError(409, 'Mentees have already attempted this quiz. Only the closing time, title, notes, topics and lock can change.');
    }
  }
  Object.assign(resource, fields);
  if (resource.type === 'quiz') {
    const quiz = await Quiz.findOne({ resource: resource._id });
    if (quiz) {
      const startTime = v.date(b.startTime, 'startTime');
      const endTime = v.date(b.endTime, 'endTime');
      if (startTime) quiz.startTime = startTime;
      if (endTime) { quiz.endTime = endTime; resource.deadline = endTime; }
      if (quiz.endTime <= quiz.startTime) throw new HttpError(400, 'endTime must be after startTime');
      if (typeof b.revealScores === 'boolean') quiz.revealScores = b.revealScores;
      await quiz.save();
    }
  }
  await resource.save();
  res.json(resource);
});

// New: delete a resource and everything hanging off it.
router.delete('/resources/:id', mentor, async (req, res) => {
  const resource = await loadResource(req.params.id);
  await requireProgramStaff(req, resource.program);
  await Promise.all([
    Program.updateOne({ _id: resource.program }, { $pull: { resources: resource._id } }),
    Quiz.deleteMany({ resource: resource._id }),
    QuizSubmission.deleteMany({ resource: resource._id }),
  ]);
  const affected = await Mentee.find({ 'completedResources.resource': resource._id });
  for (const m of affected) {
    m.completedResources = m.completedResources.filter((c) => c.resource?.toString() !== resource._id.toString());
    recomputeTotal(m);
    await m.save();
  }
  await resource.deleteOne();
  res.json({ message: 'Resource deleted' });
});

// New: who has done what on one resource (mentor's per-resource view).
router.get('/resources/:id/submissions', staff, async (req, res) => {
  const resource = await loadResource(req.params.id);
  await requireProgramStaff(req, resource.program);
  const mentees = await Mentee.find({ programs: resource.program }).select('name enrollmentNumber completedResources');
  res.json(mentees.map((m) => {
    const c = findCompletion(m, resource._id);
    return {
      menteeId: m._id, name: m.name, enrollmentNumber: m.enrollmentNumber,
      status: !c ? 'pending' : resource.type === 'project' ? (c.verified ? 'verified' : 'submitted') : 'completed',
      score: c?.score ?? null, completedOn: c?.completedOn ?? null, submittedOn: c?.submittedOn ?? null,
      githubLink: c?.githubLink, deployedLink: c?.deployedLink,
    };
  }));
});

// ---------- Mentees ----------

// Mentor adds a mentee. Changed: enrollment number auto-generated when not
// given; password hashed (shown once as tempPassword); existing mentee (same
// email) is enrolled in the extra program instead of duplicated.
router.post('/mentees', mentor, async (req, res) => {
  const b = req.body || {};
  const program = await requireProgramStaff(req, b.programId);
  const email = v.email(b.email);
  const name = v.text(b.name, 'name', { required: true, max: 80 });

  const existing = await Mentee.findOne({ email });
  if (existing) {
    if (ids(existing.programs).includes(program._id.toString())) {
      throw new HttpError(409, 'This mentee is already in the program');
    }
    existing.programs.push(program._id);
    await existing.save();
    return res.status(200).json({ mentee: existing, tempPassword: null, existing: true });
  }

  const enrollmentNumber = v.text(b.enrollmentNumber, 'enrollmentNumber', { max: 40 })
    || await nextEnrollmentNumber(program);
  const tempPassword = generatePassword(10);
  const mentee = await Mentee.create({
    email, name, enrollmentNumber,
    password: await hashPassword(tempPassword),
    programs: [program._id],
    createdBy: req.mentor._id,
    interests: v.tags(b.interests, 'interests'),
  });

  res.status(201).json({ mentee, tempPassword });
});

// New: mentors can reset (never read) a mentee's password.
router.post('/mentees/:id/reset-password', mentor, async (req, res) => {
  const mentee = await Mentee.findById(req.params.id);
  if (!mentee) throw notFound('Mentee');
  const shared = ids(mentee.programs).some((p) => ids(req.mentor.programs).includes(p));
  if (!shared) throw new HttpError(403, 'Not your mentee');
  const tempPassword = generatePassword(10);
  mentee.password = await hashPassword(tempPassword);
  await mentee.save();
  res.json({ mentee, tempPassword });
});

// Get all mentees for a program. Changed: requires program staff; no passwords.
router.get('/:programId/mentees', staff, async (req, res) => {
  await requireProgramStaff(req, req.params.programId);
  const mentees = await Mentee.find({ programs: req.params.programId })
    .sort({ createdAt: 1 })
    .populate('completedResources.resource', 'title type maxScore');
  res.json(mentees.map((m) => {
    recomputeTotal(m);
    return m;
  }));
});

// Changed: requires membership of the program.
router.get('/:programId/resources', anyRole, async (req, res) => {
  await requireProgramMember(req, req.params.programId);
  const resources = await Resource.find({ program: req.params.programId }).sort({ createdAt: -1 });
  res.json(resources);
});

// ---------- Project review ----------

// Changed: mentor must own the resource's program; score validated and clamped;
// optional feedback; total recomputed. Upstream rejected locked resources
// here, which blocked grading after locking — that check is dropped.
router.patch('/:menteeId/resources/:resourceId/verify', mentor, async (req, res) => {
  const { menteeId, resourceId } = req.params;
  const b = req.body || {};
  const resource = await loadResource(resourceId);
  await requireProgramStaff(req, resource.program);
  if (resource.type !== 'project') throw new HttpError(400, 'Only project-type resources can be verified');

  const score = v.number(b.score, 'score', { required: true, min: 0 });
  const mentee = await Mentee.findById(menteeId);
  if (!mentee) throw notFound('Mentee');

  const submission = findCompletion(mentee, resourceId);
  if (!submission || !submission.githubLink) throw new HttpError(400, 'Project not yet submitted by this mentee');
  if (submission.verified) throw new HttpError(400, 'This project has already been verified');

  const finalScore = Math.min(Math.round(score), resource.maxScore);
  submission.score = finalScore;
  submission.verified = true;
  submission.verifiedAt = new Date();
  submission.feedback = v.text(b.feedback, 'feedback', { max: 1000 });
  recomputeTotal(mentee);
  await mentee.save();

  res.json({ message: 'Project verified and scored', finalScore, totalScore: mentee.totalScore });
});

// Same response shape as upstream, plus program/maxScore for the review queue.
router.get('/unverified-projects', mentor, async (req, res) => {
  const programIds = ids(req.mentor.programs);
  const mentees = await Mentee.find({
    programs: { $in: programIds },
    completedResources: { $elemMatch: { verified: false, githubLink: { $exists: true } } },
  }).populate({ path: 'completedResources.resource', populate: { path: 'program', select: 'name' } });

  const unverifiedProjects = [];
  for (const m of mentees) {
    for (const entry of m.completedResources) {
      const r = entry.resource;
      if (r && r.type === 'project' && !entry.verified && entry.githubLink && r.program
        && programIds.includes(r.program._id.toString())) {
        unverifiedProjects.push({
          menteeId: m._id, menteeName: m.name, enrollmentNumber: m.enrollmentNumber,
          resourceId: r._id, resourceTitle: r.title, maxScore: r.maxScore, deadline: r.deadline,
          programId: r.program._id, programName: r.program.name,
          githubLink: entry.githubLink, deployedLink: entry.deployedLink,
          description: entry.description, submittedOn: entry.submittedOn,
        });
      }
    }
  }
  unverifiedProjects.sort((a, b) => new Date(a.submittedOn) - new Date(b.submittedOn));
  res.json({ unverifiedProjects });
});

module.exports = router;
