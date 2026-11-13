"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, ExternalLink, FolderGit2, Globe, MessageSquareText } from "lucide-react";
import { api } from "@/lib/api";
import { useAction } from "@/lib/useAction";
import { shortDate, timeOfDay } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";

const isHttpUrl = (v) => { try { return ["http:", "https:"].includes(new URL(v).protocol); } catch { return false; } };
const MIN_DESC = 20;

export function ProjectView({ data, onChanged }) {
  const { resource: r, completion: c, status } = data;
  const reviewed = status === "verified";
  const [form, setForm] = useState({ githubLink: "", deployedLink: "", description: "" });
  const [touched, setTouched] = useState(false);
  const [editing, setEditing] = useState(!c);

  useEffect(() => {
    setForm({ githubLink: c?.githubLink || "", deployedLink: c?.deployedLink || "", description: c?.description || "" });
    setEditing(!c);
  }, [c]);

  const submit = useAction((body) => api.mentee.submitProject(r._id, body), {
    success: (res) => (res.resubmitted ? "Submission updated" : res.late ? "Submitted (after the deadline)" : "Project submitted"),
  });

  const errors = {
    githubLink: !form.githubLink.trim() ? "Add your repository link" : !isHttpUrl(form.githubLink.trim()) ? "Must be a full http(s) link" : null,
    deployedLink: form.deployedLink.trim() && !isHttpUrl(form.deployedLink.trim()) ? "Must be a full http(s) link" : null,
    description: form.description.trim().length < MIN_DESC ? `At least ${MIN_DESC} characters` : null,
  };
  const valid = !Object.values(errors).some(Boolean);
  const late = r.deadline && new Date() > new Date(r.deadline);

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const res = await submit.run({
      githubLink: form.githubLink.trim(),
      deployedLink: form.deployedLink.trim() || undefined,
      description: form.description.trim(),
    });
    if (res) { setTouched(false); onChanged(); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-4 items-start [&>*]:min-w-0">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Brief" />
          <CardBody className="text-sm text-paper whitespace-pre-line pt-3">
            {r.description || "Your mentor didn't add written notes for this project."}
            {r.url && <p className="mt-3"><a href={r.url} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2 inline-flex items-center gap-1">Full brief <ExternalLink className="size-3.5" aria-hidden /></a></p>}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-[13px] text-muted space-y-1.5">
            <p className="text-paper font-medium text-sm">How projects work</p>
            <p>Your mentor scores it out of <span className="tn-num text-paper">{r.maxScore}</span> and can leave feedback.</p>
            <p>You can update your submission until it&apos;s reviewed. After the review it&apos;s final.</p>
            <p>Late submissions are accepted and marked late for your mentor.</p>
          </CardBody>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        {c && (
          <Card>
            <CardBody>
              {reviewed ? (
                <>
                  <p className="flex items-center gap-2 text-signal font-medium"><CheckCircle2 className="size-5" aria-hidden /> Reviewed</p>
                  <p className="tn-display tn-num text-[32px] mt-2">{c.score}<span className="text-muted text-[15px] font-medium"> / {r.maxScore} points</span></p>
                  <p className="text-[13px] text-muted mt-1">Reviewed {c.verifiedAt ? `${shortDate(c.verifiedAt)}, ${timeOfDay(c.verifiedAt)}` : ""}</p>
                  {c.feedback ? (
                    <div className="mt-4 rounded-[10px] bg-ink-3 border border-line px-4 py-3">
                      <p className="text-[13px] text-muted flex items-center gap-1.5"><MessageSquareText className="size-4" aria-hidden /> Mentor feedback</p>
                      <p className="text-sm text-paper mt-1.5 whitespace-pre-line">{c.feedback}</p>
                    </div>
                  ) : <p className="text-sm text-muted mt-3">No written feedback.</p>}
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-accent font-medium"><Clock className="size-5" aria-hidden /> Awaiting review</p>
                  <p className="text-[13px] text-muted mt-1">
                    Submitted {shortDate(c.submittedOn)}, {timeOfDay(c.submittedOn)}{c.late && <> · <span className="text-urgent">after the deadline</span></>}
                  </p>
                </>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" variant="secondary" href={c.githubLink} target="_blank" rel="noreferrer"><FolderGit2 className="size-4" aria-hidden /> Repository</Button>
                {c.deployedLink && <Button size="sm" variant="secondary" href={c.deployedLink} target="_blank" rel="noreferrer"><Globe className="size-4" aria-hidden /> Live app</Button>}
                {!reviewed && !editing && <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Update submission</Button>}
              </div>
            </CardBody>
          </Card>
        )}

        {!reviewed && editing && (
          <Card>
            <CardHeader title={c ? "Update your submission" : "Submit your project"}
              description={late ? "The deadline has passed. You can still submit; it will be marked late." : undefined} />
            <CardBody>
              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                <Field label="Repository link" hint="A public GitHub, GitLab or similar repo." error={touched ? errors.githubLink : undefined}>
                  <Input type="url" inputMode="url" placeholder="https://github.com/you/project" value={form.githubLink} onChange={(e) => setForm({ ...form, githubLink: e.target.value })} />
                </Field>
                <Field label="Live link" optional hint="If it's deployed somewhere." error={touched ? errors.deployedLink : undefined}>
                  <Input type="url" inputMode="url" placeholder="https://your-app.example.com" value={form.deployedLink} onChange={(e) => setForm({ ...form, deployedLink: e.target.value })} />
                </Field>
                <Field label="What you built" error={touched ? errors.description : undefined}
                  hint={`${form.description.trim().length} characters · at least ${MIN_DESC}. What it does, how you built it, what you'd improve.`}>
                  <Textarea rows={5} maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Field>
                <FormError error={submit.error} />
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {c && <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
                  <Button type="submit" size="lg" loading={submit.pending} disabled={r.isLocked}>
                    {r.isLocked ? "Locked by your mentor" : c ? "Save new version" : "Submit project"}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}
        {reviewed && <Badge tone="neutral" className="self-start">This project is final</Badge>}
      </div>
    </div>
  );
}
