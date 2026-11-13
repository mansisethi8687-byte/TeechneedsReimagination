"use client";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { PageHeader } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { DueChip } from "@/components/ui/DueChip";
import { ErrorState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { TYPE, statusOf } from "@/components/mentee/resourceMeta";
import { VideoView } from "@/components/mentee/VideoView";
import { QuizView } from "@/components/mentee/QuizView";
import { ProjectView } from "@/components/mentee/ProjectView";

const VIEWS = { video: VideoView, quiz: QuizView, project: ProjectView };

export default function MenteeResource({ params }) {
  const { id } = use(params);
  const res = useApi(() => api.mentee.resource(id), [id]);

  if (res.loading && !res.data) return <PageSkeleton />;
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />;
  const d = res.data;
  const r = d.resource;
  const T = TYPE[r.type];
  const View = VIEWS[r.type];
  // statusOf expects the dashboard's flattened shape.
  const s = statusOf({ ...r, status: d.status, score: d.completion?.score, quizWindow: d.quizWindow });
  const finished = ["verified", "done", "submitted"].includes(s.key);

  return (
    <>
      <Link href={`/dashboard/programs/${d.program._id}`} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-paper mb-4">
        <ArrowLeft className="size-4" aria-hidden /> {d.program.name}
      </Link>
      <PageHeader
        eyebrow={<><T.icon className="size-4" aria-hidden /><span>{T.label}</span><span aria-hidden>·</span><span className="tn-num">{r.maxScore} points</span></>}
        title={r.title}
        action={<div className="flex flex-wrap gap-2"><Badge tone={s.tone}>{s.label}</Badge>{!finished && <DueChip deadline={r.deadline} />}</div>}
      />
      <View data={d} onChanged={res.reload} />
    </>
  );
}
