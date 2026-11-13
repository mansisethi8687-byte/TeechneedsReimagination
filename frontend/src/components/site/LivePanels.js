"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { LiveDot } from "@/components/ui/Badge";

// Real numbers from the API. If it can't be reached, these render nothing
// rather than a placeholder.
export function LiveCounts() {
  const [s, setS] = useState(null);
  useEffect(() => { api.stats().then(setS).catch(() => setS(null)); }, []);
  if (!s) return null;
  const items = [[s.programs, "programs running"], [s.mentees, "mentees enrolled"], [s.resources, "resources published"], [s.completions, "tasks completed"]];
  return (
    <div>
      <p className="inline-flex items-center gap-2 text-[13px] text-signal"><LiveDot /> Live on this platform</p>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 mt-3">
        {items.map(([n, label]) => (
          <div key={label}>
            <dd className="tn-display tn-num text-[28px] text-paper leading-none">{n}</dd>
            <dt className="text-[13px] text-muted mt-1.5">{label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function LeaderboardPreview() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      const programs = await api.programs();
      const top = programs.reduce((best, p) => (!best || p.menteeCount > best.menteeCount ? p : best), null);
      if (!top) return;
      const rows = await api.leaderboard({ program: top._id, limit: 5 });
      setData({ program: top, rows });
    })().catch(() => setData(null));
  }, []);
  if (!data || !data.rows.length) return null;
  return (
    <div className="rounded-[16px] border border-line bg-ink-2">
      <div className="px-5 pt-5 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[13px] text-signal"><LiveDot /> Live leaderboard</p>
          <h2 className="tn-heading text-[17px] mt-1">{data.program.name}</h2>
        </div>
        <Trophy className="size-5 text-muted" aria-hidden />
      </div>
      <ol className="mt-4 divide-y divide-line border-t border-line">
        {data.rows.map((r) => (
          <li key={r.id} className="px-5 py-3 flex items-center gap-3 text-sm">
            <span className="tn-num text-muted w-6">#{r.rank}</span>
            <span className="flex-1 truncate text-paper">{r.name}</span>
            <span className="tn-num text-paper font-medium">{r.totalScore}</span>
          </li>
        ))}
      </ol>
      <Link href={`/leaderboard?program=${data.program._id}`} className="flex items-center justify-between px-5 py-3.5 border-t border-line text-sm text-accent hover:bg-ink-3/40 rounded-b-[16px]">
        Full leaderboard <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
