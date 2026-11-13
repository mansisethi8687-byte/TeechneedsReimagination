import { Suspense } from "react";
import LeaderboardView from "./LeaderboardView";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function LeaderboardPage() {
  return <Suspense fallback={<PageSkeleton />}><LeaderboardView /></Suspense>;
}
