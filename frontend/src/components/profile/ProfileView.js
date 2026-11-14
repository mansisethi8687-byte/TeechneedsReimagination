"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Award, CheckCircle2, Cpu, Loader2, MessageSquareText, Plus, RefreshCw, Sparkles, Workflow, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAction } from "@/lib/useAction";
import { relativeDays, shortDate, timeOfDay, plural } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

import { LearnerPerformance } from "./LearnerPerformance";

const POLL_MS = 1500;
const POLL_LIMIT_MS = 200000; // Gemini model chain can take up to ~2 minutes

const ENGINE = {
  gemini: (m) => `Written by Google Gemini${m ? ` (${m})` : ""} from the facts below`,
  claude: (m) => `Written by Claude${m ? ` (${m})` : ""} from the facts below`,
  rules: () => "Written by the rules engine from the facts below",
};

function Provenance({ snap }) {
  const when = snap.completedAt || snap.createdAt;
  return (
    <div className="text-[13px] text-muted space-y-1">
      <p className="flex items-center gap-1.5"><Sparkles className="size-3.5 shrink-0" aria-hidden /> {ENGINE[snap.engine]?.(snap.model) || "Generated"}</p>
      <p className="flex items-center gap-1.5">
        {snap.runner === "render-workflow" ? <Workflow className="size-3.5 shrink-0" aria-hidden /> : <Cpu className="size-3.5 shrink-0" aria-hidden />}
        {snap.runner === "render-workflow" ? "Ran as a Render Workflow task" : "Ran inside the API"}
      </p>
      {snap.runner === "render-workflow" && snap.runId && <p className="pl-5 tn-code text-[12px] break-all">{snap.runId}</p>}
      {snap.engine !== "rules" && (
        snap.ungroundedNumbers?.length
          ? <p className="text-urgent">Check: {snap.ungroundedNumbers.join(", ")} in the summary {snap.ungroundedNumbers.length === 1 ? "isn't" : "aren't"} in the record.</p>
          : <p className="flex items-center gap-1.5 text-signal"><CheckCircle2 className="size-3.5 shrink-0" aria-hidden /> Every number checked against the record</p>
      )}
      <p>Generated {shortDate(when)}, {timeOfDay(when)}</p>
      {snap.fallbackReason && <p className="text-urgent">AI writer unavailable, so the rules engine wrote this ({snap.fallbackReason.replace(/^.*unavailable: /, "")}).</p>}
      {snap.workflowError && <p className="text-urgent">Render Workflow didn&apos;t finish, so the API generated it instead ({snap.workflowError}).</p>}
    </div>
  );
}

function Movement({ value }) {
  if (value == null || value === 0) return null;
  return value > 0
    ? <span className="inline-flex items-center text-signal text-[13px] tn-num"><ArrowUp className="size-3.5" aria-hidden />{value}</span>
    : <span className="inline-flex items-center text-urgent text-[13px] tn-num"><ArrowDown className="size-3.5" aria-hidden />{-value}</span>;
}

function Evidence({ items }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {items.filter(Boolean).map((it) => (
        <div key={it.label} className="bg-ink-2 border border-line rounded-[14px] p-4 min-w-0">
          <p className="text-[13px] text-muted truncate">{it.label}</p>
          <p className="tn-display tn-num text-[24px] mt-2 leading-none flex items-baseline gap-1.5">
            {it.value ?? "—"}{it.suffix && <span className="text-muted text-[14px] font-medium">{it.suffix}</span>}{it.extra}
          </p>
          <p className="text-[12px] text-muted mt-2 truncate" title={it.source}>{it.source}</p>
        </div>
      ))}
    </div>
  );
}

function Interests({ initial, editable, onSaved }) {
  const [tags, setTags] = useState(initial || []);
  const [draft, setDraft] = useState("");
  const save = useAction((next) => api.mentee.updateMe({ interests: next }), { toastErrors: true });
  useEffect(() => setTags(initial || []), [initial]);
  const commit = async (next) => { const res = await save.run(next); if (res) { setTags(res.interests); onSaved?.(); } };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full border border-line text-[13px] text-paper">
          {t}
          {editable && <button onClick={() => commit(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="text-muted hover:text-paper"><X className="size-3.5" /></button>}
        </span>
      ))}
      {!tags.length && !editable && <span className="text-[13px] text-muted">No interests listed</span>}
      {editable && (
        <form onSubmit={(e) => { e.preventDefault(); const v = draft.trim().toLowerCase(); if (v && !tags.includes(v)) { commit([...tags, v]); setDraft(""); } }} className="flex items-center gap-1">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add interest" aria-label="Add an interest" className="h-7 w-32 text-[13px] px-2.5" maxLength={32} />
          <Button type="submit" size="sm" variant="ghost" className="h-7 px-2" disabled={!draft.trim() || save.pending} aria-label="Add interest"><Plus className="size-4" /></Button>
        </form>
      )}
    </div>
  );
}

