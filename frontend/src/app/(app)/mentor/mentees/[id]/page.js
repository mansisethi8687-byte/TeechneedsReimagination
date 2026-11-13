"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { ProfileView } from "@/components/profile/ProfileView";

export default function MenteeProfileForMentor({ params }) {
  const { id } = use(params);
  const router = useRouter();
  return (
    <>
      <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-paper mb-4">
        <ArrowLeft className="size-4" aria-hidden /> Back
      </button>
      <PageHeader title="Mentee profile" description="What this mentee's record shows. You can regenerate it after reviewing their work." />
      <ProfileView kind="mentee" id={id} />
    </>
  );
}
