import { cn } from "@/lib/cn";

// A number with its label and, ideally, where it came from.
export function Stat({ label, value, suffix, hint, icon: Icon, tone, className }) {
  return (
    <div className={cn("tn-stat bg-ink-2 border border-line rounded-[14px] p-4 sm:p-5 min-w-0", className)}>
      <div className="flex items-center gap-2 text-[13px] text-muted">
        {Icon && <Icon className="size-4 shrink-0 max-[420px]:hidden" aria-hidden />}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn("tn-display tn-num text-[28px] sm:text-[32px] leading-none mt-3", tone === "signal" ? "text-signal" : tone === "accent" ? "text-accent" : "text-paper")}>
        {value ?? "—"}
        {suffix && <span className="text-muted text-[15px] font-medium ml-1.5 tracking-normal">{suffix}</span>}
      </div>
      {hint && <p className="text-[13px] text-muted mt-2 truncate">{hint}</p>}
    </div>
  );
}
