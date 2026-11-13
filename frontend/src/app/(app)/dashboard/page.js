"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Flame, ListTodo, Medal, MessageSquareText, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { plural, shortDate } from "@/lib/format";
import { PageHeader } from "@/components/shell/AppShell";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ResourceRow } from "@/components/mentee/ResourceRow";
import { ActivityList } from "@/components/mentee/ActivityList";
import { sortForAction, statusOf } from "@/components/mentee/resourceMeta";

async function loadToday() {
  const [dash, activity] = await Promise.all([api.mentee.dashboard(), api.mentee.activity()]);
  return { dash, activity };
}

export default function MenteeToday() {
  const today = useApi(loadToday);
  if (today.loading && !today.data) return <PageSkeleton />;
  if (today.error) return <ErrorState error={today.error} onRetry={today.reload} />;
  const { dash: d, activity } = today.data;

  const all = d.programs.flatMap((p) => p.resources.map((r) => ({ ...r, programName: p.name, programId: p._id })));
  const actionable = sortForAction(all).filter((r) => ["overdue", "open", "todo"].includes(statusOf(r).key));
  const waiting = all.filter((r) => r.status === "submitted");
  const done = all.filter((r) => ["completed", "verified"].includes(r.status)).length;
  const feedback = activity.filter((e) => e.kind === "project_reviewed" && e.feedback).slice(0, 3);
  const primary = d.programs[0];
  const standing = primary?.standing;

  return (
    <>
      <PageHeader
        eyebrow={<><span className="tn-code text-paper">{d.enrollmentNumber}</span><span aria-hidden>·</span><span>{d.programs.map((p) => p.name).join(", ")}</span></>}
        title="Today"
        description={actionable.length
          ? `${plural(actionable.length, "item")} to do${waiting.length ? `, ${waiting.length} awaiting review` : ""}.`
          : waiting.length ? `Nothing to do. ${plural(waiting.length, "submission")} awaiting review.` : "Nothing due. New work from your mentor shows up here."}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Score" value={d.totalScore} icon={Trophy} tone="accent" hint="Across all programs" />
        <Stat label="Rank" value={standing ? `#${standing.rank}` : "—"} icon={Medal} hint={standing ? `of ${standing.of} in ${primary.name}` : undefined} />
        <Stat label="Streak" value={d.streak} suffix={d.streak === 1 ? "day" : "days"} icon={Flame} hint="Consecutive active days" />
        <Stat label="Completed" value={done} suffix={`/ ${all.length}`} icon={CheckCircle2} hint={waiting.length ? `${waiting.length} awaiting review` : "Videos, quizzes, projects"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4 mt-4 items-start [&>*]:min-w-0">
        <Card>
          <CardHeader title="Next up" description="Overdue first, then by deadline." />
          {actionable.length ? (
            <ul className="divide-y divide-line mt-3 border-t border-line">
              {actionable.slice(0, 6).map((r) => <ResourceRow key={r._id} r={r} showProgram={d.programs.length > 1} />)}
            </ul>
          ) : (
            <EmptyState icon={ListTodo} title="You're caught up">Nothing open right now. Check back when your mentor publishes more.</EmptyState>
          )}
          {actionable.length > 6 && <CardBody className="pt-3 text-[13px] text-muted">+{actionable.length - 6} more in your program.</CardBody>}
        </Card>

        <div className="flex flex-col gap-4">
          {d.programs.map((p) => {
            const total = p.resources.length;
            const n = p.resources.filter((r) => ["completed", "verified"].includes(r.status)).length;
            return (
              <Card key={p._id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="tn-heading text-[15px] text-paper truncate">{p.name}</h2>
                      <p className="text-[13px] text-muted"><span className="tn-code">{p.code}</span>{p.standing && <> · rank <span className="tn-num text-paper">#{p.standing.rank}</span> of {p.standing.of}</>}</p>
                    </div>
                    <Button size="sm" variant="ghost" href={`/dashboard/programs/${p._id}`}>Open <ArrowRight className="size-3.5" aria-hidden /></Button>
                  </div>
                  <Progress className="mt-4" value={n} max={total} label="Completed" />
                </CardBody>
              </Card>
            );
          })}

          <Card>
            <CardHeader title="Mentor feedback" description="From reviewed projects." />
            {feedback.length ? (
              <ul className="divide-y divide-line mt-3 border-t border-line">
                {feedback.map((f) => (
                  <li key={f.resourceId} className="px-5 py-3">
                    <Link href={`/dashboard/resources/${f.resourceId}`} className="text-paper hover:text-accent">{f.title}</Link>
                    <p className="text-[13px] text-muted"><span className="tn-num text-signal">{f.score}/{f.maxScore}</span> · {shortDate(f.at)}</p>
                    <p className="text-sm text-paper mt-1.5 flex gap-2"><MessageSquareText className="size-4 text-muted shrink-0 mt-0.5" aria-hidden />{f.feedback}</p>
                  </li>
                ))}
              </ul>
            ) : <CardBody className="text-sm text-muted pt-3">No feedback yet. It appears here once a mentor reviews a project.</CardBody>}
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader title="Recent activity" action={<Button size="sm" variant="ghost" href="/dashboard/activity">All activity</Button>} />
        {activity.length ? <div className="mt-3 border-t border-line"><ActivityList events={activity.slice(0, 5)} compact /></div>
          : <CardBody className="text-sm text-muted pt-3">Nothing yet. Completing a video, quiz or project adds it here.</CardBody>}
      </Card>
    </>
  );
}
