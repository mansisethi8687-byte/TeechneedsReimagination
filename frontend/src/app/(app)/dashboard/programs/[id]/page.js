"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { PageHeader } from "@/components/shell/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ResourceRow } from "@/components/mentee/ResourceRow";
import { sortForAction, statusOf } from "@/components/mentee/resourceMeta";

const FILTERS = {
  all: () => true,
  todo: (r) => ["overdue", "open", "todo"].includes(statusOf(r).key),
  review: (r) => r.status === "submitted",
  done: (r) => ["completed", "verified"].includes(r.status),
};

export default function MenteeProgram({ params }) {
  const { id } = use(params);
  const dash = useApi(() => api.mentee.dashboard());
  const [filter, setFilter] = useState("all");

  if (dash.loading && !dash.data) return <PageSkeleton />;
  if (dash.error) return <ErrorState error={dash.error} onRetry={dash.reload} />;
  const p = dash.data.programs.find((x) => x._id === id);
  if (!p) return <ErrorState error={{ message: "You're not enrolled in this program." }} />;

  const resources = sortForAction(p.resources);
  const count = (k) => resources.filter(FILTERS[k]).length;
  const shown = resources.filter(FILTERS[filter]);
  const done = count("done");
  const earned = p.resources.reduce((s, r) => s + (r.score || 0), 0);
  const possible = p.resources.reduce((s, r) => s + (r.maxScore || 0), 0);

  return (
    <>
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-paper mb-4">
        <ArrowLeft className="size-4" aria-hidden /> Today
      </Link>
      <PageHeader
        eyebrow={<Badge className="tn-code">{p.code}</Badge>}
        title={p.name}
        description={p.description}
        action={<Button variant="secondary" href={`/leaderboard?program=${p._id}`}>Program leaderboard</Button>}
      />
      <Card className="mb-4">
        <CardBody className="grid sm:grid-cols-3 gap-5">
          <Progress value={done} max={p.resources.length} label="Completed" />
          <div>
            <p className="text-[13px] text-muted">Points earned</p>
            <p className="tn-display tn-num text-[22px] mt-1">{earned}<span className="text-muted text-[15px] font-medium"> / {possible}</span></p>
          </div>
          <div>
            <p className="text-[13px] text-muted">Rank in program</p>
            <p className="tn-display tn-num text-[22px] mt-1">{p.standing ? `#${p.standing.rank}` : "—"}<span className="text-muted text-[15px] font-medium">{p.standing ? ` of ${p.standing.of}` : ""}</span></p>
          </div>
        </CardBody>
      </Card>

      <Tabs value={filter} onChange={setFilter} label="Filter resources" className="mb-3"
        items={[
          { id: "all", label: "All", count: resources.length },
          { id: "todo", label: "To do", count: count("todo") },
          { id: "review", label: "Awaiting review", count: count("review") },
          { id: "done", label: "Done", count: done },
        ]} />
      <Card>
        {shown.length ? (
          <ul className="divide-y divide-line">{shown.map((r) => <ResourceRow key={r._id} r={r} />)}</ul>
        ) : (
          <EmptyState icon={BookOpen} title="Nothing here">No resources match this filter.</EmptyState>
        )}
      </Card>
    </>
  );
}
