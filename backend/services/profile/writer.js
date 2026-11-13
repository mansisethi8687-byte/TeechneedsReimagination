// Turns a fact sheet into a short narrative: summary, strengths, focus areas
// and recommendations. Three engines, same output shape:
//   rules  - deterministic sentences built from the facts (always available)
//   gemini - Google Gemini via REST, if GEMINI_API_KEY is set
//   claude - Anthropic Claude via the official SDK, if ANTHROPIC_API_KEY is set
// LLMs only see the fact sheet (first name, no email or enrollment number),
// and their output is validated: recommendations may only point at resource
// ids that exist in the facts. Any failure falls back to the rules engine.
const { z } = require('zod');

const NarrativeSchema = z.object({
  summary: z.string().min(1).max(700),
  strengths: z.array(z.string().min(1).max(200)).max(3),
  focus: z.array(z.string().min(1).max(200)).max(3),
  recommendations: z.array(z.object({
    title: z.string().min(1).max(120),
    why: z.string().min(1).max(260),
    resourceId: z.string().nullable(),
  })).max(3),
});

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const hours = (h) => (h < 1 ? 'under an hour' : `${h} ${h === 1 ? 'hour' : 'hours'}`);

// ---------------- rules ----------------

function menteeRecommendations(f) {
  const recs = [];
  const used = new Set();
  const push = (r) => { if (r.resourceId && used.has(r.resourceId)) return; if (r.resourceId) used.add(r.resourceId); recs.push(r); };

  const overdue = f.open.filter((o) => o.overdue);
  if (overdue[0]) {
    push({ title: `Finish “${overdue[0].title}”`, why: `It's overdue, and ${overdue[0].type === 'video' ? 'videos lose a point for every day late' : 'your mentor sees it as late'}.`, resourceId: overdue[0].resourceId });
  }
  if (f.weakest) {
    const inWeak = f.open.find((o) => o.tags.includes(f.weakest.topic) && !used.has(o.resourceId));
    if (inWeak) push({ title: `Do “${inWeak.title}” next`, why: `${f.weakest.topic} is your lowest topic at ${f.weakest.mastery}% of available points.`, resourceId: inWeak.resourceId });
  }
  const interestHit = f.open.find((o) => !used.has(o.resourceId) && o.tags.some((t) => f.interests.includes(t)));
  if (interestHit) push({ title: `Start “${interestHit.title}”`, why: `It matches your interest in ${interestHit.tags.find((t) => f.interests.includes(t))}.`, resourceId: interestHit.resourceId });
  const soonest = f.open.find((o) => !o.overdue && !used.has(o.resourceId));
  if (soonest && recs.length < 3) push({ title: `“${soonest.title}” is due ${soonest.daysLeft <= 1 ? 'tomorrow' : `in ${soonest.daysLeft} days`}`, why: `Worth ${soonest.maxScore} points. Getting it in early protects your streak.`, resourceId: soonest.resourceId });
  if (recs.length < 3 && f.deadlines.onTimeRate != null && f.deadlines.onTimeRate < 80) {
    recs.push({ title: 'Start projects earlier', why: `${f.deadlines.onTimeRate}% of your work was on time. Starting two days early would move most of the rest inside the deadline.`, resourceId: null });
  }
  if (recs.length < 3 && f.interestsUncovered.length) {
    recs.push({ title: `Ask your mentor about ${f.interestsUncovered[0]}`, why: `It's one of your interests, but nothing in your program covers it yet.`, resourceId: null });
  }
  return recs.slice(0, 3);
}

