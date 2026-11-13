// The profile pipeline. The same functions run inside the API process and
// inside the Render Workflow task, so the two runners cannot drift apart.
const crypto = require('crypto');
const Mentee = require('../../models/Mentee');
const Mentor = require('../../models/Mentor');
const Program = require('../../models/Program');
const Resource = require('../../models/Resource');
const QuizSubmission = require('../../models/QuizSubmission');
const ProfileSnapshot = require('../../models/ProfileSnapshot');
const { menteeFacts, mentorFacts } = require('./facts');
const { menteeBadges, mentorBadges } = require('./badges');
const { growthRings } = require('./avatar');
const { writeNarrative } = require('./writer');
const { leaderboard } = require('../leaderboard');

async function loadFacts(kind, subjectId, now = new Date()) {
  if (kind === 'mentee') {
    const mentee = await Mentee.findById(subjectId).lean();
    if (!mentee) throw new Error('Mentee not found');
    const programs = await Program.find({ _id: { $in: mentee.programs } }).select('name').lean();
    const [resources, quizSubs] = await Promise.all([
      Resource.find({ program: { $in: mentee.programs } }).select('title type tags maxScore deadline isLocked program').lean(),
      QuizSubmission.find({ mentee: mentee._id }).select('resource rawScore totalMarks').lean(),
    ]);
    let standing = null;
    if (programs[0]) {
      const board = await leaderboard({ programId: programs[0]._id, limit: 500, now });
      const me = board.find((r) => String(r.id) === String(mentee._id));
      if (me) standing = { rank: me.rank, of: board.length, movement: me.movement };
    }
    return { subject: mentee, facts: menteeFacts({ mentee, resources, quizSubs, standing, programs, now }) };
  }
  const mentor = await Mentor.findById(subjectId).lean();
  if (!mentor) throw new Error('Mentor not found');
  const programs = await Program.find({ _id: { $in: mentor.programs } }).select('name').lean();
  const [resources, mentees] = await Promise.all([
    Resource.find({ program: { $in: mentor.programs } }).select('title type tags maxScore deadline').lean(),
    Mentee.find({ programs: { $in: mentor.programs } }).select('name lastActiveDate completedResources').lean(),
  ]);
  return { subject: mentor, facts: mentorFacts({ mentor, programs, resources, mentees, now }) };
}

// A stable fingerprint of the inputs: same activity -> same hash, so
// regenerating without new activity reuses the last profile (and LLM quota).
function hashFacts(facts) {
  const { open, ...stable } = facts; // eslint-disable-line no-unused-vars
  return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex').slice(0, 24);
}

function avatarFor(subject, facts) {
  const rings = facts.kind === 'mentee'
    ? facts.topics.filter((t) => t.total > 0).slice(0, 5).map((t) => ({ label: t.topic, value: t.mastery }))
    : facts.topics.slice(0, 5).map((t) => ({ label: t.topic, value: Math.round((t.resources / Math.max(1, facts.published.total)) * 100) }));
  return growthRings({ id: subject._id, name: subject.name, rings });
}

// Fill in a queued snapshot. Idempotent: a finished snapshot is returned as is,
// which makes workflow retries safe.
async function runSnapshot(snapshotId, { runner } = {}) {
  const snap = await ProfileSnapshot.findById(snapshotId);
  if (!snap) throw new Error(`Snapshot ${snapshotId} not found`);
  if (snap.status === 'ready') return snap;
  snap.status = 'running';
  snap.startedAt = new Date();
  if (runner) snap.runner = runner;
  await snap.save();
  try {
    const { subject, facts } = await loadFacts(snap.subjectKind, snap.subject);
    const badges = snap.subjectKind === 'mentee' ? menteeBadges(facts) : mentorBadges(facts);
    const written = await writeNarrative(facts);
    Object.assign(snap, {
      status: 'ready',
      facts,
      badges,
      avatarSvg: avatarFor(subject, facts),
      narrative: written.narrative,
      engine: written.engine,
      model: written.model,
      fallbackReason: written.fallbackReason,
      modelAttempts: written.attempts,
      ungroundedNumbers: written.ungroundedNumbers || [],
      droppedRecommendations: written.droppedRecommendations || 0,
      inputsHash: hashFacts(facts),
      completedAt: new Date(),
      error: undefined,
    });
  } catch (err) {
    snap.status = 'failed';
    snap.error = err.message.slice(0, 300);
    snap.completedAt = new Date();
  }
  await snap.save();
  return snap;
}

module.exports = { loadFacts, hashFacts, runSnapshot, avatarFor };
