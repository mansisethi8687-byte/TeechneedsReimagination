"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { PageSkeleton } from "@/components/ui/Skeleton";

// Upstream linked /profile from its navbar. Send each role to its profile.
export default function ProfileEntry() {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session === undefined) return;
    if (session?.role === "mentee") router.replace("/dashboard/profile");
    else if (session?.role === "mentor") router.replace("/mentor/profile");
    else router.replace("/login?role=mentee&next=%2Fdashboard%2Fprofile");
  }, [session, router]);
  return <div className="p-8 max-w-5xl mx-auto"><PageSkeleton /></div>;
}
