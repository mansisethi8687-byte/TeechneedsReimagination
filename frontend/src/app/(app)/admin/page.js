"use client";
import { useState } from "react";
import Link from "next/link";
import { BookOpen, ClipboardCheck, GraduationCap, Layers, Plus, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { shortDate } from "@/lib/format";
import { PageHeader } from "@/components/shell/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ProgramFormDialog } from "@/components/admin/ProgramFormDialog";
import { OnboardMentorDialog } from "@/components/admin/OnboardMentorDialog";

export default function AdminOverview() {
  const overview = useApi(() => api.admin.overview());
  const programs = useApi(() => api.admin.programs());
  const [dialog, setDialog] = useState(null);

  const refresh = () => { overview.reload(); programs.reload(); };

  if (overview.loading && !overview.data) return <PageSkeleton />;
  if (overview.error) return <ErrorState error={overview.error} onRetry={overview.reload} />;
  const o = overview.data;

  return (
    <>
      <PageHeader
        eyebrow="Admin console"
        title="Overview"
        description="Start cohorts, staff them with mentors, and see how big each one is."
        action={<>
          <Button variant="secondary" onClick={() => setDialog("mentor")}><UserPlus className="size-4" aria-hidden /> Onboard mentor</Button>
          <Button onClick={() => setDialog("program")}><Plus className="size-4" aria-hidden /> New program</Button>
        </>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Programs" value={o.programs} icon={Layers} />
        <Stat label="Mentors" value={o.mentors} icon={Users} />
        <Stat label="Mentees" value={o.mentees} icon={GraduationCap} />
        <Stat label="Projects awaiting review" value={o.pendingReviews} icon={ClipboardCheck} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Programs" description="Open a program to manage its mentors." />
        <div className="mt-4">
          {programs.error ? (
            <div className="p-5"><ErrorState error={programs.error} onRetry={programs.reload} /></div>
          ) : (
            <DataTable
              rows={programs.data}
              columns={[
                { key: "name", header: "Program", primary: true, render: (p) => (
                  <Link href={`/admin/programs/${p._id}`} className="font-medium text-paper hover:text-accent">
                    {p.name} <span className="tn-code text-muted font-normal ml-1">{p.code}</span>
                  </Link>
                ) },
                { key: "mentors", header: "Mentors", render: (p) => p.mentors.length ? p.mentors.map((m) => m.name).join(", ") : <span className="text-urgent">No mentor yet</span> },
                { key: "menteeCount", header: "Mentees", className: "tn-num" },
                { key: "resourceCount", header: "Resources", className: "tn-num" },
                { key: "createdAt", header: "Created", hideOnMobile: true, render: (p) => <span className="text-muted">{shortDate(p.createdAt)}</span> },
              ]}
              empty={<EmptyState icon={BookOpen} title="No programs yet" action={<Button onClick={() => setDialog("program")}><Plus className="size-4" /> New program</Button>}>Create the first cohort, then onboard a mentor to run it.</EmptyState>}
            />
          )}
        </div>
      </Card>

      <ProgramFormDialog open={dialog === "program"} onClose={() => setDialog(null)} onSaved={refresh} />
      <OnboardMentorDialog open={dialog === "mentor"} onClose={() => setDialog(null)} programs={programs.data || []} onCreated={refresh} />
    </>
  );
}
