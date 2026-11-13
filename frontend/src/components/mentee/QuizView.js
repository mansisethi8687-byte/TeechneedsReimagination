"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Lock, X } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAction } from "@/lib/useAction";
import { useSession } from "@/lib/session";
import { plural, shortDate, timeOfDay, weekdayDate } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormError } from "@/components/ui/FormError";
import { ErrorState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

const when = (d) => `${weekdayDate(d)}, ${timeOfDay(d)}`;

function useCountdown(endTime, serverTime) {
  // Correct for the device clock being off from the server's.
  const offset = useMemo(() => (serverTime ? new Date(serverTime) - Date.now() : 0), [serverTime]);
  const [left, setLeft] = useState(() => new Date(endTime) - (Date.now() + offset));
  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(endTime) - (Date.now() + offset)), 1000);
    return () => clearInterval(t);
  }, [endTime, offset]);
  return left;
}

function formatLeft(ms) {
  if (ms <= 0) return "Closed";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}:${String(sec).padStart(2, "0")} left`;
}

// ---------- Result (already submitted) ----------
function QuizResult({ quiz, maxScore }) {
  const s = quiz.submission;
  const revealed = s.answersRevealed;
  const pct = s.totalMarks ? Math.round((s.raw / s.totalMarks) * 100) : 0;
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <Card>
        <CardBody className="grid sm:grid-cols-3 gap-5 items-end">
          <div>
            <p className="text-[13px] text-muted">Score</p>
            <p className="tn-display tn-num text-[36px] leading-none mt-2">{s.score}<span className="text-muted text-[16px] font-medium"> / {maxScore}</span></p>
          </div>
          <div>
            <p className="text-[13px] text-muted">Correct</p>
            <p className="tn-display tn-num text-[22px] mt-2">{s.correct}<span className="text-muted text-[15px] font-medium"> of {quiz.questions.length} · {pct}%</span></p>
          </div>
          <p className="text-[13px] text-muted">Submitted {shortDate(s.submittedAt)}, {timeOfDay(s.submittedAt)}. One attempt per quiz, so this is your final score.</p>
        </CardBody>
        <CardBody className="border-t border-line text-sm text-muted flex gap-2">
          <Lock className="size-4 shrink-0 mt-0.5" aria-hidden />
          {revealed ? "The quiz has closed. Here's how each answer was marked."
            : s.answersRevealAt ? `Correct answers are shown after the quiz closes on ${when(s.answersRevealAt)}, so classmates still taking it can't see them.`
            : "Your mentor has chosen not to show the correct answers for this quiz."}
        </CardBody>
      </Card>
      <ol className="flex flex-col gap-3">
        {quiz.questions.map((q, i) => {
          const a = s.answers.find((x) => String(x.questionId) === String(q.id));
          return (
            <li key={q.id}>
              <Card>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-paper font-medium"><span className="text-muted tn-num mr-2">{i + 1}.</span>{q.questionText}</p>
                    {revealed && (a?.correct ? <Badge tone="signal" icon={Check}>Correct</Badge> : <Badge tone="danger" icon={X}>Incorrect</Badge>)}
                  </div>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {q.options.map((opt, j) => {
                      const mine = a?.selectedOptionIndex === j;
                      const right = revealed && q.correctOptionIndex === j;
                      return (
                        <li key={j} className={cn("flex items-center gap-2.5 rounded-[10px] border px-3 py-2 text-sm",
                          right ? "border-signal/50 bg-signal-soft" : mine ? "border-line-strong bg-ink-3" : "border-line")}>
                          <span className={cn("size-4 rounded-full border grid place-items-center shrink-0", mine ? "border-accent" : "border-line-strong")}>
                            {mine && <span className="size-2 rounded-full bg-accent" />}
                          </span>
                          <span className="flex-1 text-paper">{opt}</span>
                          {mine && <span className="text-[12px] text-muted">Your answer</span>}
                          {right && <span className="text-[12px] text-signal">Correct answer</span>}
                        </li>
                      );
                    })}
                  </ul>
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------- Runner ----------
function QuizRunner({ resourceId, quiz, onSubmitted }) {
  const session = useSession();
  const draftKey = `tn-quiz-draft:${session?.user?.id || "me"}:${resourceId}`;
  const [answers, setAnswers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(draftKey) || "{}"); } catch { return {}; }
  });
  const [step, setStep] = useState(0); // questions.length === review step
  const [confirm, setConfirm] = useState(false);
  const left = useCountdown(quiz.endTime, quiz.serverTime);
  const closed = left <= 0;
  const headingRef = useRef(null);
  const total = quiz.questions.length;
  const answered = quiz.questions.filter((q) => Number.isInteger(answers[q.id])).length;
  const unanswered = quiz.questions.map((q, i) => (Number.isInteger(answers[q.id]) ? null : i)).filter((x) => x !== null);
  const reviewing = step === total;
  const q = quiz.questions[step];

  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify(answers)); } catch { /* storage unavailable: answers stay in memory */ }
  }, [answers, draftKey]);
  useEffect(() => { headingRef.current?.focus(); }, [step]);

  const submit = useAction(
    () => api.mentee.submitQuiz(resourceId, quiz.questions.map((x) => ({ questionId: x.id, selectedOptionIndex: answers[x.id] }))),
    { success: (r) => `Submitted · ${r.score}/${r.maxScore} points` },
  );
  const go = useCallback((n) => setStep(Math.max(0, Math.min(total, n))), [total]);

  const doSubmit = async () => {
    const res = await submit.run();
    setConfirm(false);
    if (res) {
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      onSubmitted();
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Sticky progress header */}
      <div className="sticky top-14 lg:top-0 z-10 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-ink/95 backdrop-blur border-b border-line mb-4">
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-paper font-medium">{reviewing ? "Review answers" : `Question ${step + 1} of ${total}`}</span>
          <span className="flex items-center gap-3">
            <span className="text-muted tn-num">{answered}/{total} answered</span>
            <Badge tone={left < 5 * 60 * 1000 ? "urgent" : "neutral"} icon={Clock}><span className="tn-num">{formatLeft(left)}</span></Badge>
          </span>
        </div>
        <div className="h-1 rounded-full bg-ink-3 mt-2.5 overflow-hidden" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
          <div className="h-full bg-accent" style={{ width: `${(answered / total) * 100}%` }} />
        </div>
        <nav aria-label="Jump to question" className="flex flex-wrap gap-1.5 mt-3">
          {quiz.questions.map((x, i) => (
            <button key={x.id} type="button" onClick={() => go(i)} aria-current={i === step ? "step" : undefined}
              aria-label={`Question ${i + 1}${Number.isInteger(answers[x.id]) ? ", answered" : ", not answered"}`}
              className={cn("size-8 rounded-lg text-[13px] tn-num border transition",
                i === step ? "border-accent text-paper bg-accent-soft" : Number.isInteger(answers[x.id]) ? "border-line-strong text-paper bg-ink-3" : "border-line text-muted hover:text-paper")}>
              {i + 1}
            </button>
          ))}
          <button type="button" onClick={() => go(total)} aria-current={reviewing ? "step" : undefined}
            className={cn("h-8 px-3 rounded-lg text-[13px] border", reviewing ? "border-accent bg-accent-soft text-paper" : "border-line text-muted hover:text-paper")}>
            Review
          </button>
        </nav>
      </div>

      {closed && (
        <div role="alert" className="mb-4 rounded-[14px] border border-urgent/40 bg-urgent-soft px-4 py-3 text-sm text-paper flex gap-2">
          <AlertTriangle className="size-4 text-urgent shrink-0 mt-0.5" aria-hidden />
          This quiz closed at {when(quiz.endTime)}. Answers can no longer be submitted.
        </div>
      )}

      {!reviewing ? (
        <Card>
          <CardBody>
            <fieldset>
              <legend ref={headingRef} tabIndex={-1} className="text-[17px] text-paper font-medium leading-snug outline-none">
                {q.questionText}
              </legend>
              <p className="text-[13px] text-muted mt-1">{plural(q.marks || 1, "mark")} · choose one</p>
              <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label={`Question ${step + 1} options`}>
                {q.options.map((opt, j) => {
                  const checked = answers[q.id] === j;
                  return (
                    <label key={j} className={cn("flex items-center gap-3 rounded-[12px] border px-4 py-3 cursor-pointer transition",
                      "focus-within:ring-2 focus-within:ring-accent/40",
                      checked ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong")}>
                      <input type="radio" name={`q-${q.id}`} className="sr-only" checked={checked} disabled={closed}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: j }))} />
                      <span aria-hidden className={cn("size-5 rounded-full border-2 grid place-items-center shrink-0", checked ? "border-accent" : "border-line-strong")}>
                        {checked && <span className="size-2.5 rounded-full bg-accent" />}
                      </span>
                      <span className="text-paper">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex items-center justify-between gap-2 mt-6">
              <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0}><ArrowLeft className="size-4" aria-hidden /> Previous</Button>
              <Button variant={Number.isInteger(answers[q.id]) ? "primary" : "secondary"} onClick={() => go(step + 1)}>
                {step === total - 1 ? "Review answers" : "Next"} <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <h2 ref={headingRef} tabIndex={-1} className="tn-heading text-[17px] outline-none">Ready to submit?</h2>
            <p className="text-sm text-muted mt-1">You get one attempt. Your score is final once you submit.</p>
            <ol className="mt-4 divide-y divide-line border border-line rounded-[12px]">
              {quiz.questions.map((x, i) => {
                const sel = answers[x.id];
                return (
                  <li key={x.id}>
                    <button type="button" onClick={() => go(i)} className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-ink-3/50">
                      <span className="text-muted tn-num w-6 shrink-0">{i + 1}.</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-paper truncate">{x.questionText}</span>
                        <span className={cn("block text-[13px]", Number.isInteger(sel) ? "text-muted" : "text-urgent")}>
                          {Number.isInteger(sel) ? x.options[sel] : "Not answered"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {unanswered.length > 0 && (
              <p className="text-sm text-urgent mt-3">Answer {plural(unanswered.length, "more question")} before submitting.</p>
            )}
            <p className="text-[13px] text-muted mt-3">Your answers are saved on this device until you submit.</p>
            <FormError error={submit.error} />
            <div className="flex items-center justify-between gap-2 mt-5">
              <Button variant="ghost" onClick={() => go(total - 1)}><ArrowLeft className="size-4" aria-hidden /> Back</Button>
              <Button size="lg" onClick={() => setConfirm(true)} disabled={unanswered.length > 0 || closed}>Submit quiz</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={doSubmit} pending={submit.pending}
        title="Submit your answers?" confirmLabel="Submit">
        You&apos;ve answered all {total} questions. There&apos;s one attempt, so you can&apos;t change answers after this.
      </ConfirmDialog>
    </div>
  );
}

// ---------- Entry ----------
export function QuizView({ data, onChanged }) {
  const { resource: r, quizWindow: w, status } = data;
  const submitted = status === "completed";
  const canStart = w?.state === "open" && !r.isLocked;
  const [started, setStarted] = useState(false);
  const quiz = useApi(() => api.mentee.quiz(r._id), [r._id, submitted], { enabled: submitted || started });

  if (submitted || started) {
    if (quiz.error) return <ErrorState error={quiz.error} onRetry={quiz.reload} />;
    if (!quiz.data || quiz.loading) return <div className="space-y-3 max-w-3xl"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
    if (quiz.data.submission) return <QuizResult quiz={quiz.data} maxScore={r.maxScore} />;
    return <QuizRunner resourceId={r._id} quiz={quiz.data} onSubmitted={onChanged} />;
  }

  return (
    <Card className="max-w-2xl">
      <CardBody>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[["Questions", data.questionCount], ["Marks", data.totalMarks], ["Max score", r.maxScore], ["Attempts", 1]].map(([k, v]) => (
            <div key={k}><dt className="text-[13px] text-muted">{k}</dt><dd className="tn-display tn-num text-[22px] mt-1">{v}</dd></div>
          ))}
        </dl>
        <ul className="mt-5 text-sm text-muted space-y-1.5 border-t border-line pt-4">
          <li>Opens {when(w.startTime)} · closes {when(w.endTime)}.</li>
          <li>Pick one answer per question. Every question must be answered to submit.</li>
          <li>Graded on the server. Your score is scaled to {r.maxScore} points.</li>
          <li>{data.revealsAnswers ? "Correct answers are shown after the quiz closes." : "Your mentor doesn't show correct answers for this quiz."}</li>
        </ul>
        {r.description && <p className="text-sm text-paper mt-4 whitespace-pre-line">{r.description}</p>}
        <div className="mt-6">
          {canStart ? (
            <Button size="lg" onClick={() => setStarted(true)}>Start quiz <ArrowRight className="size-4" aria-hidden /></Button>
          ) : (
            <p className="flex items-center gap-2 text-sm text-paper">
              {r.isLocked ? <><Lock className="size-4 text-muted" aria-hidden /> Your mentor has locked this quiz for now.</>
                : w.state === "upcoming" ? <><Clock className="size-4 text-muted" aria-hidden /> Opens {when(w.startTime)}.</>
                : <><CheckCircle2 className="size-4 text-muted" aria-hidden /> This quiz closed on {when(w.endTime)} and wasn&apos;t submitted.</>}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
