// Pure functions: persisted records in, a fact sheet out. Every number on the
// AI profile comes from here, and every fact says what it was computed from,
// so the UI (and the LLM) can cite evidence instead of inventing it.
const DAY = 24 * 60 * 60 * 1000;
const pct = (n, d) => (d ? Math.round((n / d) * 100) : null);
const id = (x) => String(x?._id || x);

// When a completion's points landed (projects: when reviewed).
function scoredAt(c) {
  if (c.verified && c.verifiedAt) return new Date(c.verifiedAt);
  return new Date(c.completedOn || c.submittedOn);
}
// When the mentee acted (for on-time and activity).
function actedAt(c) {
  return new Date(c.submittedOn || c.completedOn);
}

/**
 * @param mentee        lean Mentee: name, interests, streak, completedResources[]
 * @param resources     lean Resources of the mentee's programs (title, type, tags, maxScore, deadline, isLocked)
 * @param quizSubs      lean QuizSubmissions of this mentee (resource, rawScore, totalMarks)
 * @param standing      { rank, of, movement } in the primary program, or null
 * @param programs      [{ _id, name }]
 * @param now           Date
 */
function menteeFacts({ mentee, resources, quizSubs = [], standing = null, programs = [], now = new Date() }) {
  const byId = new Map(resources.map((r) => [id(r), r]));
  const done = (mentee.completedResources || [])
    .map((c) => ({ c, r: byId.get(id(c.resource)) }))
    .filter((x) => x.r);
  const doneIds = new Set(done.map((x) => id(x.r)));
  const scored = done.filter(({ c, r }) => r.type !== 'project' || c.verified);

  // Counts per type
  const byType = {};
  for (const t of ['video', 'quiz', 'project']) {
    const all = resources.filter((r) => r.type === t);
    byType[t] = { total: all.length, done: done.filter((x) => x.r.type === t).length };
  }
  const pendingReview = done.filter(({ c, r }) => r.type === 'project' && !c.verified).length;

  // Points: earned vs. available on everything that is done or already due.
  const counted = resources.filter((r) => (doneIds.has(id(r)) || new Date(r.deadline) < now) &&
    !(r.type === 'project' && done.some((x) => id(x.r) === id(r) && !x.c.verified)));
  const earned = scored.reduce((s, x) => s + (x.c.score || 0), 0);
  const available = counted.reduce((s, r) => s + (r.maxScore || 0), 0);

  // Deadlines
  const withDeadline = done.filter(({ r }) => r.deadline);
  const onTime = withDeadline.filter(({ c, r }) => actedAt(c) <= new Date(r.deadline)).length;
  const overdue = resources.filter((r) => !doneIds.has(id(r)) && !r.isLocked && new Date(r.deadline) < now && r.type !== 'quiz');
  const missedQuizzes = resources.filter((r) => r.type === 'quiz' && !doneIds.has(id(r)) && new Date(r.deadline) < now);

  // Quizzes: accuracy from the graded submissions themselves.
  const quizAcc = quizSubs.filter((q) => q.totalMarks).map((q) => ({
    resource: id(q.resource), title: byId.get(id(q.resource))?.title, accuracy: pct(q.rawScore, q.totalMarks),
  }));
  const avgQuizAccuracy = quizAcc.length ? Math.round(quizAcc.reduce((s, q) => s + q.accuracy, 0) / quizAcc.length) : null;

  // Projects: mentor scores as % of max, plus their written feedback.
  const reviewed = done.filter(({ c, r }) => r.type === 'project' && c.verified);
  const avgProjectScore = reviewed.length
    ? Math.round(reviewed.reduce((s, { c, r }) => s + pct(c.score, r.maxScore), 0) / reviewed.length) : null;
  const feedback = reviewed
    .filter(({ c }) => c.feedback)
    .sort((a, b) => scoredAt(b.c) - scoredAt(a.c))
    .slice(0, 3)
    .map(({ c, r }) => ({ title: r.title, score: c.score, maxScore: r.maxScore, text: c.feedback }));

  // Topics: points earned out of points available, per tag. "Available" is
  // done-or-due, so unreleased future work never drags a topic down.
  const topicMap = new Map();
  for (const r of counted) {
    for (const tag of r.tags || []) {
      const t = topicMap.get(tag) || { topic: tag, earned: 0, available: 0, done: 0, total: 0 };
      t.available += r.maxScore || 0;
      t.total += 1;
      const hit = scored.find((x) => id(x.r) === id(r));
      if (hit) { t.earned += hit.c.score || 0; t.done += 1; }
      topicMap.set(tag, t);
    }
  }
  const topics = [...topicMap.values()]
    .map((t) => ({ ...t, mastery: pct(t.earned, t.available) ?? 0 }))
    .sort((a, b) => b.mastery - a.mastery || b.available - a.available || a.topic.localeCompare(b.topic));
  const strongest = topics.find((t) => t.done >= 1) || null;
  const weakest = [...topics].reverse().find((t) => t.total >= 1 && t.mastery < 100) || null;

  // Activity over time
  const weeks = [3, 2, 1, 0].map((w) => {
    const end = new Date(now - w * 7 * DAY);
    const start = new Date(end - 7 * DAY);
    const points = scored.filter(({ c }) => scoredAt(c) > start && scoredAt(c) <= end).reduce((s, x) => s + (x.c.score || 0), 0);
    return { weekEnding: end.toISOString().slice(0, 10), points };
  });
  const activeDays14 = new Set(done.map(({ c }) => actedAt(c)).filter((d) => now - d <= 14 * DAY).map((d) => d.toDateString())).size;

  // What's next: open work, soonest first (real resource ids only).
  const open = resources
    .filter((r) => !doneIds.has(id(r)) && !r.isLocked && !(r.type === 'quiz' && new Date(r.deadline) < now))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .map((r) => ({ resourceId: id(r), title: r.title, type: r.type, maxScore: r.maxScore, deadline: r.deadline, tags: r.tags || [],
      overdue: new Date(r.deadline) < now, daysLeft: Math.ceil((new Date(r.deadline) - now) / DAY) }));

  const interests = mentee.interests || [];
  const topicNames = new Set(topics.map((t) => t.topic));

  return {
    kind: 'mentee',
    firstName: (mentee.name || '').split(/\s+/)[0],
    programs: programs.map((p) => p.name),
    points: { earned, available, rate: pct(earned, available) },
    completion: { done: done.length, total: resources.length, rate: pct(done.length, resources.length), byType, pendingReview },
    deadlines: { onTime, late: withDeadline.length - onTime, onTimeRate: pct(onTime, withDeadline.length), overdue: overdue.length, missedQuizzes: missedQuizzes.length },
    quizzes: { taken: quizAcc.length, avgAccuracy: avgQuizAccuracy, results: quizAcc },
    projects: { reviewed: reviewed.length, avgScore: avgProjectScore, pendingReview },
    topics,
    strongest: strongest && { topic: strongest.topic, mastery: strongest.mastery, done: strongest.done, total: strongest.total },
    weakest: weakest && { topic: weakest.topic, mastery: weakest.mastery, done: weakest.done, total: weakest.total },
    activity: { streak: mentee.streak || 0, activeDays14, weeks },
    standing,
    interests,
    interestsCovered: interests.filter((i) => topicNames.has(i)),
    interestsUncovered: interests.filter((i) => !topicNames.has(i)),
    feedback,
    open,
  };
}