function menteeRules(f) {
  const s = [];
  if (f.completion.done === 0) {
    s.push(`${f.firstName} hasn't completed anything yet in ${f.programs[0] || 'their program'}.`);
  } else {
    s.push(`${f.firstName} has completed ${f.completion.done} of ${f.completion.total} resources and earned ${f.points.earned} of ${f.points.available} available points${f.points.rate != null ? ` (${f.points.rate}%)` : ''}.`);
  }
  if (f.standing) s.push(`Currently #${f.standing.rank} of ${f.standing.of}${f.standing.movement > 0 ? `, up ${f.standing.movement} this week` : f.standing.movement < 0 ? `, down ${-f.standing.movement} this week` : ''}.`);
  if (f.strongest) s.push(`Strongest topic: ${f.strongest.topic} (${f.strongest.mastery}%).`);
  if (f.quizzes.taken) s.push(`Quiz accuracy averages ${f.quizzes.avgAccuracy}% over ${plural(f.quizzes.taken, 'quiz', 'quizzes')}.`);
  if (f.deadlines.onTimeRate != null) s.push(`${f.deadlines.onTimeRate}% of work went in on time.`);

  const strengths = [];
  if (f.strongest && f.strongest.done) strengths.push(`${f.strongest.topic}: ${f.strongest.mastery}% of available points over ${plural(f.strongest.done, 'resource')}.`);
  if (f.quizzes.avgAccuracy >= 80) strengths.push(`Quizzes: ${f.quizzes.avgAccuracy}% average accuracy.`);
  if (f.projects.avgScore >= 80) strengths.push(`Projects: mentors scored them ${f.projects.avgScore}% on average.`);
  if (f.deadlines.onTimeRate >= 90 && f.deadlines.onTime >= 3) strengths.push(`Reliability: ${f.deadlines.onTime} of ${f.deadlines.onTime + f.deadlines.late} on time.`);
  if (f.activity.streak >= 3) strengths.push(`Consistency: a ${f.activity.streak}-day streak.`);

  const focus = [];
  if (f.weakest && f.weakest.mastery < 70) focus.push(`${f.weakest.topic}: ${f.weakest.mastery}% of available points so far.`);
  if (f.deadlines.overdue) focus.push(`${plural(f.deadlines.overdue, 'item')} overdue.`);
  if (f.deadlines.missedQuizzes) focus.push(`${plural(f.deadlines.missedQuizzes, 'quiz', 'quizzes')} closed without an attempt.`);
  if (f.quizzes.taken && f.quizzes.avgAccuracy < 70) focus.push(`Quiz accuracy is ${f.quizzes.avgAccuracy}%. Rewatch the related video before the next one.`);
  if (f.feedback[0]) focus.push(`From your mentor on “${f.feedback[0].title}”: ${f.feedback[0].text}`);

  return { summary: s.join(' '), strengths: strengths.slice(0, 3), focus: focus.slice(0, 3), recommendations: menteeRecommendations(f) };
}

function mentorRules(f) {
  const s = [];
  s.push(`${f.firstName} mentors ${plural(f.mentees, 'mentee')} across ${f.programs.join(' and ') || 'no programs yet'}, with ${plural(f.published.total, 'published resource')}.`);
  if (f.reviews.done) s.push(`Reviewed ${plural(f.reviews.done, 'project')}${f.reviews.medianTurnaroundHours != null ? `, typically within ${hours(f.reviews.medianTurnaroundHours)}` : ''}, with written feedback on ${f.reviews.feedbackRate}%.`);
  if (f.cohort.completionRate != null) s.push(`The cohort has completed ${f.cohort.completionRate}% of work that's already due.`);

  const strengths = [];
  if (f.reviews.feedbackRate >= 80 && f.reviews.done >= 3) strengths.push(`Feedback on ${f.reviews.feedbackRate}% of reviews.`);
  if (f.reviews.medianTurnaroundHours != null && f.reviews.medianTurnaroundHours <= 48) strengths.push(`Fast reviews: median ${hours(f.reviews.medianTurnaroundHours)}.`);
  if (f.published.total >= 5) strengths.push(`A full curriculum: ${plural(f.published.video, 'video')}, ${plural(f.published.quiz, 'quiz', 'quizzes')}, ${plural(f.published.project, 'project')}.`);

  const focus = [];
  if (f.reviews.pending) focus.push(`${plural(f.reviews.pending, 'project')} waiting, the oldest for ${plural(f.reviews.oldestPendingDays, 'day')}.`);
  if (f.cohort.inactive.length) focus.push(`${plural(f.cohort.inactive.length, 'mentee')} inactive for over a week.`);
  if (f.weakestCohortTopic && f.weakestCohortTopic.cohortMastery < 60) focus.push(`The cohort is at ${f.weakestCohortTopic.cohortMastery}% on ${f.weakestCohortTopic.topic}.`);

  const recs = [];
  if (f.pendingList[0]) recs.push({ title: `Review ${f.pendingList[0].mentee}'s “${f.pendingList[0].title}”`, why: 'It has been waiting the longest. Mentees see feedback on their project page.', resourceId: f.pendingList[0].resourceId });
  if (f.cohort.inactive.length) recs.push({ title: `Check in with ${f.cohort.inactive.slice(0, 2).map((m) => m.name.split(' ')[0]).join(' and ')}`, why: 'No activity in the last 7 days.', resourceId: null });
  if (f.weakestCohortTopic && f.weakestCohortTopic.cohortMastery < 60) recs.push({ title: `Add a short ${f.weakestCohortTopic.topic} video or quiz`, why: `The cohort has earned ${f.weakestCohortTopic.cohortMastery}% of available ${f.weakestCohortTopic.topic} points.`, resourceId: null });
  return { summary: s.join(' '), strengths: strengths.slice(0, 3), focus: focus.slice(0, 3), recommendations: recs.slice(0, 3) };
}

