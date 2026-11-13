import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { Logo } from "@/components/shell/Logo";
import { contact } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line mt-20">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="text-sm text-muted mt-4 max-w-xs">The technical community at IGDTUW. All you need to know about tech, learned together.</p>
        </div>
        <nav aria-label="Footer">
          <h2 className="text-[13px] text-muted mb-3">Explore</h2>
          <ul className="space-y-2 text-sm">
            {[["/", "Home"], ["/team", "Team"], ["/leaderboard", "Leaderboard"], ["/eventspage", "Events"], ["/faq", "FAQ"], ["/login", "Sign in"]].map(([href, label]) => (
              <li key={href}><Link href={href} className="text-paper hover:text-accent">{label}</Link></li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="text-[13px] text-muted mb-3">Contact</h2>
          <p className="text-sm text-muted mb-3">Message us on WhatsApp or email us directly.</p>
          <ul className="space-y-2 text-sm">
            <li><a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 text-paper hover:text-accent"><Mail className="size-4" aria-hidden />{contact.email}</a></li>
            <li><a href={contact.whatsapp.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-paper hover:text-accent"><MessageCircle className="size-4" aria-hidden /><span className="tn-num">{contact.whatsapp.label}</span></a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-[1120px] px-4 sm:px-6 py-5 text-[13px] text-muted">© {new Date().getFullYear()} TechNeeds IGDTUW</p>
      </div>
    </footer>
  );
}
