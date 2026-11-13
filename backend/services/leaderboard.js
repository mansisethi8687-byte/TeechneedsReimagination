// Leaderboard: one documented formula, used for the live board, the
// dashboard rank and historical ranks (so movement is never invented).
//
// SCORE  = sum of every scored completion:
//            video    maxScore minus 1 point per full day late (at completion)
//            quiz     round(maxScore x marks earned / total marks), within its window
//            project  the mentor's score, counted from the moment it is reviewed;
//                     submitted-but-unreviewed projects count 0
// ORDER  = 1. score, highest first
//          2. reached that score earlier (time of the last scoring event), first
//          3. account creation order (_id), as a final stable tiebreak
// RANK   = position in that order (1-based). Exact ties are impossible by
//          construction, so the board never reorders between identical reloads.
// MOVEMENT = rank 7 days ago minus rank now, computed with the same formula
//          from persisted timestamps. Shown only for mentees who already had a
//          score 7 days ago; everyone else gets null ("new"), never a guess.
const mongoose = require('mongoose');
const Mentee = require('../models/Mentee');
const Resource = require('../models/Resource');

const MOVEMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Every completion that carries points, with the moment those points landed.
function scoringEvents(mentee, resourceFilter) {
  const events = [];
  for (const c of mentee.completedResources || []) {
    const rid = c.resource?._id || c.resource;
    if (!rid || (resourceFilter && !resourceFilter.has(String(rid)))) continue;
    if (!c.score) continue;
    const isReviewedProject = c.verified && c.verifiedAt;
    const at = isReviewedProject ? c.verifiedAt : (c.completedOn || c.submittedOn);
    if (!at) continue;
    events.push({ score: c.score, at: new Date(at) });
  }
  return events;
}

function standings(mentees, { at = new Date(), resourceFilter } = {}) {
  const rows = mentees.map((m) => {
    const events = scoringEvents(m, resourceFilter).filter((e) => e.at <= at);
    const total = events.reduce((s, e) => s + e.score, 0);
    const lastAt = events.length ? new Date(Math.max(...events.map((e) => e.at.getTime()))) : null;
    return { mentee: m, total, lastAt, count: events.length };
  });
  rows.sort((a, b) =>
    b.total - a.total
    || (a.lastAt && b.lastAt ? a.lastAt - b.lastAt : a.lastAt ? -1 : b.lastAt ? 1 : 0)
    || String(a.mentee._id).localeCompare(String(b.mentee._id)));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

async function loadCohort(programId) {
  if (!programId) {
    const mentees = await Mentee.find().select('name streak completedResources createdAt').lean();
    return { mentees, resourceFilter: null };
  }
  const pid = new mongoose.Types.ObjectId(String(programId));
  const [mentees, resources] = await Promise.all([
    Mentee.find({ programs: pid }).select('name streak completedResources createdAt').lean(),
    Resource.find({ program: pid }).select('_id').lean(),
  ]);
  return { mentees, resourceFilter: new Set(resources.map((r) => String(r._id))) };
}

function withMovement(now, past) {
  const pastRank = new Map(past.filter((r) => r.total > 0).map((r) => [String(r.mentee._id), r.rank]));
  return now.map((r) => {
    const before = pastRank.get(String(r.mentee._id));
    return { ...r, movement: before == null ? null : before - r.rank };
  });
}

async function leaderboard({ programId, limit = 50, skip = 0, now = new Date() } = {}) {
  const { mentees, resourceFilter } = await loadCohort(programId);
  const current = standings(mentees, { at: now, resourceFilter });
  const past = standings(mentees, { at: new Date(now - MOVEMENT_WINDOW_MS), resourceFilter });
  return withMovement(current, past).slice(skip, skip + limit).map((r) => ({
    rank: r.rank,
    id: r.mentee._id,
    name: r.mentee.name,
    totalScore: r.total,
    streak: r.mentee.streak || 0,
    completed: (r.mentee.completedResources || []).filter((c) => !resourceFilter || resourceFilter.has(String(c.resource))).length,
    lastScoredAt: r.lastAt,
    movement: r.movement,
  }));
}

async function rankOf(menteeId, programId) {
  const { mentees, resourceFilter } = await loadCohort(programId);
  const rows = standings(mentees, { resourceFilter });
  const me = rows.find((r) => String(r.mentee._id) === String(menteeId));
  return me ? { rank: me.rank, of: rows.length, score: me.total } : null;
}

module.exports = { leaderboard, rankOf, standings, scoringEvents, MOVEMENT_WINDOW_MS };
