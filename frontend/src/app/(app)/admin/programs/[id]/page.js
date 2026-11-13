"use client";
import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, GraduationCap, Pencil, UserMinus, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAction } from "@/lib/useAction";
import { shortDate } from "@/lib/format";
import { PageHeader } from "@/components/shell/AppShell";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { DueChip } from "@/components/ui/DueChip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ProgramFormDialog } from "@/components/admin/ProgramFormDialog";
import { OnboardMentorDialog } from "@/components/admin/OnboardMentorDialog";

const TYPE = { video: "Video", quiz: "Quiz", project: "Project" };

export default function AdminProgram({ params }) {
  const { id } = use(params);
  const program = useApi(() => api.mentor.program(id), [id]);
  const mentors = useApi(() => api.admin.mentors());
  const [dialog, setDialog] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [pick, setPick] = useState("");

  const assign = useAction((mentorId) => api.admin.assignMentor(id, mentorId), { success: "Mentor added to the program", toastErrors: true });
  const remove = useAction((mentorId) => api.admin.removeMentor(id, mentorId), { success: "Mentor removed", toastErrors: true });

  const assignedIds = useMemo(() => new Set((program.data?.mentors || []).map((m) => m._id)), [program.data]);
  const available = (mentors.data || []).filter((m) => !assignedIds.has(m._id));
  const refresh = () => { program.reload(); mentors.reload(); };

  if (program.loading && !program.data) return <PageSkeleton />;
  if (program.error) return <ErrorState error={program.error} onRetry={program.reload} />;
  const p = program.data;

  return (
    <>
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-paper mb-4">
        <ArrowLeft className="size-4" aria-hidden /> All programs
      </Link>
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><Badge className="tn-code">{p.code}</Badge>{p.startDate && <span>{shortDate(p.startDate)} – {p.endDate ? shortDate(p.endDate) : "ongoing"}</span>}</span>}
        title={p.name}
        description={p.description || "No description yet."}
        action={<Button variant="secondary" onClick={() => setDialog("edit")}><Pencil className="size-4" aria-hidden /> Edit</Button>}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Mentors" value={p.mentors.length} icon={Users} />
        <Stat label="Mentees" value={p.menteeCount} icon={GraduationCap} />
        <Stat label="Resources" value={p.resources.length} icon={BookOpen} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4 mt-6 items-start [&>*]:min-w-0">
        <Card>
          <CardHeader title="Mentors" description="Mentors add mentees and publish resources for this program."
            action={<Button size="sm" variant="secondary" onClick={() => setDialog("onboard")}><UserPlus className="size-4" aria-hidden /> New</Button>} />
          <ul className="divide-y divide-line mt-3">
            {p.mentors.map((m) => (
              <li key={m._id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-paper font-medium truncate">{m.name}</p>
                  <p className="text-[13px] text-muted truncate">{m.email}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setRemoving(m)} aria-label={`Remove ${m.name}`}><UserMinus className="size-4" /></Button>
              </li>
            ))}
            {p.mentors.length === 0 && <li className="px-5 py-4 text-sm text-urgent">Nobody runs this program yet.</li>}
          </ul>
          <CardBody className="border-t border-line">
            <form className="flex gap-2 min-w-0" onSubmit={async (e) => { e.preventDefault(); if (pick && await assign.run(pick)) { setPick(""); refresh(); } }}>
              <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Existing mentor" disabled={!available.length} className="min-w-0 flex-1">
                <option value="">{available.length ? "Add an existing mentor…" : "Every mentor is already here"}</option>
                {available.map((m) => <option key={m._id} value={m._id}>{m.name} · {m.email}</option>)}
              </Select>
              <Button type="submit" loading={assign.pending} disabled={!pick}>Add</Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Resources" description="Published by this program's mentors." />
          {p.resources.length ? (
            <ul className="divide-y divide-line mt-3">
              {[...p.resources].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).map((r) => (
                <li key={r._id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-paper truncate">{r.title}</p>
                    <p className="text-[13px] text-muted">{TYPE[r.type]} · {r.maxScore} points</p>
                  </div>
                  <DueChip deadline={r.deadline} done={new Date(r.deadline) < new Date()} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={BookOpen} title="No resources yet">Mentors publish videos, quizzes and projects from their studio.</EmptyState>
          )}
        </Card>
      </div>

      <ProgramFormDialog open={dialog === "edit"} onClose={() => setDialog(null)} program={p} onSaved={refresh} />
      <OnboardMentorDialog open={dialog === "onboard"} onClose={() => setDialog(null)} programs={[{ _id: p._id, name: p.name }]} defaultProgramIds={[p._id]} onCreated={refresh} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title={`Remove ${removing?.name}?`} danger confirmLabel="Remove" pending={remove.pending}
        onConfirm={async () => { if (await remove.run(removing._id)) { setRemoving(null); refresh(); } }}>
        They&apos;ll lose access to this program&apos;s mentees and resources. Their login and other programs stay as they are.
      </ConfirmDialog>
    </>
  );
}
