"use client";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { shortDate } from "@/lib/format";

function Trend({ values, labels, unit, empty }) {
  if (!values.length) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(unit === "%" ? 100 : 1, ...values);
  const coords = values.map((v, i) => [40 + (values.length === 1 ? 220 : i * 440 / (values.length - 1)), 150 - v / max * 120]);
  const delta = values.length > 1 ? values.at(-1) - values.at(-2) : null;
  return <>
    <p className="text-sm text-muted mb-3">{delta === null ? "One result so far. A trend needs two results." : <><span className="text-paper font-medium">{delta > 0 ? "+" : ""}{delta}{unit === "%" ? " percentage points" : " points"}</span> versus the previous {unit === "%" ? "review" : "7-day period"}.</>}</p>
    <svg viewBox="0 0 520 190" className="w-full h-auto" role="img" aria-label={`${unit === "%" ? "Project percentage" : "Points earned"} trend: ${values.map((v,i) => `${labels[i]}: ${v}${unit}`).join('; ')}`}>
      {[0, 0.5, 1].map(t => <g key={t}><line x1="40" x2="480" y1={150-t*120} y2={150-t*120} stroke="var(--line-strong)" /><text x="32" y={154-t*120} textAnchor="end" fontSize="11" fill="var(--muted)">{Math.round(t*max)}</text></g>)}
      {values.length > 1 && <polyline points={coords.map(p=>p.join(',')).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" />}
      {coords.map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="5" fill="var(--accent)" /><text x={x} y={y-12} textAnchor="middle" fontSize="12" fill="var(--paper)">{values[i]}{unit}</text></g>)}
      <text x="40" y="183" fontSize="11" fill="var(--muted)">{labels[0].split(" · ")[0]}</text><text x="480" y="183" textAnchor="end" fontSize="11" fill="var(--muted)">{values.length > 1 ? labels.at(-1).split(' · ')[0] : ''}</text>
    </svg>
    <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted">View chart values</summary><ul className="mt-2 space-y-1">{values.map((v,i)=><li key={i} className="flex justify-between gap-3"><span>{labels[i]}</span><span className="tn-num">{v}{unit}</span></li>)}</ul></details>
  </>;
}

export function LearnerPerformance({ data }) {
  if (!data) return <Card><CardHeader title="Mentor marks & progress" /><CardBody>Current results are unavailable. Refresh the page to try again.</CardBody></Card>;
  const marks = data.marks || [];
  const dated = marks.filter(m=>m.reviewedAt && m.percentage != null).slice(-10);
  const weeks = data.weeks || [];
  return <section aria-label="Mentor marks and points trends" className="space-y-4">
    <div className="grid lg:grid-cols-2 gap-4 [&>*]:min-w-0">
      <Card><CardHeader title="Points trend" description="Points earned in each of the last four 7-day periods. A dip means fewer points earned, not lost total points." /><CardBody><Trend values={weeks.map(w=>w.points)} labels={weeks.map(w=>`Ending ${shortDate(w.weekEnding)}`)} unit="" empty="No points history yet." /></CardBody></Card>
      <Card><CardHeader title="Mentor marks trend" description="Latest 10 dated project reviews, shown as percentages so different maximum marks are comparable." /><CardBody><Trend values={dated.map(m=>m.percentage)} labels={dated.map(m=>`${shortDate(m.reviewedAt)} · ${m.title}`)} unit="%" empty="Your mentor’s first dated review will start this graph." /></CardBody></Card>
    </div>
    <Card><CardHeader title="Marks given by mentor" description={`${marks.length} reviewed projects · ${data.pending || 0} awaiting review. Current saved results, independent of the AI summary.`} />
      {marks.length ? <ul className="mt-4 divide-y divide-line border-t border-line">{[...marks].reverse().map(m=><li key={m.resourceId} className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="font-medium break-words">{m.title}</h3><p className="text-xs text-muted mt-1">{m.reviewedAt ? `Reviewed ${shortDate(m.reviewedAt)}` : 'Review date not recorded'}</p></div><div className="shrink-0 text-right"><p className="tn-num text-xl font-semibold text-accent">{m.score}<span className="text-sm text-muted"> / {m.maxScore}</span></p><p className="text-xs text-muted">{m.percentage == null ? 'No percentage available' : `${m.percentage}%`}</p></div></div><p className="text-sm text-muted mt-3 whitespace-pre-wrap break-words">{m.feedback || 'No written feedback added.'}</p></li>)}</ul> : <CardBody className="text-muted text-sm">No mentor marks yet. Submitted projects appear here after your mentor reviews them; pending work is not counted as zero.</CardBody>}
    </Card>
  </section>;
}