function rulesWriter(facts) {
  return facts.kind === 'mentor' ? mentorRules(facts) : menteeRules(facts);
}

// ---------------- LLM ----------------

const INSTRUCTIONS = `You write the narrative section of a learning profile on TechNeeds, a cohort mentorship platform at IGDTUW (a women's engineering university in Delhi).
Use ONLY the facts in the JSON you are given. Never invent numbers, topics, resources or events. Quote numbers exactly as they appear.
Write in plain, warm, specific English, second person ("you") for a mentee profile and third person for a mentor profile. No hype words, no emojis.
Return JSON with:
- summary: 2-4 sentences, at most 90 words, naming the strongest evidence.
- strengths: up to 3 short items, each citing a number from the facts.
- focus: up to 3 short items, each actionable and citing a number from the facts.
- recommendations: up to 3 items {title, why, resourceId}. resourceId MUST be one of the ids in "candidates", or null for advice that isn't a specific resource.`;

function promptPayload(facts) {
  const candidates = facts.kind === 'mentor'
    ? (facts.pendingList || []).map((p) => ({ id: p.resourceId, title: p.title, note: `pending review for ${p.mentee}` }))
    : (facts.open || []).slice(0, 8).map((o) => ({ id: o.resourceId, title: o.title, type: o.type, tags: o.tags, overdue: o.overdue, daysLeft: o.daysLeft, maxScore: o.maxScore }));
  const { open, pendingList, ...rest } = facts; // eslint-disable-line no-unused-vars
  return { facts: rest, candidates };
}

// Every number the writer uses should come from the facts. Collect the
// numbers present in the fact sheet (and simple derivations a writer may use:
// "out of" totals and counts of list items), then report any number in the
// narrative that isn't among them. This is surfaced on the profile.
function factNumbers(facts) {
  const nums = new Set();
  const walk = (v) => {
    if (typeof v === 'number') nums.add(String(Math.round(v * 100) / 100));
    else if (typeof v === 'string') (v.match(/\d+(?:\.\d+)?/g) || []).forEach((n) => nums.add(n));
    else if (Array.isArray(v)) { nums.add(String(v.length)); v.forEach(walk); }
    else if (v && typeof v === 'object') {
      // Field names carry numbers too ("activeDays14" -> "in the last 14 days").
      Object.keys(v).forEach((k) => (k.match(/\d+/g) || []).forEach((n) => nums.add(n)));
      Object.values(v).forEach(walk);
    }
  };
  walk(facts);
  return nums;
}

function ungroundedNumbers(narrative, facts) {
  const known = factNumbers(facts);
  const text = [narrative.summary, ...narrative.strengths, ...narrative.focus, ...narrative.recommendations.flatMap((r) => [r.title, r.why])].join(' ');
  const found = (text.match(/\d+(?:\.\d+)?/g) || []);
  return [...new Set(found.filter((n) => !known.has(n) && !known.has(String(Number(n)))))];
}