/**
 * @param mentor     lean Mentor: name, expertise
 * @param programs   [{ _id, name }]
 * @param resources  lean Resources in those programs
 * @param mentees    lean Mentees in those programs (name, lastActiveDate, completedResources)
 */
function mentorFacts({ mentor, programs = [], resources = [], mentees = [], now = new Date() }) {
  const resIds = new Set(resources.map(id));
  const byId = new Map(resources.map((r) => [id(r), r]));
  const completions = mentees.flatMap((m) => (m.completedResources || [])
    .filter((c) => resIds.has(id(c.resource)))
    .map((c) => ({ m, c, r: byId.get(id(c.resource)) })));

  const reviews = completions.filter(({ c, r }) => r.type === 'project' && c.verified && c.verifiedAt && c.submittedOn);
  const turnaround = reviews.map(({ c }) => (new Date(c.verifiedAt) - new Date(c.submittedOn)) / 3600000).sort((a, b) => a - b);
  const median = turnaround.length ? Math.round(turnaround[Math.floor((turnaround.length - 1) / 2)]) : null;
  const pending = completions.filter(({ c, r }) => r.type === 'project' && !c.verified && c.githubLink)
    .sort((a, b) => new Date(a.c.submittedOn) - new Date(b.c.submittedOn));

  const due = resources.filter((r) => new Date(r.deadline) < now);
  const cohortCompletion = mentees.length && due.length
    ? pct(completions.filter(({ r }) => new Date(r.deadline) < now).length, mentees.length * due.length) : null;
  const inactive = mentees.filter((m) => !m.lastActiveDate || now - new Date(m.lastActiveDate) > 7 * DAY)
    .map((m) => ({ name: m.name, lastActiveDate: m.lastActiveDate || null }));

  // Topics the mentor has published, and how the cohort is doing on them.
  const topicMap = new Map();
  for (const r of resources) {
    for (const tag of r.tags || []) {
      const t = topicMap.get(tag) || { topic: tag, resources: 0, earned: 0, available: 0 };
      t.resources += 1;
      if (new Date(r.deadline) < now) {
        t.available += (r.maxScore || 0) * mentees.length;
        t.earned += completions.filter((x) => id(x.r) === id(r) && (x.r.type !== 'project' || x.c.verified)).reduce((s, x) => s + (x.c.score || 0), 0);
      }
      topicMap.set(tag, t);
    }
  }
  const topics = [...topicMap.values()].map((t) => ({ ...t, cohortMastery: pct(t.earned, t.available) }))
    .sort((a, b) => b.resources - a.resources || a.topic.localeCompare(b.topic));
  const weakestCohortTopic = topics.filter((t) => t.cohortMastery != null).sort((a, b) => a.cohortMastery - b.cohortMastery)[0] || null;

  return {
    kind: 'mentor',
    firstName: (mentor.name || '').split(/\s+/)[0],
    programs: programs.map((p) => p.name),
    expertise: mentor.expertise || [],
    mentees: mentees.length,
    published: { total: resources.length, video: resources.filter((r) => r.type === 'video').length, quiz: resources.filter((r) => r.type === 'quiz').length, project: resources.filter((r) => r.type === 'project').length },
    reviews: {
      done: reviews.length,
      medianTurnaroundHours: median,
      withFeedback: reviews.filter(({ c }) => c.feedback).length,
      feedbackRate: pct(reviews.filter(({ c }) => c.feedback).length, reviews.length),
      avgScoreGiven: reviews.length ? Math.round(reviews.reduce((s, { c, r }) => s + pct(c.score, r.maxScore), 0) / reviews.length) : null,
      pending: pending.length,
      oldestPendingDays: pending.length ? Math.floor((now - new Date(pending[0].c.submittedOn)) / DAY) : null,
    },
    cohort: { completionRate: cohortCompletion, inactive },
    topics,
    weakestCohortTopic: weakestCohortTopic && { topic: weakestCohortTopic.topic, cohortMastery: weakestCohortTopic.cohortMastery },
    pendingList: pending.slice(0, 3).map(({ m, r, c }) => ({ mentee: m.name, title: r.title, resourceId: id(r), submittedOn: c.submittedOn })),
  };
}

module.exports = { menteeFacts, mentorFacts, pct };
