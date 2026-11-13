import Link from "next/link";
import { CheckCircle2, FileVideo, FolderGit2, ListChecks, MessageSquareText } from "lucide-react";
import { shortDate, timeOfDay } from "@/lib/format";

const KIND = {
  video_completed: { icon: FileVideo, text: (e) => `Watched “${e.title}”`, score: true },
  quiz_submitted: { icon: ListChecks, text: (e) => `Submitted quiz “${e.title}”`, score: true },
  project_submitted: { icon: FolderGit2, text: (e) => `Submitted project “${e.title}”${e.late ? " (late)" : ""}` },
  project_reviewed: { icon: CheckCircle2, text: (e) => `Mentor reviewed “${e.title}”`, score: true },
};

export function ActivityList({ events, compact = false }) {
  return (
    <ol className="divide-y divide-line">
      {events.map((e, i) => {
        const k = KIND[e.kind];
        return (
          <li key={`${e.kind}-${e.resourceId}-${i}`} className="px-4 sm:px-5 py-3 flex gap-3">
            <k.icon className={e.kind === "project_reviewed" ? "size-4 mt-0.5 text-signal shrink-0" : "size-4 mt-0.5 text-muted shrink-0"} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <Link href={`/dashboard/resources/${e.resourceId}`} className="text-paper hover:text-accent truncate">{k.text(e)}</Link>
                <time className="text-[13px] text-muted shrink-0" dateTime={e.at}>{shortDate(e.at)}, {timeOfDay(e.at)}</time>
              </div>
              <p className="text-[13px] text-muted">
                {e.program}
                {k.score && e.score != null && <> · <span className="tn-num text-paper">{e.score}</span>/{e.maxScore} points</>}
              </p>
              {e.feedback && !compact && (
                <p className="mt-2 text-sm text-paper rounded-[10px] bg-ink-3 border border-line px-3 py-2 flex gap-2">
                  <MessageSquareText className="size-4 text-muted shrink-0 mt-0.5" aria-hidden /> {e.feedback}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
