import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DueChip } from "@/components/ui/DueChip";
import { buttonClass } from "@/components/ui/Button";
import { TYPE, statusOf, actionOf } from "./resourceMeta";
import { cn } from "@/lib/cn";

export function ResourceRow({ r, showProgram = false }) {
  const T = TYPE[r.type];
  const s = statusOf(r);
  const a = actionOf(r);
  const finished = ["verified", "done", "submitted"].includes(s.key);
  return (
    <li>
      <Link href={`/dashboard/resources/${r._id}`} className="group flex items-start sm:items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-ink-3/40 transition focus-visible:outline-offset-[-2px]">
        <span className="size-9 rounded-lg bg-ink-3 border border-line grid place-items-center shrink-0 mt-0.5 sm:mt-0">
          <T.icon className="size-4 text-muted" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-paper font-medium truncate">{r.title}</span>
          <span className="block text-[13px] text-muted">
            {T.label} · <span className="tn-num">{r.maxScore}</span> points{showProgram && r.programName ? ` · ${r.programName}` : ""}
          </span>
          <span className="flex flex-wrap gap-1.5 mt-2 sm:hidden">
            <Badge tone={s.tone}>{s.label}</Badge>
            {!finished && <DueChip deadline={r.deadline} />}
          </span>
        </span>
        <span className="hidden sm:flex items-center gap-2 shrink-0">
          <Badge tone={s.tone}>{s.label}</Badge>
          {!finished && <DueChip deadline={r.deadline} />}
        </span>
        <span className={cn(buttonClass({ variant: a.primary ? "primary" : "ghost", size: "sm" }), "shrink-0 hidden md:inline-flex")} aria-hidden>
          {a.label}
        </span>
        <ChevronRight className="size-4 text-muted shrink-0 md:hidden" aria-hidden />
      </Link>
    </li>
  );
}