function TopicBars({ topics, kind }) {
  if (!topics?.length) return <p className="text-sm text-muted">No topic-tagged work is due yet.</p>;
  return (
    <ul className="space-y-3">
      {topics.map((t) => {
        const value = kind === "mentor" ? t.cohortMastery : t.mastery;
        return (
          <li key={t.topic}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-paper">{t.topic}</span>
              <span className="text-[13px] text-muted tn-num">
                {kind === "mentor"
                  ? <>{plural(t.resources, "resource")} · cohort {value == null ? "—" : `${value}%`}</>
                  : <>{t.earned}/{t.available} pts · {t.done}/{t.total} done · <span className="text-paper">{value}%</span></>}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-ink-3 mt-1.5 overflow-hidden" role="meter" aria-label={`${t.topic}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? 0}>
              <div className="h-full rounded-full bg-accent" style={{ width: `${value ?? 0}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function recLink(kind, viewerIsSelf, r) {
  if (!r.resourceId) return null;
  if (kind === "mentee" && viewerIsSelf) return `/dashboard/resources/${r.resourceId}`;
  if (kind === "mentor") return "/mentor/review";
  return null;
}

export function ProfileView({ kind, id, subtitle }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [job, setJob] = useState(null); // snapshot in flight
  const startedAt = useRef(0);
  const generate = useAction((force) => api.profile.generate(kind, id, force), { toastErrors: true });

  const load = useCallback(async () => {
    try {
      const data = await api.profile.get(kind, id);
      setState({ loading: false, error: null, data });
      if (data.pending) { setJob(data.pending); startedAt.current = Date.now(); }
      return data;
    } catch (error) {
      setState({ loading: false, error, data: null });
      return null;
    }
  }, [kind, id]);

  const run = useCallback(async (force = false) => {
    const res = await generate.run(force);
    if (!res) return;
    if (["ready", "failed"].includes(res.snapshot.status)) { setJob(null); await load(); }
    else { setJob(res.snapshot); startedAt.current = Date.now(); }
  }, [generate, load]);

  // First visit to your own profile: generate it.
  useEffect(() => {
    load().then((d) => { if (d && !d.latest && !d.pending && d.canGenerate && d.self) run(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id]);

  // Poll a workflow run until the snapshot is ready (or failed).
  useEffect(() => {
    if (!job || ["ready", "failed"].includes(job.status)) return;
    const t = setTimeout(async () => {
      try {
        const s = await api.profile.job(job.id);
        if (s.status === "ready" || s.status === "failed") { setJob(null); load(); }
        else if (Date.now() - startedAt.current > POLL_LIMIT_MS) setJob({ ...s, status: "failed", error: "Still running after 3 minutes. Try again shortly." });
        else setJob(s);
      } catch { setJob((j) => ({ ...j })); }
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [job, load]);

  if (state.loading) return <PageSkeleton />;
  if (state.error) return <ErrorState error={state.error} onRetry={load} />;
  const { latest: snap, canGenerate, self, subject, pipeline } = state.data;
  const busy = generate.pending || (job && !["ready", "failed"].includes(job.status));

  const runningNote = busy && (
    <div role="status" className="rounded-[14px] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-paper flex items-center gap-2.5">
      <Loader2 className="size-4 animate-spin text-accent shrink-0" aria-hidden />
      {job?.runner === "render-workflow"
        ? <>Generating on Render Workflows · task run <span className="tn-code">{job.runId}</span> · {job.status}</>
        : "Generating your profile…"}
    </div>
  );

  if (!snap) {
    return (
      <div className="space-y-4">
        {kind === "mentee" && <LearnerPerformance data={state.data.performance} />}
        {runningNote}
        {!busy && (
          <Card>
            <EmptyState icon={Sparkles} title="No profile yet"
              action={canGenerate && <Button onClick={() => run()}><Sparkles className="size-4" aria-hidden /> Generate profile</Button>}>
              The profile is built from completed work, quiz results, mentor reviews, leaderboard standing and interests.
            </EmptyState>
          </Card>
        )}
        {busy && <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>}
        {job?.status === "failed" && <ErrorState error={{ message: job.error || "Generation failed." }} onRetry={() => run(true)} />}
      </div>
    );
  }

  const f = snap.facts;
  const n = snap.narrative;
  const isMentee = kind === "mentee";

  const evidence = isMentee ? [
    { label: "Points", value: f.points.earned, suffix: `/ ${f.points.available}`, source: `${f.points.rate ?? 0}% of points available so far` },
    f.standing && { label: "Rank", value: `#${f.standing.rank}`, suffix: `of ${f.standing.of}`, extra: <Movement value={f.standing.movement} />, source: `${f.programs[0]} leaderboard` },
    { label: "On time", value: f.deadlines.onTimeRate ?? "—", suffix: f.deadlines.onTimeRate != null ? "%" : "", source: `${f.deadlines.onTime} of ${f.deadlines.onTime + f.deadlines.late} before the deadline` },
    { label: "Quiz accuracy", value: f.quizzes.avgAccuracy ?? "—", suffix: f.quizzes.avgAccuracy != null ? "%" : "", source: `${plural(f.quizzes.taken, "graded quiz", "graded quizzes")}` },
    { label: "Project score", value: f.projects.avgScore ?? "—", suffix: f.projects.avgScore != null ? "%" : "", source: `${f.projects.reviewed} reviewed · ${f.projects.pendingReview} pending` },
  ] : [
    { label: "Mentees", value: f.mentees, source: f.programs.join(", ") },
    { label: "Published", value: f.published.total, source: `${plural(f.published.video, "video")} · ${plural(f.published.quiz, "quiz", "quizzes")} · ${plural(f.published.project, "project")}` },
    { label: "Reviews", value: f.reviews.done, source: `${f.reviews.pending} pending` },
    { label: "Median review time", value: f.reviews.medianTurnaroundHours == null ? "—" : f.reviews.medianTurnaroundHours < 1 ? "<1" : f.reviews.medianTurnaroundHours, suffix: f.reviews.medianTurnaroundHours != null ? "h" : "", source: "Submission to score" },
    { label: "Cohort completion", value: f.cohort.completionRate ?? "—", suffix: f.cohort.completionRate != null ? "%" : "", source: "Of work that's already due" },
  ];

  return (
    <div className="space-y-4">
      {runningNote}

      {/* Identity */}
      <Card>
        <CardBody className="flex flex-col md:flex-row gap-6 md:items-center">
          <div className="size-28 shrink-0 text-paper" dangerouslySetInnerHTML={{ __html: snap.avatarSvg }} />
          <div className="min-w-0 flex-1">
            <h2 className="tn-display text-[24px]">{subject.name}</h2>
            <p className="text-sm text-muted mt-0.5">{subtitle || (isMentee ? f.programs.join(", ") : `Mentor · ${f.programs.join(", ")}`)}</p>
            <p className="text-[12px] text-muted mt-2">Avatar generated from {isMentee ? "your topic mastery" : "the topics you publish"}: one ring per topic, filled to the percentage.</p>
            <div className="mt-3">
              {isMentee
                ? <Interests initial={f.interests} editable={self} onSaved={() => {}} />
                : f.expertise?.length > 0 && <div className="flex flex-wrap gap-1.5">{f.expertise.map((e) => <Badge key={e}>{e}</Badge>)}</div>}
            </div>
          </div>
          <div className="md:w-80 shrink-0 space-y-3">
            <Provenance snap={snap} />
            {canGenerate && (
              <Button variant="secondary" size="sm" onClick={() => run(true)} loading={busy} disabled={busy}>
                <RefreshCw className="size-4" aria-hidden /> Regenerate
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <Evidence items={evidence} />
      {isMentee && <LearnerPerformance data={state.data.performance} />}

      {/* Narrative */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start [&>*]:min-w-0">
        <Card>
          <CardHeader title="Summary" />
          <CardBody className="pt-3 space-y-5">
            <p className="text-[15px] text-paper leading-relaxed">{n.summary}</p>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <h3 className="text-[13px] text-muted mb-2">Strengths</h3>
                {n.strengths.length ? <ul className="space-y-2">{n.strengths.map((s) => <li key={s} className="text-sm text-paper flex gap-2"><span className="mt-2 size-1.5 rounded-full bg-signal shrink-0" aria-hidden />{s}</li>)}</ul>
                  : <p className="text-sm text-muted">Not enough scored work yet.</p>}
              </div>
              <div>
                <h3 className="text-[13px] text-muted mb-2">Focus next</h3>
                {n.focus.length ? <ul className="space-y-2">{n.focus.map((s) => <li key={s} className="text-sm text-paper flex gap-2"><span className="mt-2 size-1.5 rounded-full bg-urgent shrink-0" aria-hidden />{s}</li>)}</ul>
                  : <p className="text-sm text-muted">Nothing stands out.</p>}
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recommended next" description={isMentee ? "Linked to real resources in your program." : "From the review queue and cohort activity."} />
          <ul className="divide-y divide-line mt-3 border-t border-line">
            {n.recommendations.map((r) => {
              const href = recLink(kind, self, r);
              const body = (
                <>
                  <span className="block text-paper font-medium">{r.title}</span>
                  <span className="block text-[13px] text-muted mt-0.5">{r.why}</span>
                </>
              );
              return (
                <li key={r.title}>
                  {href ? (
                    <Link href={href} className="flex items-start gap-3 px-5 py-3.5 hover:bg-ink-3/40">
                      <span className="flex-1 min-w-0">{body}</span><ArrowRight className="size-4 text-muted mt-1 shrink-0" aria-hidden />
                    </Link>
                  ) : <div className="px-5 py-3.5">{body}</div>}
                </li>
              );
            })}
            {!n.recommendations.length && <li className="px-5 py-4 text-sm text-muted">Nothing to recommend right now.</li>}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start [&>*]:min-w-0">
        <Card>
          <CardHeader title={isMentee ? "Topic mastery" : "Topics you publish"}
            description={isMentee ? "Points earned out of points available on work that's done or due." : "With the cohort's share of available points on each."} />
          <CardBody className="pt-4"><TopicBars topics={f.topics} kind={kind} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Badges" description="Awarded by fixed rules, never by the AI." />
          {snap.badges.length ? (
            <ul className="divide-y divide-line mt-3 border-t border-line">
              {snap.badges.map((b) => (
                <li key={b.id} className="px-5 py-3 flex gap-3">
                  <Award className={cn("size-5 shrink-0 mt-0.5", b.tier === "gold" ? "text-accent" : "text-muted")} aria-hidden />
                  <span><span className="block text-paper font-medium">{b.label}</span><span className="block text-[13px] text-muted">{b.because}</span></span>
                </li>
              ))}
            </ul>
          ) : <CardBody className="pt-3 text-sm text-muted">No badges yet. They unlock from completed work.</CardBody>}
        </Card>
      </div>

      <details className="rounded-[14px] border border-line bg-ink-2 px-5 py-4 text-sm text-muted">
        <summary className="cursor-pointer text-paper">How this profile was made</summary>
        <ol className="mt-3 space-y-2 list-decimal pl-5">
          <li>Facts are computed from saved records: completions, graded quiz attempts, mentor reviews and feedback, deadlines, the leaderboard and interests. Nothing is estimated.</li>
          <li>Badges come from fixed rules. Each one shows the numbers that earned it.</li>
          <li>The avatar is drawn from the topic numbers, so it changes as {isMentee ? "you learn" : "the curriculum grows"}.</li>
          <li>{snap.engine === "rules"
            ? "The summary and recommendations were written by a deterministic rules engine."
            : `An AI model (${snap.model}) wrote the summary from the facts only: first name, numbers and resource titles. It never sees emails or enrollment numbers. Recommendations pointing at resources that don't exist are discarded${snap.droppedRecommendations ? ` (${snap.droppedRecommendations} dropped this time)` : ""}, and every number it writes is checked against the facts${snap.ungroundedNumbers?.length ? ` (${snap.ungroundedNumbers.length} didn't match)` : " (all matched)"}.${snap.modelAttempts?.length > 1 ? ` Models tried: ${snap.modelAttempts.join("; ")}.` : ""}`}</li>
          <li>{snap.runner === "render-workflow" ? `It ran as a Render Workflow task (run ${snap.runId}), separate from the API, with automatic retries.` : "It ran inside the API process."} Current pipeline: {pipeline.runner === "render-workflow" ? `Render Workflows${pipeline.local ? " (local task server)" : ""}` : "in-process"}, {pipeline.engine} writer.</li>
        </ol>
        <p className="mt-3">Regenerating without new activity reuses this profile, so it&apos;s only rebuilt when something changes.</p>
        <p className="mt-1 text-[12px]">Generated {relativeDays(snap.completedAt || snap.createdAt)}.</p>
      </details>
    </div>
  );
}
