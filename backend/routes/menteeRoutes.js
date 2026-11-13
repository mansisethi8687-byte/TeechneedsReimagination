// Upstream paths are all kept (mounted at /api/m). Changes noted per route.
const express = require('express');
const Mentee = require('../models/Mentee');
const Program = require('../models/Program');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const { authenticate } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { HttpError, notFound } = require('../middleware/errors');
const { verifyPassword, hashPassword, signToken } = require('../services/credentials');
const { loadResource, requireMenteeInProgram } = require('../services/access');
const { timedScore, latePenalty, gradeQuiz, updateStreak, findCompletion, upsertCompletion } = require('../services/scoring');
const { leaderboard, rankOf } = require('../services/leaderboard');
const v = require('../services/validate');

const router = express.Router();
const mentee = authenticate('mentee');

// Changed: bcrypt; legacy plaintext passwords are upgraded on success; role in
// token; rate limited. Response gains `role` and `mentee` (no password).
router.post('/login', rateLimit({ scope: 'mentee' }), async (req, res) => {
  const { enrollmentNumber, password } = req.body || {};
  const found = enrollmentNumber ? await Mentee.findOne({ enrollmentNumber: String(enrollmentNumber).trim() }) : null;
  const check = found ? await verifyPassword(password, found.password) : { ok: false };
  if (!check.ok) throw new HttpError(400, 'Invalid credentials');
  if (check.legacy) {
    found.password = await hashPassword(password);
    await found.save();
  }
  res.json({ token: signToken(found, 'mentee'), role: 'mentee', mentee: found });
});

function quizWindow(quiz, now = new Date()) {
  if (!quiz) return { state: 'missing' };
  if (quiz.startTime && now < quiz.startTime) return { state: 'upcoming', startTime: quiz.startTime, endTime: quiz.endTime };
  if (quiz.endTime && now > quiz.endTime) return { state: 'closed', startTime: quiz.startTime, endTime: quiz.endTime };
  return { state: 'open', startTime: quiz.startTime, endTime: quiz.endTime };
}

function resourceStatus(res, completion) {
  if (!completion) return 'todo';
  if (res.type === 'project') return completion.verified ? 'verified' : 'submitted';
  return 'completed';
}

// What a mentee may see about their own completion of a resource.
function completionView(resource, c) {
  if (!c) return null;
  const when = c.submittedOn || c.completedOn;
  return {
    score: resource.type === 'project' && !c.verified ? null : c.score,
    completedOn: c.completedOn,
    submittedOn: c.submittedOn,
    verified: !!c.verified,
    verifiedAt: c.verifiedAt,
    feedback: c.feedback,
    githubLink: c.githubLink,
    deployedLink: c.deployedLink,
    description: c.description,
    late: !!(resource.deadline && when && new Date(when) > resource.deadline),
  };
}

