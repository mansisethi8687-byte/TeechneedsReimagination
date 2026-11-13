// Single source for scores, streaks and penalties. Upstream duplicated this
// logic across three routes; the rules themselves are kept unchanged.
const DAY = 24 * 60 * 60 * 1000;

// Upstream rule: 1 point off per full day late.
function latePenalty(deadline, at = new Date()) {
  if (!deadline || at <= deadline) return 0;
  return Math.floor((at - deadline) / DAY);
}

function timedScore(resource, at = new Date()) {
  return Math.max(0, (resource.maxScore || 0) - latePenalty(resource.deadline, at));
}

// Upstream summed raw marks, so a 5-mark quiz "worth 300" paid out 5.
// Scale to the resource's maxScore instead; keep the raw marks too.
function gradeQuiz(quiz, answers = [], maxScore) {
  const byId = new Map();
  const byIndex = new Map();
  for (const a of answers) {
    if (a && a.questionId != null) byId.set(String(a.questionId), a);
    if (a && Number.isInteger(a.questionIndex)) byIndex.set(a.questionIndex, a);
  }
  let raw = 0;
  let totalMarks = 0;
  const graded = quiz.questions.map((q, i) => {
    const marks = q.marks || 1;
    totalMarks += marks;
    const ans = byId.get(String(q._id)) || byIndex.get(i);
    const selected = ans && Number.isInteger(ans.selectedOptionIndex) ? ans.selectedOptionIndex : -1;
    const correct = selected === q.correctOptionIndex;
    if (correct) raw += marks;
    return { questionIndex: i, questionId: String(q._id), selectedOptionIndex: selected, correct };
  });
  const cap = maxScore || totalMarks;
  const score = totalMarks ? Math.round((raw / totalMarks) * cap) : 0;
  return { raw, totalMarks, score, answers: graded };
}

// Upstream rule: consecutive calendar days of activity (server-local dates).
function updateStreak(mentee, now = new Date()) {
  const today = now.toDateString();
  const lastActive = mentee.lastActiveDate?.toDateString();
  if (lastActive !== today) {
    const yesterday = new Date(now.getTime() - DAY).toDateString();
    mentee.streak = lastActive === yesterday ? (mentee.streak || 0) + 1 : 1;
    mentee.lastActiveDate = now;
  }
}

function recomputeTotal(mentee) {
  mentee.totalScore = (mentee.completedResources || []).reduce((s, c) => s + (c?.score || 0), 0);
  return mentee.totalScore;
}

function findCompletion(mentee, resourceId) {
  return mentee.completedResources.find((c) => c.resource && c.resource.toString() === resourceId.toString());
}

function upsertCompletion(mentee, resourceId, fields) {
  const existing = findCompletion(mentee, resourceId);
  if (existing) Object.assign(existing, fields);
  else mentee.completedResources.push({ resource: resourceId, ...fields });
  recomputeTotal(mentee);
  return findCompletion(mentee, resourceId);
}

module.exports = { DAY, latePenalty, timedScore, gradeQuiz, updateStreak, recomputeTotal, findCompletion, upsertCompletion };
