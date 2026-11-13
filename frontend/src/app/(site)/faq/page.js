import Link from "next/link";
import { ChevronDown, Mail, MessageCircle } from "lucide-react";
import { faqs, contact } from "@/content/site";

export const metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-[760px] px-4 sm:px-6 pt-14">
      <p className="text-[13px] text-muted">Help</p>
      <h1 className="tn-display text-[clamp(2rem,4vw,2.75rem)] mt-2">Frequently asked questions</h1>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {faqs.map((f, i) => (
          <details key={f.q} className="group py-1" open={i === 0}>
            <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none text-paper font-medium [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="size-5 text-muted shrink-0 transition group-open:rotate-180" aria-hidden />
            </summary>
            <p className="text-muted pb-5 -mt-1">{f.a}</p>
          </details>
        ))}
      </div>
      <div className="mt-10 rounded-[16px] border border-line bg-ink-2 p-6">
        <h2 className="tn-heading text-[17px]">Still stuck?</h2>
        <p className="text-sm text-muted mt-1">Message the team, or see how points work on the <Link href="/leaderboard" className="text-accent underline underline-offset-2">leaderboard</Link>.</p>
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 text-paper hover:text-accent"><Mail className="size-4" aria-hidden />{contact.email}</a>
          <a href={contact.whatsapp.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-paper hover:text-accent"><MessageCircle className="size-4" aria-hidden />WhatsApp</a>
        </div>
      </div>
    </div>
  );
}