// --- Mentee Dashboard --- //
// Same shape as upstream. Changed: survives deleted resources, totalScore is
// recomputed, each resource gains `status` (+ quiz window), each program gains
// the mentee's standing in it, and the response gains profile fields.
router.get('/dashboard', mentee, async (req, res) => {
  const me = await Mentee.findById(req.mentee._id)
    .populate({ path: 'programs', select: 'name code description resources', populate: { path: 'resources', model: 'Resource' } })
    .populate({ path: 'completedResources.resource', model: 'Resource', select: 'title type maxScore deadline tags program' });

  const completions = new Map();
  for (const c of me.completedResources) if (c.resource) completions.set(c.resource._id.toString(), c);

  const quizIds = me.programs.flatMap((p) => p.resources.filter((r) => r.type === 'quiz').map((r) => r._id));
  const quizzes = await Quiz.find({ resource: { $in: quizIds } }).select('resource startTime endTime questions.marks');
  const quizByResource = new Map(quizzes.map((q) => [q.resource.toString(), q]));
  const now = new Date();

  const programs = await Promise.all(me.programs.map(async (program) => ({
    ...program.toObject(),
    standing: await rankOf(me._id, program._id),
    resources: program.resources.map((r) => {
      const c = completions.get(r._id.toString());
      const quiz = r.type === 'quiz' ? quizByResource.get(r._id.toString()) : null;
      const obj = r.toObject();
      delete obj.quiz;
      return {
        ...obj,
        completed: !!c,
        score: c && !(r.type === 'project' && !c.verified) ? c.score : null,
        completedOn: c ? (c.completedOn || c.submittedOn) : null,
        status: resourceStatus(r, c),
        ...(quiz ? { quizWindow: quizWindow(quiz, now), questionCount: quiz.questions.length } : {}),
        ...(r.type === 'project' && c ? { feedback: c.feedback, githubLink: c.githubLink, deployedLink: c.deployedLink, verifiedAt: c.verifiedAt } : {}),
      };
    }),
  })));

  const totalScore = me.completedResources.reduce((s, c) => s + (c.score || 0), 0);
  const ranking = await rankOf(me._id);
  res.json({
    id: me._id,
    name: me.name,
    email: me.email,
    enrollmentNumber: me.enrollmentNumber,
    interests: me.interests,
    bio: me.bio,
    streak: me.streak,
    lastActiveDate: me.lastActiveDate,
    totalScore,
    programs,
    rank: ranking?.rank ?? null,
    rankOf: ranking?.of ?? null,
    completedResources: me.completedResources
      .filter((c) => c.resource)
      .map((c) => ({
        resource: c.resource._id, title: c.resource.title, type: c.resource.type,
        score: c.resource.type === 'project' && !c.verified ? null : c.score,
        maxScore: c.resource.maxScore, completedOn: c.completedOn, submittedOn: c.submittedOn, verified: c.verified,
      })),
  });
});

// New: own profile fields (interest tags feed the AI profile).
router.get('/me', mentee, (req, res) => res.json(req.mentee));

router.patch('/me', mentee, async (req, res) => {
  const b = req.body || {};
  const update = v.defined({ interests: v.tags(b.interests, 'interests'), bio: v.text(b.bio, 'bio', { max: 280 }) });
  res.json(await Mentee.findByIdAndUpdate(req.mentee._id, update, { new: true, runValidators: true }));
});

// New: the mentee's own history, newest first, built from persisted timestamps.
router.get('/activity', mentee, async (req, res) => {
  const me = await Mentee.findById(req.mentee._id)
    .populate({ path: 'completedResources.resource', select: 'title type maxScore deadline program', populate: { path: 'program', select: 'name' } });
  const events = [];
  for (const c of me.completedResources) {
    const r = c.resource;
    if (!r) continue;
    const base = { resourceId: r._id, title: r.title, type: r.type, maxScore: r.maxScore, program: r.program?.name };
    if (r.type === 'project') {
      if (c.submittedOn) events.push({ ...base, kind: 'project_submitted', at: c.submittedOn, late: !!(r.deadline && c.submittedOn > r.deadline) });
      if (c.verified) events.push({ ...base, kind: 'project_reviewed', at: c.verifiedAt || c.submittedOn, score: c.score, feedback: c.feedback });
    } else {
      events.push({ ...base, kind: r.type === 'quiz' ? 'quiz_submitted' : 'video_completed', at: c.completedOn, score: c.score });
    }
  }
  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json(events.slice(0, 100));
});

// New: one resource as the mentee sees it (never includes a quiz answer key).
router.get('/resources/:id', mentee, async (req, res) => {
  const resource = await loadResource(req.params.id);
  requireMenteeInProgram(req.mentee, resource.program);
  const [program, quiz] = await Promise.all([
    Program.findById(resource.program).select('name code'),
    resource.type === 'quiz' ? Quiz.findOne({ resource: resource._id }).select('startTime endTime questions.marks revealScores') : null,
  ]);
  const c = findCompletion(req.mentee, resource._id);
  const obj = resource.toObject();
  delete obj.quiz;
  res.json({
    resource: obj,
    program,
    status: resourceStatus(resource, c),
    completion: completionView(resource, c),
    ...(resource.type === 'video' && !c ? { scoreIfCompletedNow: timedScore(resource), daysLate: latePenalty(resource.deadline) } : {}),
    ...(quiz ? {
      quizWindow: quizWindow(quiz),
      questionCount: quiz.questions.length,
      totalMarks: quiz.questions.reduce((s, q) => s + (q.marks || 1), 0),
      revealsAnswers: !!quiz.revealScores,
    } : {}),
    serverTime: new Date(),
  });
});

