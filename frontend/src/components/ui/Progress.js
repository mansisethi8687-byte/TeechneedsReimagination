export function Progress({ value, max, label, className }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className={className}>
      {label && (
        <div className="flex items-baseline justify-between text-[13px] mb-1.5">
          <span className="text-muted">{label}</span>
          <span className="tn-num text-paper">{value}/{max} · {pct}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-ink-3 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
