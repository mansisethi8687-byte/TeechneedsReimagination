"use client";
import { cn } from "@/lib/cn";

// Controlled segmented tabs. items: [{ id, label, count? }]
export function Tabs({ items, value, onChange, className, label = "Sections" }) {
  return (
    <div role="tablist" aria-label={label} className={cn("inline-flex p-1 rounded-xl bg-ink-3 border border-line gap-1 max-w-full overflow-x-auto", className)}>
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button key={it.id} role="tab" aria-selected={active} onClick={() => onChange(it.id)}
            className={cn("h-8 px-3 rounded-lg text-[13px] font-medium whitespace-nowrap transition",
              active ? "bg-ink-2 text-paper shadow-sm border border-line" : "text-muted hover:text-paper")}>
            {it.label}
            {it.count != null && <span className="ml-1.5 text-muted tn-num">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
