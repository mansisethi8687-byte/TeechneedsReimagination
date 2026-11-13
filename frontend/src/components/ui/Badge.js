import { cn } from "@/lib/cn";

const TONES = {
  neutral: "bg-ink-3 text-muted border-line",
  accent: "bg-accent-soft text-accent border-accent/25",
  signal: "bg-signal-soft text-signal border-signal/25", // live or verified only
  urgent: "bg-urgent-soft text-urgent border-urgent/25", // deadlines only
  danger: "bg-danger-soft text-danger border-danger/25",
};

export function Badge({ tone = "neutral", icon: Icon, className, children }) {
  return (
    <span className={cn("inline-flex items-center gap-1 h-6 px-2.5 rounded-full border text-[12px] font-medium whitespace-nowrap", TONES[tone], className)}>
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}

// A pulsing dot for data that is genuinely live.
export function LiveDot({ className }) {
  return (
    <span className={cn("relative inline-flex size-1.5", className)} aria-hidden>
      <span className="absolute inline-flex size-full rounded-full bg-signal opacity-70 animate-ping" />
      <span className="relative inline-flex size-1.5 rounded-full bg-signal" />
    </span>
  );
}
