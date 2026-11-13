"use client";
import { useSession } from "@/lib/session";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { PageHeader } from "@/components/shell/AppShell";
import { ProfileView } from "@/components/profile/ProfileView";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function MentorProfile() {
  const session = useSession();
  // Sessions migrated from the old site carry no id: look it up.
  const me = useApi(() => api.mentor.me(), [], { enabled: !!session && !session.user?.id });
  const id = session?.user?.id || me.data?._id;
  return (
    <>
      <PageHeader title="Profile" description="Your mentoring, from what you publish, how you review and how your cohort is doing." />
      {id ? <ProfileView kind="mentor" id={id} /> : <PageSkeleton />}
    </>
  );
}
