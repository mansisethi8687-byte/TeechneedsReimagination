"use client";
import { Activity } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { PageHeader } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ActivityList } from "@/components/mentee/ActivityList";

export default function MenteeActivity() {
  const activity = useApi(() => api.mentee.activity());
  if (activity.loading && !activity.data) return <PageSkeleton />;
  if (activity.error) return <ErrorState error={activity.error} onRetry={activity.reload} />;
  return (
    <>
      <PageHeader title="Activity" description="Everything you've completed or submitted, and every review, newest first." />
      <Card>
        {activity.data.length ? <ActivityList events={activity.data} />
          : <EmptyState icon={Activity} title="No activity yet">Watch a video, take a quiz or submit a project to start your history.</EmptyState>}
      </Card>
    </>
  );
}
