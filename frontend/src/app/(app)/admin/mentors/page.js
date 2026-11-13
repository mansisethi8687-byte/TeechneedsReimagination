"use client";
import { useState } from "react";
import Link from "next/link";
import { KeyRound, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAction } from "@/lib/useAction";
import { shortDate } from "@/lib/format";
import { PageHeader } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CredentialDialog } from "@/components/ui/CredentialDialog";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { OnboardMentorDialog } from "@/components/admin/OnboardMentorDialog";

export default function AdminMentors() {
  const mentors = useApi(() => api.admin.mentors());
  const programs = useApi(() => api.admin.programs());
  const [onboard, setOnboard] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [issued, setIssued] = useState(null);
  const reset = useAction((m) => api.admin.resetMentorPassword(m._id), { toastErrors: true });

  if (mentors.loading && !mentors.data) return <PageSkeleton />;
  if (mentors.error) return <ErrorState error={mentors.error} onRetry={mentors.reload} />;

  return (
    <>
      <PageHeader
        eyebrow="Admin console"
        title="Mentors"
        description="Everyone who can add mentees and publish resources. Passwords are never stored in readable form, only reset."
        action={<Button onClick={() => setOnboard(true)}><UserPlus className="size-4" aria-hidden /> Onboard mentor</Button>}
      />
      <Card>
        <DataTable
          className="pt-2"
          rows={mentors.data}
          columns={[
            { key: "name", header: "Mentor", primary: true, render: (m) => (
              <span><span className="font-medium text-paper">{m.name}</span><span className="block text-[13px] text-muted">{m.email}</span></span>
            ) },
            { key: "programs", header: "Programs", render: (m) => m.programs.length ? (
              <span className="flex flex-wrap gap-1.5">{m.programs.map((p) => <Link key={p._id} href={`/admin/programs/${p._id}`}><Badge>{p.name}</Badge></Link>)}</span>
            ) : <span className="text-urgent">Not in a program</span> },
            { key: "expertise", header: "Expertise", hideOnMobile: true, render: (m) => m.expertise?.length ? <span className="text-muted">{m.expertise.join(", ")}</span> : <span className="text-muted">—</span> },
            { key: "createdAt", header: "Joined", hideOnMobile: true, render: (m) => <span className="text-muted">{shortDate(m.createdAt)}</span> },
            { key: "actions", header: <span className="sr-only">Actions</span>, className: "text-right", render: (m) => (
              <Button size="sm" variant="ghost" onClick={() => setResetting(m)}><KeyRound className="size-4" aria-hidden /> Reset password</Button>
            ) },
          ]}
          empty={<EmptyState icon={Users} title="No mentors yet" action={<Button onClick={() => setOnboard(true)}>Onboard mentor</Button>}>Onboard a mentor and add them to a program.</EmptyState>}
        />
      </Card>

      <OnboardMentorDialog open={onboard} onClose={() => setOnboard(false)} programs={programs.data || []} onCreated={mentors.reload} />
      <ConfirmDialog open={!!resetting} onClose={() => setResetting(null)} title={`Reset ${resetting?.name}'s password?`} confirmLabel="Generate new password" pending={reset.pending}
        onConfirm={async () => { const res = await reset.run(resetting); if (res) { setIssued({ ...res, name: resetting.name }); setResetting(null); } }}>
        Their current password stops working immediately. You&apos;ll see the new one once.
      </ConfirmDialog>
      <CredentialDialog open={!!issued} onClose={() => setIssued(null)} title={`New password for ${issued?.name}`} loginPath="/login?role=mentor"
        rows={issued ? [{ label: "Email", value: issued.mentor.email }, { label: "Password", value: issued.tempPassword }] : []} />
    </>
  );
}
