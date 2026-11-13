"use client";
import { useSession } from "@/lib/session";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { PageHeader } from "@/components/shell/AppShell";
import { ProfileView } from "@/components/profile/ProfileView";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function MenteeProfile() {
  const session = useSession();
  // Sessions migrated from the old site carry no id: look it up.
  const me = useApi(() => api.mentee.me(), [], { enabled: !!session && !session.user?.id });
  const id = session?.user?.id || me.data?._id;
  return (
    <>
      <PageHeader eyebrow={session?.user?.enrollmentNumber && <span className="tn-code">{session.user.enrollmentNumber}</span>} title="Profile"
        description="Built from your completed work, quiz results, mentor reviews, ranking and interests." />
      {id ? <ProfileView kind="mentee" id={id} /> : <PageSkeleton />}
    </>
  );
}