function validate(raw, facts) {
  const parsed = NarrativeSchema.parse(raw);
  const allowed = new Set(facts.kind === 'mentor' ? (facts.pendingList || []).map((p) => p.resourceId) : (facts.open || []).map((o) => o.resourceId));
  const dropped = parsed.recommendations.filter((r) => r.resourceId && !allowed.has(r.resourceId)).length;
  const recommendations = parsed.recommendations.filter((r) => !r.resourceId || allowed.has(r.resourceId));
  const narrative = { ...parsed, recommendations };
  return { narrative, droppedRecommendations: dropped, ungroundedNumbers: ungroundedNumbers(narrative, facts) };
}

// Gemini: REST generateContent with a JSON response. Free-tier Flash models
// are often overloaded or out of daily quota, so try a short chain of them
// (each has its own quota), lightest first: this is a three-sentence write-up.
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'];

async function geminiOnce(facts, { apiKey, model, fetchImpl, timeoutMs }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(promptPayload(facts)) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4,
        maxOutputTokens: 4096,
        // Low thinking: the facts are given; the model only has to phrase them.
        thinkingConfig: { thinkingLevel: 'LOW' },
      },
    }),
  });
  if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const body = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text || '').join('') || '';
  if (!text) throw new Error(`${model} returned no text (finishReason ${body?.candidates?.[0]?.finishReason || 'unknown'})`);
  return { ...validate(JSON.parse(text), facts), engine: 'gemini', model: body.modelVersion || model };
}

async function geminiWriter(facts, {
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL,
  models = model ? [model] : (process.env.GEMINI_MODELS ? process.env.GEMINI_MODELS.split(',').map((m) => m.trim()) : GEMINI_MODELS),
  fetchImpl = fetch,
  timeoutMs = 40000,
} = {}) {
  const errors = [];
  for (const m of models) {
    try {
      const out = await geminiOnce(facts, { apiKey, model: m, fetchImpl, timeoutMs });
      return { ...out, attempts: [...errors, `${m} ok`] };
    } catch (err) {
      errors.push(err.name === 'TimeoutError' || err.name === 'AbortError' ? `${m} timed out after ${timeoutMs / 1000}s` : err.message);
    }
  }
  throw new Error(`Gemini: ${errors.join('; ')}`);
}

// Claude: official SDK, structured output validated by the same schema.
async function claudeWriter(facts, { model = process.env.CLAUDE_MODEL || 'claude-opus-5-5', client } = {}) {
  const Anthropic = require('@anthropic-ai/sdk');
  const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
  const c = client || new Anthropic();
  const response = await c.messages.parse({
    model,
    max_tokens: 16000,
    // A short narrative from a fact sheet: low effort is enough and keeps cost down.
    output_config: { effort: 'low', format: zodOutputFormat(NarrativeSchema) },
    system: INSTRUCTIONS,
    messages: [{ role: 'user', content: JSON.stringify(promptPayload(facts)) }],
  });
  if (response.stop_reason === 'refusal') throw new Error(`Claude declined (${response.stop_details?.category || 'no category'})`);
  if (!response.parsed_output) throw new Error(`Claude returned no parseable output (stop_reason ${response.stop_reason})`);
  return { ...validate(response.parsed_output, facts), engine: 'claude', model: response.model || model };
}

function configuredEngine() {
  const forced = process.env.PROFILE_ENGINE; // rules | gemini | claude
  if (forced) return forced;
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return 'rules';
}

// Never throws: an LLM failure is recorded and the rules engine answers.
async function writeNarrative(facts, opts = {}) {
  const engine = opts.engine || configuredEngine();
  if (engine !== 'rules') {
    try {
      const out = engine === 'claude' ? await claudeWriter(facts, opts) : await geminiWriter(facts, opts);
      // Keep the profile useful even if the model offered no valid recommendations.
      if (!out.narrative.recommendations.length) out.narrative.recommendations = rulesWriter(facts).recommendations;
      return { ...out, fallbackReason: null };
    } catch (err) {
      return { narrative: rulesWriter(facts), engine: 'rules', model: null, fallbackReason: `${engine} unavailable: ${err.message}`.slice(0, 300), droppedRecommendations: 0 };
    }
  }
  return { narrative: rulesWriter(facts), engine: 'rules', model: null, fallbackReason: null, droppedRecommendations: 0 };
}

module.exports = { ungroundedNumbers, writeNarrative, rulesWriter, geminiWriter, claudeWriter, validate, configuredEngine, NarrativeSchema, promptPayload, GEMINI_MODELS };
