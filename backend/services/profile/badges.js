// Rule-based badges. Each one states exactly why it was earned, from facts.
// No badge is ever awarded by the LLM.

function menteeBadges(f) {
  const out = [];
  const add = (id, label, because, tier = 'standard') => out.push({ id, label, because, tier });

  if (f.completion.done >= 1) add('first-steps', 'First steps', `Completed ${f.completion.done} of ${f.completion.total} resources.`);
  if (f.deadlines.onTime >= 5) add('on-the-clock', 'On the clock', `${f.deadlines.onTime} pieces of work in before the deadline.`);
  if (f.deadlines.onTimeRate === 100 && f.deadlines.onTime >= 3) add('never-late', 'Never late', `Every one of ${f.deadlines.onTime} submissions was on time.`, 'gold');
  if (f.quizzes.taken >= 2 && f.quizzes.avgAccuracy >= 90) add('quiz-ace', 'Quiz ace', `${f.quizzes.avgAccuracy}% average accuracy across ${f.quizzes.taken} quizzes.`, 'gold');
  else if (f.quizzes.taken >= 1 && f.quizzes.avgAccuracy >= 75) add('quiz-solid', 'Solid on quizzes', `${f.quizzes.avgAccuracy}% average accuracy across ${f.quizzes.taken} ${f.quizzes.taken === 1 ? 'quiz' : 'quizzes'}.`);
  if (f.projects.reviewed >= 1) add('shipped', 'Shipped it', `${f.projects.reviewed} project${f.projects.reviewed === 1 ? '' : 's'} reviewed by a mentor.`);
  if (f.projects.reviewed >= 1 && f.projects.avgScore >= 85) add('reviewers-pick', "Reviewer's pick", `Mentors scored your projects ${f.projects.avgScore}% on average.`, 'gold');
  if (f.activity.streak >= 7) add('streak-7', 'Week-long streak', `${f.activity.streak} consecutive active days.`, 'gold');
  else if (f.activity.streak >= 3) add('streak-3', 'On a roll', `${f.activity.streak} consecutive active days.`);
  if (f.standing && f.standing.of >= 3 && f.standing.rank <= 3) add('top-3', `Top 3 in ${f.programs[0] || 'your program'}`, `Ranked #${f.standing.rank} of ${f.standing.of}.`, f.standing.rank === 1 ? 'gold' : 'standard');
  if (f.standing && f.standing.movement >= 2) add('climber', 'Climber', `Up ${f.standing.movement} places since a week ago.`);
  if (f.deadlines.overdue === 0 && f.deadlines.missedQuizzes === 0 && f.completion.done >= 3) add('all-caught-up', 'All caught up', 'Nothing overdue and no missed quizzes.');
  for (const t of f.topics) {
    if (t.done >= 2 && t.mastery >= 85) add(`topic-${t.topic}`, `Strong in ${t.topic}`, `${t.mastery}% of available ${t.topic} points across ${t.done} resources.`);
  }
  return out;
}

function mentorBadges(f) {
  const out = [];
  const add = (id, label, because, tier = 'standard') => out.push({ id, label, because, tier });
  if (f.published.total >= 10) add('builder', 'Curriculum builder', `Published ${f.published.total} resources.`);
  if (f.published.quiz >= 3) add('quizmaster', 'Quizmaster', `Wrote ${f.published.quiz} quizzes.`);
  if (f.reviews.done >= 5) add('reviewer', 'Steady reviewer', `Reviewed ${f.reviews.done} projects.`);
  if (f.reviews.done >= 3 && f.reviews.medianTurnaroundHours != null && f.reviews.medianTurnaroundHours <= 48) add('fast-feedback', 'Fast feedback', (f.reviews.medianTurnaroundHours < 1 ? 'Median review time under an hour.' : `Median review time ${f.reviews.medianTurnaroundHours} hours.`), 'gold');
  if (f.reviews.done >= 3 && f.reviews.feedbackRate >= 80) add('thorough', 'Thorough', `Wrote feedback on ${f.reviews.feedbackRate}% of reviews.`, 'gold');
  if (f.cohort.completionRate != null && f.cohort.completionRate >= 75) add('cohort-on-track', 'Cohort on track', `Mentees completed ${f.cohort.completionRate}% of due work.`);
  return out;
}

module.exports = { menteeBadges, mentorBadges };