// --- Resource Completion --- //
// Changed: videos only (upstream let a checkbox award full marks for projects
// and quizzes), membership checked, 404 for unknown ids. Late penalty kept.
router.post('/resources/:id/complete', mentee, async (req, res) => {
  const resource = await loadResource(req.params.id);
  const me = req.mentee;
  requireMenteeInProgram(me, resource.program);
  if (resource.type !== 'video') {
    throw new HttpError(400, resource.type === 'quiz' ? 'Quizzes are completed by submitting answers' : 'Projects are completed by submitting your work');
  }
  if (resource.isLocked) throw new HttpError(403, 'Resource is locked');

  const already = findCompletion(me, resource._id);
  if (already) return res.json({ message: 'Already completed', score: already.score, alreadyCompleted: true, totalScore: me.totalScore, streak: me.streak });

  const score = timedScore(resource);
  upsertCompletion(me, resource._id, { score, completedOn: new Date() });
  updateStreak(me);
  await me.save();
  res.json({ message: 'Resource marked as completed!', score, totalScore: me.totalScore, streak: me.streak, daysLate: latePenalty(resource.deadline) });
});

// Changed: graded on the server and scaled to the resource's maxScore; every
// question must be answered with a valid option; one attempt; membership
// checked; no answer key in the response (see GET .../quiz for review rules).
router.post('/resources/:id/quiz/submit', mentee, async (req, res) => {
  const resource = await loadResource(req.params.id);
  const me = req.mentee;
  if (resource.type !== 'quiz') throw new HttpError(400, 'Invalid quiz resource');
  requireMenteeInProgram(me, resource.program);
  if (resource.isLocked) throw new HttpError(403, 'Quiz is locked');

  const quiz = await Quiz.findOne({ resource: resource._id });
  if (!quiz) throw notFound('Quiz');
  const window = quizWindow(quiz);
  if (window.state !== 'open') throw new HttpError(403, window.state === 'upcoming' ? 'Quiz has not opened yet' : 'Quiz is closed');

  if (await QuizSubmission.exists({ quiz: quiz._id, mentee: me._id })) throw new HttpError(409, 'Quiz already submitted');

  const answers = Array.isArray((req.body || {}).answers) ? req.body.answers : [];
  const byId = new Map(answers.filter((a) => a && a.questionId != null).map((a) => [String(a.questionId), a]));
  const unanswered = [];
  quiz.questions.forEach((q, i) => {
    const a = byId.get(String(q._id)) || answers.find((x) => x && x.questionIndex === i);
    const sel = a?.selectedOptionIndex;
    if (!Number.isInteger(sel) || sel < 0 || sel >= q.options.length) unanswered.push(i + 1);
  });
  if (unanswered.length) throw new HttpError(400, `Answer every question before submitting (missing: ${unanswered.join(', ')})`);

  const graded = gradeQuiz(quiz, answers, resource.maxScore);
  try {
    await QuizSubmission.create({
      quiz: quiz._id, resource: resource._id, mentee: me._id,
      answers: graded.answers, score: graded.score, rawScore: graded.raw, totalMarks: graded.totalMarks,
    });
  } catch (err) {
    // Two tabs submitting at once: the unique index wins, only one attempt counts.
    if (err.code === 11000) throw new HttpError(409, 'Quiz already submitted');
    throw err;
  }

  upsertCompletion(me, resource._id, { score: graded.score, completedOn: new Date() });
  updateStreak(me);
  await me.save();

  res.status(200).json({
    message: 'Quiz submitted successfully!',
    score: graded.score, maxScore: resource.maxScore, raw: graded.raw, totalMarks: graded.totalMarks,
    correct: graded.answers.filter((a) => a.correct).length, questions: quiz.questions.length,
    totalScore: me.totalScore, streak: me.streak,
    answersRevealAt: quiz.revealScores ? quiz.endTime : null,
  });
});

