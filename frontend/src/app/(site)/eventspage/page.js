import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { buttonClass } from "@/components/ui/buttonClass";
import { contact } from "@/content/site";

export const metadata = { title: "Events" };

export default function Events() {
  return (
    <div className="mx-auto max-w-[640px] px-4 sm:px-6 pt-20 text-center">
      <CalendarDays className="size-8 text-muted mx-auto" aria-hidden />
      <h1 className="tn-display text-[clamp(2rem,4vw,2.75rem)] mt-4">Events are coming here soon</h1>
      <p className="text-muted mt-3">Hackathons, speaker sessions and tech introductions will be listed on this page. Until then, the WhatsApp community gets announcements first.</p>
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <a href={contact.whatsapp.url} target="_blank" rel="noreferrer" className={buttonClass({})}>Message us on WhatsApp</a>
        <Link href="/" className={buttonClass({ variant: "secondary" })}>Back home</Link>
      </div>
    </div>
  );
}
