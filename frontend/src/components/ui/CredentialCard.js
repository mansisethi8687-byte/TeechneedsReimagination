"use client";
// Shows generated credentials exactly once, with copy and share.
// The server stores only a hash, so this is the only time they can be seen.
import { useState } from "react";
import { Check, Copy, KeyRound, Share2 } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/cn";

export function CredentialCard({ title = "Login credentials", rows, shareText }) {
  const [copied, setCopied] = useState(null);
  const all = rows.map((r) => `${r.label}: ${r.value}`).join("\n");

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch { /* clipboard blocked; text stays selectable */ }
  };
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="rounded-[14px] border border-accent/30 bg-accent-soft p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-paper">
        <KeyRound className="size-4 text-accent" aria-hidden />
        {title}
      </div>
      <dl className="mt-3 divide-y divide-line rounded-[10px] border border-line bg-ink-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <div className="min-w-0">
              <dt className="text-[12px] text-muted">{r.label}</dt>
              <dd className={cn("text-[15px] text-paper break-all select-all", r.label === "Email" ? "font-medium" : "tn-code")}>{r.value}</dd>
            </div>
            <button onClick={() => copy(r.label, r.value)} className="shrink-0 p-2 rounded-lg text-muted hover:text-paper hover:bg-ink-3" aria-label={`Copy ${r.label}`}>
              {copied === r.label ? <Check className="size-4 text-signal" /> : <Copy className="size-4" />}
            </button>
          </div>
        ))}
      </dl>
      <p className="text-[13px] text-muted mt-3">
        This password is shown once. TechNeeds only keeps a scrambled copy, so if it&apos;s lost you&apos;ll need to reset it.
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" variant="secondary" onClick={() => copy("all", shareText || all)}>
          {copied === "all" ? <Check className="size-4 text-signal" /> : <Copy className="size-4" />}
          Copy all
        </Button>
        {canShare && (
          <Button size="sm" variant="secondary" onClick={() => navigator.share({ text: shareText || all }).catch(() => {})}>
            <Share2 className="size-4" /> Share
          </Button>
        )}
      </div>
    </div>
  );
}