// Changed: questions only while the quiz is open, or after submitting. The
// answer key is NEVER sent while the quiz is open (so it can't be shared with
// classmates still taking it). After it closes, and only if the mentor chose
// to reveal answers, the review includes which answers were correct.
router.get('/resources/:id/quiz', mentee, async (req, res) => {
  const resource = await loadResource(req.params.id);
  if (resource.type !== 'quiz') throw new HttpError(400, 'Invalid resource or quiz not found');
  requireMenteeInProgram(req.mentee, resource.program);
  const quiz = await Quiz.findOne({ resource: resource._id });
  if (!quiz) throw notFound('Quiz');

  const submission = await QuizSubmission.findOne({ quiz: quiz._id, mentee: req.mentee._id });
  const window = quizWindow(quiz);
  if (!submission && window.state !== 'open') {
    throw new HttpError(403, window.state === 'upcoming' ? 'Quiz has not opened yet' : 'Quiz is closed');
  }
  const reveal = !!submission && quiz.revealScores && window.state === 'closed';

  res.json({
    title: resource.title,
    description: resource.description,
    maxScore: resource.maxScore,
    startTime: quiz.startTime,
    endTime: quiz.endTime,
    serverTime: new Date(),
    state: window.state,
    questions: quiz.questions.map((q) => ({
      id: q._id, questionText: q.questionText, options: q.options, marks: q.marks,
      ...(reveal ? { correctOptionIndex: q.correctOptionIndex } : {}),
    })),
    submission: submission ? {
      score: submission.score, raw: submission.rawScore, totalMarks: submission.totalMarks, submittedAt: submission.submittedAt,
      correct: submission.answers.filter((a) => a.correct).length,
      answers: submission.answers.map((a) => ({ questionId: a.questionId, selectedOptionIndex: a.selectedOptionIndex, ...(reveal ? { correct: a.correct } : {}) })),
      answersRevealed: reveal,
      answersRevealAt: quiz.revealScores && window.state !== 'closed' ? quiz.endTime : null,
    } : null,
  });
});

// POST /api/m/resources/:resourceId/project
// Changed: URL validation (live link optional), description required,
// membership check. Policy: resubmit freely until the mentor reviews it;
// reviewed projects are final. Late submissions are accepted and flagged.
router.post('/resources/:resourceId/project', mentee, async (req, res) => {
  const resource = await loadResource(req.params.resourceId);
  const me = req.mentee;
  if (resource.type !== 'project') throw new HttpError(400, 'Invalid resource type');
  requireMenteeInProgram(me, resource.program);
  if (resource.isLocked) throw new HttpError(403, 'Resource is locked');

  const b = req.body || {};
  const githubLink = v.url(b.githubLink, 'Repository link', { required: true });
  const deployedLink = v.url(b.deployedLink, 'Live link');
  const description = v.text(b.description, 'Description', { required: true, max: 5000 });
  if (description.length < 20) throw new HttpError(400, 'Description must be at least 20 characters');

  const existing = findCompletion(me, resource._id);
  if (existing?.verified) throw new HttpError(409, 'This project has already been reviewed');

  const now = new Date();
  upsertCompletion(me, resource._id, {
    githubLink, deployedLink, description, submittedOn: now, completedOn: now, score: 0, verified: false,
  });
  updateStreak(me);
  await me.save();
  res.json({
    message: existing ? 'Project resubmitted' : 'Project submitted successfully!',
    submittedOn: now, late: !!(resource.deadline && now > resource.deadline), resubmitted: !!existing, status: 'submitted',
  });
});

// --- Public Leaderboard --- //
// Formula and tiebreaks documented in services/leaderboard.js. Optional
// ?program= filter scores only that program's resources. Rows carry `id` so the
// client can highlight "you", and `movement` (null when there's no history).
router.get('/leaderboard', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), 200);
  const skip = Math.max(parseInt(req.query.skip || '0', 10) || 0, 0);
  const programId = req.query.program && /^[a-f\d]{24}$/i.test(req.query.program) ? req.query.program : undefined;
  res.json(await leaderboard({ programId, limit, skip }));
});

module.exports = router;
module.exports.quizWindow = quizWindow;
