"use client";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, GraduationCap, Layers } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { plural, shortDate } from "@/lib/format";
import { PageHeader } from "@/components/shell/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DueChip } from "@/components/ui/DueChip";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";

const TYPE = { video: "Video", quiz: "Quiz", project: "Project" };

async function loadStudio() {
  const [me, queue] = await Promise.all([api.mentor.me(), api.mentor.reviewQueue()]);
  const programs = await Promise.all(me.programs.map((p) => api.mentor.program(p._id)));
  return { me, programs, pending: queue.unverifiedProjects };
}

export default function MentorStudio() {
  const studio = useApi(loadStudio);
  if (studio.loading && !studio.data) return <PageSkeleton />;
  if (studio.error) return <ErrorState error={studio.error} onRetry={studio.reload} />;
  const { me, programs, pending } = studio.data;

  const mentees = programs.reduce((s, p) => s + p.menteeCount, 0);
  const now = Date.now();
  const upcoming = programs
    .flatMap((p) => p.resources.map((r) => ({ ...r, programName: p.name, programId: p._id })))
    .filter((r) => new Date(r.deadline) > now)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow={`Signed in as ${me.name}`}
        title="Studio"
        description={pending.length ? `${plural(pending.length, "project")} waiting on your review.` : "Nothing waiting on you right now."}
        action={pending.length > 0 && <Button href="/mentor/review">Review projects <ArrowRight className="size-4" aria-hidden /></Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Programs" value={programs.length} icon={Layers} />
        <Stat label="Mentees" value={mentees} icon={GraduationCap} />
        <Stat label="Resources" value={programs.reduce((s, p) => s + p.resources.length, 0)} icon={BookOpen} />
        <Stat label="To review" value={pending.length} icon={ClipboardCheck} tone={pending.length ? "accent" : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 mt-6 items-start [&>*]:min-w-0">
        <div className="flex flex-col gap-4">
          {programs.map((p) => {
            const waiting = pending.filter((x) => x.programId === p._id).length;
            return (
              <Link key={p._id} href={`/mentor/programs/${p._id}`} className="group block">
                <Card className="p-5 transition group-hover:border-line-strong">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="tn-heading text-[17px] text-paper group-hover:text-accent transition">{p.name}</h2>
                      {p.description && <p className="text-sm text-muted mt-1">{p.description}</p>}
                    </div>
                    <Badge className="tn-code">{p.code}</Badge>
                  </div>
                  <dl className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-line">
                    {[["Mentees", p.menteeCount], ["Resources", p.resources.length], ["To review", waiting]].map(([k, v]) => (
                      <div key={k}>
                        <dd className="tn-display tn-num text-[22px] text-paper">{v}</dd>
                        <dt className="text-[13px] text-muted">{k}</dt>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-[13px] text-accent inline-flex items-center gap-1">Open workspace <ArrowRight className="size-3.5" aria-hidden /></p>
                </Card>
              </Link>
            );
          })}
          {programs.length === 0 && (
            <Card><EmptyState icon={Layers} title="No programs yet">An admin needs to add you to a program before you can add mentees or resources.</EmptyState></Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Coming up" description="Next deadlines across your programs." />
            {upcoming.length ? (
              <ul className="divide-y divide-line mt-3">
                {upcoming.map((r) => (
                  <li key={r._id} className="px-5 py-3">
                    <p className="text-paper truncate">{r.title}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                      <span className="text-[13px] text-muted">{TYPE[r.type]} · {r.programName}</span>
                      <DueChip deadline={r.deadline} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No upcoming deadlines">Publish a resource from a program workspace.</EmptyState>}
          </Card>
          {pending.length > 0 && (
            <Card>
              <CardHeader title="Waiting for review" description="Oldest first." action={<Button size="sm" variant="ghost" href="/mentor/review">All</Button>} />
              <ul className="divide-y divide-line mt-3">
                {pending.slice(0, 4).map((p) => (
                  <li key={`${p.menteeId}-${p.resourceId}`} className="px-5 py-3 text-sm">
                    <p className="text-paper">{p.menteeName}</p>
                    <p className="text-[13px] text-muted">{p.resourceTitle} · submitted {shortDate(p.submittedOn)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
