// AI profiles (mounted at /api/profile).
//   GET  /:kind/:id            latest ready profile + any job in flight
//   POST /:kind/:id/generate   new profile (reuses the last one if nothing changed, unless force)
//   GET  /jobs/:snapshotId     poll a queued/running profile
// kind is "mentee" or "mentor".
const express = require('express');
const Mentee = require('../models/Mentee');
const Mentor = require('../models/Mentor');
const ProfileSnapshot = require('../models/ProfileSnapshot');
const { authenticate } = require('../middleware/auth');
const { HttpError, notFound } = require('../middleware/errors');
const { ids } = require('../services/access');
const { loadFacts, hashFacts } = require('../services/profile/generate');
const { requestProfile, refreshJob, workflowConfig } = require('../services/profile/runner');
const { configuredEngine } = require('../services/profile/writer');

const router = express.Router();
const anyRole = authenticate('admin', 'mentor', 'mentee');
const KINDS = ['mentee', 'mentor'];

const shares = (a, b) => ids(a).some((p) => ids(b).includes(p));

// Who may see / regenerate whose profile.
async function access(req, kind, id) {
  if (!KINDS.includes(kind)) throw new HttpError(404, 'Unknown profile type');
  const Model = kind === 'mentee' ? Mentee : Mentor;
  const subject = await Model.findById(id).select('name programs');
  if (!subject) throw notFound(kind === 'mentee' ? 'Mentee' : 'Mentor');
  const me = req.user;
  const self = req.role === kind && String(me._id) === String(subject._id);
  let view = req.role === 'admin' || self;
  let generate = view;
  if (req.role === 'mentor' && kind === 'mentee' && shares(subject.programs, me.programs)) view = generate = true;
  // Mentees may view (not regenerate) the profile of a mentor in their program.
  if (req.role === 'mentee' && kind === 'mentor' && shares(subject.programs, me.programs)) view = true;
  if (!view) throw new HttpError(403, 'You can only see profiles in your own programs');
  return { subject, canGenerate: generate, self };
}

const publicSnapshot = (s) => s && {
  id: s._id,
  subjectKind: s.subjectKind,
  status: s.status,
  runner: s.runner,
  runId: s.runId,
  workflowError: s.workflowError,
  engine: s.engine,
  model: s.model,
  fallbackReason: s.fallbackReason,
  modelAttempts: s.modelAttempts,
  ungroundedNumbers: s.ungroundedNumbers,
  droppedRecommendations: s.droppedRecommendations,
  facts: s.facts,
  badges: s.badges,
  avatarSvg: s.avatarSvg,
  narrative: s.narrative,
  error: s.error,
  createdAt: s.createdAt,
  completedAt: s.completedAt,
};

router.get('/jobs/:snapshotId', anyRole, async (req, res) => {
  const snap = await ProfileSnapshot.findById(req.params.snapshotId);
  if (!snap) throw notFound('Profile job');
  await access(req, snap.subjectKind, snap.subject);
  res.json(publicSnapshot(await refreshJob(snap)));
});

router.get('/:kind/:id', anyRole, async (req, res) => {
  const { subject, canGenerate, self } = await access(req, req.params.kind, req.params.id);
  const [latest, pending] = await Promise.all([
    ProfileSnapshot.findOne({ subjectKind: req.params.kind, subject: subject._id, status: 'ready' }).sort({ createdAt: -1 }),
    ProfileSnapshot.findOne({ subjectKind: req.params.kind, subject: subject._id, status: { $in: ['queued', 'running'] } }).sort({ createdAt: -1 }),
  ]);
  // Current marks do not depend on when the AI summary was last generated.
  const current = req.params.kind === 'mentee' ? (await loadFacts('mentee', subject._id)).facts : null;
  const wf = workflowConfig();
  res.json({
    performance: current ? { marks: current.mentorMarks, weeks: current.activity.weeks, pending: current.projects.pendingReview } : null,
    subject: { id: subject._id, name: subject.name, kind: req.params.kind },
    canGenerate,
    self,
    latest: publicSnapshot(latest),
    pending: publicSnapshot(pending),
    pipeline: { runner: wf ? 'render-workflow' : 'in-process', engine: configuredEngine(), local: !!wf?.local },
  });
});

router.post('/:kind/:id/generate', anyRole, async (req, res) => {
  const { kind, id } = req.params;
  const { subject, canGenerate } = await access(req, kind, id);
  if (!canGenerate) throw new HttpError(403, 'Only this person, their mentor or an admin can regenerate this profile');

  // One job at a time per profile.
  const pending = await ProfileSnapshot.findOne({ subjectKind: kind, subject: subject._id, status: { $in: ['queued', 'running'] }, createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } });
  if (pending) return res.status(202).json({ reused: false, inFlight: true, snapshot: publicSnapshot(await refreshJob(pending)) });

  // Nothing changed since the last profile from the same engine: reuse it.
  const force = (req.body || {}).force === true;
  if (!force) {
    const latest = await ProfileSnapshot.findOne({ subjectKind: kind, subject: subject._id, status: 'ready' }).sort({ createdAt: -1 });
    if (latest) {
      const { facts } = await loadFacts(kind, subject._id);
      if (hashFacts(facts) === latest.inputsHash && latest.engine === configuredEngine()) {
        return res.json({ reused: true, snapshot: publicSnapshot(latest) });
      }
    }
  }

  const snap = await requestProfile({ subjectKind: kind, subjectId: subject._id, requestedBy: { role: req.role, id: req.user._id } });
  res.status(snap.status === 'ready' || snap.status === 'failed' ? 201 : 202).json({ reused: false, snapshot: publicSnapshot(snap) });
});

module.exports = router;
