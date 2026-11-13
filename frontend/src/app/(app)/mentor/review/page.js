"use client";
import { useState } from "react";
import { CheckCircle2, ClipboardCheck, ExternalLink, FolderGit2, Globe } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAction } from "@/lib/useAction";
import { plural, shortDate, dayDiff } from "@/lib/format";
import { PageHeader } from "@/components/shell/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";

function lateness(p) {
  if (!p.deadline || !p.submittedOn) return null;
  const late = -dayDiff(p.deadline, new Date(p.submittedOn));
  return late > 0 ? `${plural(late, "day")} late` : null;
}

function ReviewCard({ item, onScored }) {
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [expanded, setExpanded] = useState(false);
  const verify = useAction(
    () => api.mentor.verifyProject(item.menteeId, item.resourceId, Number(score), feedback.trim() || undefined),
    { success: (r) => `Scored ${item.menteeName} ${r.finalScore}/${item.maxScore}` },
  );
  const late = lateness(item);
  const n = Number(score);
  const valid = score !== "" && Number.isFinite(n) && n >= 0 && n <= item.maxScore;
  const longDescription = (item.description || "").length > 280;

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-muted">{item.programName} · {item.resourceTitle}</p>
            <h2 className="tn-heading text-[17px] text-paper mt-0.5">{item.menteeName}</h2>
            <p className="text-[13px] text-muted mt-0.5"><span className="tn-code">{item.enrollmentNumber}</span> · submitted {shortDate(item.submittedOn)}</p>
          </div>
          {late ? <Badge tone="urgent">{late}</Badge> : <Badge>On time</Badge>}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button size="sm" variant="secondary" href={item.githubLink} target="_blank" rel="noreferrer"><FolderGit2 className="size-4" aria-hidden /> Code <ExternalLink className="size-3.5 text-muted" aria-hidden /></Button>
          {item.deployedLink ? <Button size="sm" variant="secondary" href={item.deployedLink} target="_blank" rel="noreferrer"><Globe className="size-4" aria-hidden /> Live app <ExternalLink className="size-3.5 text-muted" aria-hidden /></Button> : <span className="text-[13px] text-muted self-center">No live link submitted</span>}
        </div>

        {item.description && (
          <div className="mt-4 rounded-[10px] bg-ink-3 border border-line px-4 py-3 text-sm text-paper whitespace-pre-line">
            {longDescription && !expanded ? `${item.description.slice(0, 280)}…` : item.description}
            {longDescription && (
              <button className="block mt-1 text-[13px] text-accent hover:underline" onClick={() => setExpanded((x) => !x)}>
                {expanded ? "Show less" : "Read all"}
              </button>
            )}
          </div>
        )}

        <form className="mt-5 grid sm:grid-cols-[180px_1fr] gap-4 items-start"
          onSubmit={async (e) => { e.preventDefault(); if (valid && await verify.run()) onScored(item); }}>
          <Field label="Score" hint={`Out of ${item.maxScore}`}
            error={score !== "" && !valid ? `Between 0 and ${item.maxScore}` : undefined}>
            <Input type="number" inputMode="numeric" min={0} max={item.maxScore} value={score} onChange={(e) => setScore(e.target.value)} />
          </Field>
          <Field label="Feedback" optional hint="The mentee sees this on their project.">
            <Textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={1000}
              placeholder="What worked, and one thing to do better next time." />
          </Field>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <input type="range" min={0} max={item.maxScore} value={valid ? n : 0} onChange={(e) => setScore(e.target.value)}
              aria-label="Score slider" className="flex-1 min-w-40 accent-[var(--accent)]" />
            <Button type="submit" loading={verify.pending} disabled={!valid}><CheckCircle2 className="size-4" aria-hidden /> Score project</Button>
          </div>
          <div className="sm:col-span-2"><FormError error={verify.error} /></div>
        </form>
      </CardBody>
    </Card>
  );
}

export default function ReviewQueue() {
  const queue = useApi(() => api.mentor.reviewQueue());
  const [scored, setScored] = useState(0);

  if (queue.loading && !queue.data) return <PageSkeleton />;
  if (queue.error) return <ErrorState error={queue.error} onRetry={queue.reload} />;
  const items = queue.data.unverifiedProjects;

  const onScored = (item) => {
    setScored((n) => n + 1);
    queue.setData((d) => ({ unverifiedProjects: d.unverifiedProjects.filter((p) => !(p.menteeId === item.menteeId && p.resourceId === item.resourceId)) }));
  };

  return (
    <>
      <PageHeader eyebrow="Mentor studio" title="Review projects"
        description={items.length
          ? `${plural(items.length, "submission")} waiting, oldest first. A score is final once saved.`
          : "Every submitted project has been scored."} />
      {items.length ? (
        <div className="flex flex-col gap-4 max-w-3xl">
          {items.map((p) => <ReviewCard key={`${p.menteeId}-${p.resourceId}`} item={p} onScored={onScored} />)}
        </div>
      ) : (
        <Card className="max-w-3xl">
          <EmptyState icon={ClipboardCheck} title={scored ? `All caught up: ${plural(scored, "project")} scored` : "Nothing to review"}>
            New project submissions from your mentees appear here.
          </EmptyState>
        </Card>
      )}
    </>
  );
}
