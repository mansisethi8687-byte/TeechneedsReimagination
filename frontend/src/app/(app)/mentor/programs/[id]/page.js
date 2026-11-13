"use client";
import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, FileVideo, FolderGit2, KeyRound, ListChecks, Lock, LockOpen, MoreHorizontal, Pencil, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAction } from "@/lib/useAction";
import { relativeDays, plural } from "@/lib/format";
import { PageHeader } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { DueChip } from "@/components/ui/DueChip";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CredentialDialog } from "@/components/ui/CredentialDialog";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { AddMenteeDialog } from "@/components/mentor/AddMenteeDialog";
import { ResourceFormDialog } from "@/components/mentor/ResourceFormDialog";
import { SubmissionsDialog } from "@/components/mentor/SubmissionsDialog";
import { cn } from "@/lib/cn";

const TYPE = {
  video: { label: "Video", icon: FileVideo },
  quiz: { label: "Quiz", icon: ListChecks },
  project: { label: "Project", icon: FolderGit2 },
};

async function loadWorkspace(id) {
  const [program, mentees] = await Promise.all([api.mentor.program(id), api.mentor.mentees(id)]);
  return { program, mentees };
}

function ResourceMenu({ resource, onAction }) {
  const [open, setOpen] = useState(false);
  const items = [
    ["submissions", "Who's done it", Users],
    ["edit", "Edit", Pencil],
    ["lock", resource.isLocked ? "Unlock" : "Lock", resource.isLocked ? LockOpen : Lock],
    ["delete", "Delete", Trash2],
  ];
  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <Button size="icon" variant="ghost" onClick={() => setOpen((o) => !o)} aria-label={`Actions for ${resource.title}`} aria-expanded={open} className="size-8">
        <MoreHorizontal className="size-4" />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-line-strong bg-ink-2 p-1 shadow-2xl shadow-black/30">
          {items.map(([key, label, Icon]) => (
            <button key={key} role="menuitem" onClick={() => { setOpen(false); onAction(key); }}
              className={cn("w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm text-left hover:bg-ink-3", key === "delete" ? "text-danger" : "text-paper")}>
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProgramWorkspace({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const tab = search.get("tab") === "resources" ? "resources" : "mentees";
  const ws = useApi(() => loadWorkspace(id), [id]);
  const [dialog, setDialog] = useState(null); // { kind, resource?, quiz? }
  const [issued, setIssued] = useState(null);

  const resetPw = useAction((m) => api.mentor.resetMenteePassword(m._id), { toastErrors: true });
  const toggleLock = useAction((r) => api.mentor.updateResource(r._id, { isLocked: !r.isLocked }),
    { success: (r) => (r.isLocked ? `Locked “${r.title}”` : `Unlocked “${r.title}”`), toastErrors: true });
  const del = useAction((r) => api.mentor.deleteResource(r._id), { success: "Resource deleted", toastErrors: true });

  const doneCount = useMemo(() => {
    const m = new Map();
    for (const mentee of ws.data?.mentees || []) {
      for (const c of mentee.completedResources) {
        const rid = c.resource?._id || c.resource;
        if (rid) m.set(rid, (m.get(rid) || 0) + 1);
      }
    }
    return m;
  }, [ws.data]);

  const setTab = (t) => router.replace(`/mentor/programs/${id}${t === "resources" ? "?tab=resources" : ""}`, { scroll: false });

  const onResource = async (r, action) => {
    if (action === "submissions") setDialog({ kind: "submissions", resource: r });
    if (action === "delete") setDialog({ kind: "delete", resource: r });
    if (action === "lock") { if (await toggleLock.run(r)) ws.reload(); }
    if (action === "edit") {
      const quiz = r.type === "quiz" ? (await api.mentor.resource(r._id).catch(() => null))?.quiz : null;
      setDialog({ kind: "edit", resource: r, quiz });
    }
  };

  if (ws.loading && !ws.data) return <PageSkeleton />;
  if (ws.error) return <ErrorState error={ws.error} onRetry={ws.reload} />;
  const { program, mentees } = ws.data;
  const resources = [...program.resources].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const programResourceIds = new Set(resources.map((r) => r._id));

  return (
    <>
      <Link href="/mentor" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-paper mb-4">
        <ArrowLeft className="size-4" aria-hidden /> Studio
      </Link>
      <PageHeader
        eyebrow={<Badge className="tn-code">{program.code}</Badge>}
        title={program.name}
        description={`${plural(mentees.length, "mentee")} · ${plural(resources.length, "resource")}`}
        action={tab === "mentees"
          ? <Button onClick={() => setDialog({ kind: "mentee" })}><UserPlus className="size-4" aria-hidden /> Add mentee</Button>
          : <>
              <Button variant="secondary" onClick={() => setDialog({ kind: "create", type: "video" })}><FileVideo className="size-4" aria-hidden /> Video</Button>
              <Button variant="secondary" onClick={() => setDialog({ kind: "create", type: "project" })}><FolderGit2 className="size-4" aria-hidden /> Project</Button>
              <Button href={`/mentor/programs/${id}/quiz/new`}><Plus className="size-4" aria-hidden /> Quiz</Button>
            </>}
      />

      <Tabs value={tab} onChange={setTab} label="Program sections" className="mb-4"
        items={[{ id: "mentees", label: "Mentees", count: mentees.length }, { id: "resources", label: "Resources", count: resources.length }]} />

      {tab === "mentees" ? (
        <Card>
          <DataTable
            className="pt-2"
            rows={mentees}
            columns={[
              { key: "name", header: "Mentee", primary: true, render: (m) => (
                <span><Link href={`/mentor/mentees/${m._id}`} className="font-medium text-paper hover:text-accent">{m.name}</Link><span className="block text-[13px] text-muted">{m.email}</span></span>
              ) },
              { key: "enrollmentNumber", header: "Enrollment no.", render: (m) => <span className="tn-code">{m.enrollmentNumber}</span> },
              { key: "done", header: "Done", render: (m) => {
                const n = m.completedResources.filter((c) => programResourceIds.has(c.resource?._id || c.resource)).length;
                return <span className="tn-num">{n}<span className="text-muted">/{resources.length}</span></span>;
              } },
              { key: "totalScore", header: "Score", render: (m) => <span className="tn-num text-paper">{m.totalScore}</span> },
              { key: "lastActiveDate", header: "Last active", hideOnMobile: true, render: (m) => <span className="text-muted">{m.lastActiveDate ? relativeDays(m.lastActiveDate) : "Never"}</span> },
              { key: "actions", header: <span className="sr-only">Actions</span>, className: "text-right", render: (m) => (
                <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "reset", mentee: m })}><KeyRound className="size-4" aria-hidden /> Reset password</Button>
              ) },
            ]}
            empty={<EmptyState icon={Users} title="No mentees yet" action={<Button onClick={() => setDialog({ kind: "mentee" })}><UserPlus className="size-4" /> Add mentee</Button>}>
              Each mentee gets a generated enrollment number and password.
            </EmptyState>}
          />
        </Card>
      ) : (
        <Card>
          {resources.length ? (
            <ul className="divide-y divide-line">
              {resources.map((r) => {
                const T = TYPE[r.type];
                const n = doneCount.get(r._id) || 0;
                const past = new Date(r.deadline) < new Date();
                return (
                  <li key={r._id} className="px-4 sm:px-5 py-3.5 flex items-start sm:items-center gap-3">
                    <span className="size-9 rounded-lg bg-ink-3 border border-line grid place-items-center shrink-0 mt-0.5 sm:mt-0">
                      <T.icon className="size-4 text-muted" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-paper font-medium truncate">{r.title}</p>
                      <p className="text-[13px] text-muted">
                        {T.label} · {r.maxScore} points · <span className="tn-num">{n}/{mentees.length}</span> done
                        {r.tags?.length > 0 && <> · {r.tags.join(", ")}</>}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2 sm:hidden">
                        {r.isLocked && <Badge icon={Lock}>Locked</Badge>}
                        <DueChip deadline={r.deadline} done={past} />
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      {r.isLocked && <Badge icon={Lock}>Locked</Badge>}
                      <DueChip deadline={r.deadline} done={past} />
                    </div>
                    <ResourceMenu resource={r} onAction={(a) => onResource(r, a)} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={BookOpen} title="Nothing published yet">Add a video, a project or a quiz. Each one gets a deadline and a max score.</EmptyState>
          )}
        </Card>
      )}

      <AddMenteeDialog open={dialog?.kind === "mentee"} onClose={() => setDialog(null)} program={program} onAdded={ws.reload} />
      <ResourceFormDialog open={dialog?.kind === "create" || dialog?.kind === "edit"} onClose={() => setDialog(null)}
        programId={id} type={dialog?.type} resource={dialog?.kind === "edit" ? dialog.resource : undefined} quiz={dialog?.quiz}
        onSaved={() => { ws.reload(); if (tab !== "resources") setTab("resources"); }} />
      <SubmissionsDialog resource={dialog?.kind === "submissions" ? dialog.resource : null} onClose={() => setDialog(null)} />
      <ConfirmDialog open={dialog?.kind === "delete"} onClose={() => setDialog(null)} danger confirmLabel="Delete" pending={del.pending}
        title={`Delete “${dialog?.resource?.title}”?`}
        onConfirm={async () => { if (await del.run(dialog.resource)) { setDialog(null); ws.reload(); } }}>
        Mentees lose the points they earned on it and any submissions are removed. This can&apos;t be undone.
      </ConfirmDialog>
      <ConfirmDialog open={dialog?.kind === "reset"} onClose={() => setDialog(null)} confirmLabel="Generate new password" pending={resetPw.pending}
        title={`Reset ${dialog?.mentee?.name}'s password?`}
        onConfirm={async () => { const res = await resetPw.run(dialog.mentee); if (res) { setDialog(null); setIssued(res); } }}>
        Their current password stops working immediately. Their enrollment number stays the same.
      </ConfirmDialog>
      <CredentialDialog open={!!issued} onClose={() => setIssued(null)} title={`New password for ${issued?.mentee?.name}`} loginPath="/login?role=mentee"
        rows={issued ? [{ label: "Enrollment number", value: issued.mentee.enrollmentNumber }, { label: "Password", value: issued.tempPassword }] : []} />
    </>
  );
}
