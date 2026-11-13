"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Flame, Info, Minus, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useSession } from "@/lib/session";
import { timeOfDay } from "@/lib/format";
import { PageHeader } from "@/components/shell/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge, LiveDot } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

const REFRESH_MS = 20000;

function Movement({ value }) {
  // null = no score a week ago, so there's nothing honest to compare against.
  if (value == null) return <span className="text-muted text-[12px]" title="No ranking history from a week ago">—</span>;
  if (value === 0) return <span className="inline-flex items-center gap-0.5 text-muted text-[12px]" title="Same rank as a week ago"><Minus className="size-3.5" aria-hidden /><span className="sr-only">No change</span></span>;
  const up = value > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[12px] tn-num", up ? "text-signal" : "text-urgent")} title={`${up ? "Up" : "Down"} ${Math.abs(value)} since a week ago`}>
      {up ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />}
      {Math.abs(value)}<span className="sr-only"> places {up ? "up" : "down"} this week</span>
    </span>
  );
}

function Row({ r, me }) {
  return (
    <li className={cn("grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3rem_2.5rem_1fr_6rem_5rem_6rem] items-center gap-3 px-4 sm:px-5 py-3",
      me && "bg-accent-soft")} aria-current={me ? "true" : undefined}>
      <span className="tn-display tn-num text-[17px] text-paper">#{r.rank}</span>
      <span className="hidden sm:block"><Movement value={r.movement} /></span>
      <span className="min-w-0">
        <span className="text-paper font-medium truncate flex items-center gap-2">{r.name}{me && <Badge tone="accent">You</Badge>}</span>
        <span className="sm:hidden text-[12px] text-muted flex items-center gap-2"><Movement value={r.movement} /> {r.completed} done · {r.streak}d streak</span>
      </span>
      <span className="hidden sm:block text-right tn-num text-muted">{r.completed}</span>
      <span className="hidden sm:flex justify-end items-center gap-1 tn-num text-muted">{r.streak > 0 && <Flame className="size-3.5" aria-hidden />}{r.streak}</span>
      <span className="text-right tn-display tn-num text-[17px] text-paper">{r.totalScore}</span>
    </li>
  );
}

export default function LeaderboardView() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const programs = useApi(() => api.programs());
  const meId = session?.role === "mentee" ? session.user?.id : null;
  const mentee = useApi(() => api.mentee.dashboard(), [meId], { enabled: !!meId });

  // Default program: the URL, else the mentee's own program, else the largest cohort.
  const largest = programs.data?.reduce((best, p) => (!best || p.menteeCount > best.menteeCount ? p : best), null);
  const programId = params.get("program") || mentee.data?.programs?.[0]?._id || largest?._id || "";
  const board = useApi(() => api.leaderboard({ program: programId, limit: 100 }), [programId], { enabled: !!programId });
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => { if (board.data && !board.loading && !board.error) setUpdatedAt(new Date()); }, [board.data, board.loading, board.error]);
  // Scores change when quizzes are graded and projects reviewed: keep it current.
  useEffect(() => {
    if (!programId) return;
    const tick = () => { if (document.visibilityState === "visible") board.reload(); };
    const t = setInterval(tick, REFRESH_MS);
    window.addEventListener("focus", tick);
    return () => { clearInterval(t); window.removeEventListener("focus", tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const rows = board.data || [];
  const meRow = useMemo(() => rows.find((r) => String(r.id) === String(meId)), [rows, meId]);
  const program = programs.data?.find((p) => p._id === programId);
  const top = rows.slice(0, 3);

  if (programs.error) return <ErrorState error={programs.error} onRetry={programs.reload} />;

  return (
    <>
      <PageHeader
        eyebrow={updatedAt && !board.error ? <span className="inline-flex items-center gap-2 text-signal"><LiveDot /> Live · updated {timeOfDay(updatedAt)}</span> : "Leaderboard"}
        title="Leaderboard"
        description={program ? `${program.name}: ranked by points from graded quizzes, watched videos and reviewed projects.` : "Ranked by points from graded quizzes, watched videos and reviewed projects."}
        action={programs.data?.length > 1 && (
          <Select aria-label="Program" value={programId} onChange={(e) => router.replace(`/leaderboard?program=${e.target.value}`, { scroll: false })} className="w-64 max-w-full">
            {programs.data.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
        )}
      />

      {board.error && <div className="mb-4"><ErrorState error={board.error} onRetry={board.reload} /></div>}

      {!board.data && !board.error ? (
        <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-80" /></div>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={Trophy} title="No mentees yet">Rankings appear once mentees join this program.</EmptyState></Card>
      ) : (
        <>
          {meRow && (
            <Card className="mb-4 border-accent/30">
              <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <div><p className="text-[13px] text-muted">Your rank</p><p className="tn-display tn-num text-[28px] mt-1">#{meRow.rank}<span className="text-muted text-[15px] font-medium"> of {rows.length}</span></p></div>
                <div><p className="text-[13px] text-muted">Your points</p><p className="tn-display tn-num text-[28px] mt-1">{meRow.totalScore}</p></div>
                <div><p className="text-[13px] text-muted">This week</p><p className="mt-2"><Movement value={meRow.movement} /></p></div>
                {meRow.rank > 1 && (
                  <p className="text-sm text-muted">
                    <span className="tn-num text-paper">{rows[meRow.rank - 2].totalScore - meRow.totalScore + 1}</span> more points passes #{meRow.rank - 1}.
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {top.map((r) => (
              <Card key={r.id} className={cn("p-4 sm:p-5", String(r.id) === String(meId) && "border-accent/40")}>
                <p className="text-[13px] text-muted flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5"><Trophy className={cn("size-4", r.rank === 1 ? "text-accent" : "text-muted")} aria-hidden /> Rank {r.rank}</span>
                  <Movement value={r.movement} />
                </p>
                <p className="text-paper font-medium mt-2 truncate">{r.name}</p>
                <p className="tn-display tn-num text-[26px] mt-1">{r.totalScore}<span className="text-muted text-[14px] font-medium"> pts</span></p>
              </Card>
            ))}
          </div>

          <Card>
            <div className="hidden sm:grid grid-cols-[3rem_2.5rem_1fr_6rem_5rem_6rem] gap-3 px-5 py-2.5 text-[13px] text-muted border-b border-line">
              <span>Rank</span><span title="Change since a week ago">Week</span><span>Mentee</span><span className="text-right">Done</span><span className="text-right">Streak</span><span className="text-right">Points</span>
            </div>
            <ol className="divide-y divide-line" aria-label="Rankings">
              {rows.map((r) => <Row key={r.id} r={r} me={String(r.id) === String(meId)} />)}
            </ol>
          </Card>
        </>
      )}

      <details className="mt-4 rounded-[14px] border border-line bg-ink-2 px-5 py-4 text-sm text-muted group">
        <summary className="cursor-pointer text-paper flex items-center gap-2"><Info className="size-4" aria-hidden /> How points and ranks work</summary>
        <ul className="mt-3 space-y-1.5 list-disc pl-5">
          <li>Video: its max score, minus 1 point for each full day after the deadline.</li>
          <li>Quiz: your share of the marks, scaled to the quiz&apos;s max score. One attempt, graded on the server.</li>
          <li>Project: the score your mentor gives. It counts from the moment it&apos;s reviewed; until then it&apos;s 0.</li>
          <li>Ties: whoever reached that score first ranks higher, then whoever joined first. The order never shuffles between reloads.</li>
          <li>Week: change in rank since 7 days ago, worked out from when each score was earned. A dash means there was no score to compare a week ago.</li>
        </ul>
      </details>
    </>
  );
}
