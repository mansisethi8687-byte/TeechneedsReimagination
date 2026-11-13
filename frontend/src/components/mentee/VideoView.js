"use client";
import { CheckCircle2, ExternalLink, PlayCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAction } from "@/lib/useAction";
import { shortDate, timeOfDay, plural } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";

// Embeddable providers only; anything else opens in a new tab.
export function embedUrl(url = "") {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") || u.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return /^\d+$/.test(id || "") ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch { /* not a URL */ }
  return null;
}

export function VideoView({ data, onChanged }) {
  const { resource: r, completion: c } = data;
  const complete = useAction(() => api.mentee.complete(r._id), { success: (res) => `Marked as watched · ${res.score}/${r.maxScore} points` });
  const embed = embedUrl(r.url);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start [&>*]:min-w-0">
      <Card className="overflow-hidden">
        {embed ? (
          <div className="aspect-video bg-black">
            <iframe src={embed} title={r.title} className="w-full h-full" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" loading="lazy" />
          </div>
        ) : (
          <CardBody className="flex flex-col items-center text-center py-12">
            <PlayCircle className="size-10 text-muted" aria-hidden />
            <p className="text-paper mt-3 font-medium">This video is hosted outside TechNeeds</p>
            <p className="text-sm text-muted mt-1 max-w-sm">It opens in a new tab. Come back here to mark it as watched.</p>
            {r.url && <Button className="mt-4" variant="secondary" href={r.url} target="_blank" rel="noreferrer">Open video <ExternalLink className="size-4" aria-hidden /></Button>}
          </CardBody>
        )}
        {r.description && <CardBody className="border-t border-line text-sm text-paper whitespace-pre-line">{r.description}</CardBody>}
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3">
          {c ? (
            <>
              <p className="flex items-center gap-2 text-signal font-medium"><CheckCircle2 className="size-5" aria-hidden /> Watched</p>
              <p className="text-sm text-muted">Completed {shortDate(c.completedOn)}, {timeOfDay(c.completedOn)}{c.late ? " · after the deadline" : ""}.</p>
              <p className="tn-display tn-num text-[28px]">{c.score}<span className="text-muted text-[15px] font-medium"> / {r.maxScore} points</span></p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">Worth <span className="tn-num text-paper">{r.maxScore}</span> points. One point comes off for each full day after the deadline.</p>
              <p className="text-sm">
                Marking it now earns <span className="tn-num text-paper font-medium">{data.scoreIfCompletedNow}</span> points
                {data.daysLate > 0 && <span className="text-urgent"> ({plural(data.daysLate, "day")} late)</span>}.
              </p>
              <FormError error={complete.error} />
              <Button size="lg" loading={complete.pending} disabled={r.isLocked}
                onClick={async () => { if (await complete.run()) onChanged(); }}>
                <CheckCircle2 className="size-4" aria-hidden /> {r.isLocked ? "Locked by your mentor" : "Mark as watched"}
              </Button>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
