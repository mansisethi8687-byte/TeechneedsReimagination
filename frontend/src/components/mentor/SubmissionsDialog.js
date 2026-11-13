"use client";
import { ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { shortDate } from "@/lib/format";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";

const STATUS = {
  pending: { label: "Not yet", tone: "neutral" },
  completed: { label: "Done", tone: "accent" },
  submitted: { label: "Awaiting review", tone: "urgent" },
  verified: { label: "Reviewed", tone: "signal" },
};

export function SubmissionsDialog({ resource, onClose }) {
  const subs = useApi(() => api.mentor.submissions(resource._id), [resource?._id], { enabled: !!resource });
  const rows = subs.data || [];
  const done = rows.filter((r) => r.status !== "pending").length;
  return (
    <Dialog open={!!resource} onClose={onClose} size="lg" title={resource?.title}
      description={subs.data ? `${done} of ${rows.length} mentees · max ${resource.maxScore} points` : undefined}>
      {subs.error ? <ErrorState error={subs.error} onRetry={subs.reload} /> : !subs.data ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <ul className="divide-y divide-line -mx-5">
          {rows.map((r) => (
            <li key={r.menteeId} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-paper font-medium">{r.name}</p>
                <p className="text-[13px] text-muted">
                  <span className="tn-code">{r.enrollmentNumber}</span>
                  {(r.completedOn || r.submittedOn) && ` · ${shortDate(r.submittedOn || r.completedOn)}`}
                  {r.githubLink && <> · <a className="text-accent underline underline-offset-2 inline-flex items-center gap-0.5" href={r.githubLink} target="_blank" rel="noreferrer">Code <ExternalLink className="size-3" /></a></>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {r.score != null && r.status !== "submitted" && <span className="tn-num text-paper">{r.score}<span className="text-muted">/{resource.maxScore}</span></span>}
                <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
