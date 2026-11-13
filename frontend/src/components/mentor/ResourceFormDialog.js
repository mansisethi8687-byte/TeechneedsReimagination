"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAction } from "@/lib/useAction";
import { toLocalInput, fromLocalInput, daysFromNow } from "@/lib/datetime";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";

const COPY = {
  video: { title: "Add a video", url: "Video link", urlHint: "YouTube, Drive or any public link.", score: 40 },
  project: { title: "Add a project", url: "Brief link", urlHint: "Optional: a doc or repo with the full brief.", score: 200 },
  quiz: { title: "Edit quiz", score: 100 },
};

// Create a video/project, or edit any resource (quizzes: settings and timing only).
export function ResourceFormDialog({ open, onClose, programId, type, resource, quiz, onSaved }) {
  const editing = !!resource;
  const kind = resource?.type || type;
  const copy = COPY[kind] || COPY.video;
  const [f, setF] = useState({});

  useEffect(() => {
    if (!open) return;
    setF(resource ? {
      title: resource.title, url: resource.url || "", description: resource.description || "",
      deadline: toLocalInput(resource.deadline), maxScore: String(resource.maxScore), tags: (resource.tags || []).join(", "),
      isLocked: !!resource.isLocked, startTime: toLocalInput(quiz?.startTime), endTime: toLocalInput(quiz?.endTime),
    } : { title: "", url: "", description: "", deadline: toLocalInput(daysFromNow(7)), maxScore: String(copy.score), tags: "", isLocked: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource, quiz]);

  const save = useAction((data) => (editing ? api.mentor.updateResource(resource._id, data) : api.mentor.addResource(data)),
    { success: editing ? "Saved" : (r) => `Published “${r.title}”` });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const data = {
      title: f.title.trim(),
      url: f.url?.trim() || undefined,
      description: f.description?.trim() || undefined,
      maxScore: Number(f.maxScore),
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      isLocked: f.isLocked,
      ...(kind === "quiz"
        ? { startTime: fromLocalInput(f.startTime), endTime: fromLocalInput(f.endTime) }
        : { deadline: fromLocalInput(f.deadline) }),
      ...(!editing ? { type: kind, program: programId } : {}),
    };
    const res = await save.run(data);
    if (res) { onSaved?.(res); onClose(); }
  };

  return (
    <Dialog open={open} onClose={onClose} title={editing ? `Edit “${resource.title}”` : copy.title}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Title"><Input value={f.title || ""} onChange={set("title")} required maxLength={140} autoFocus /></Field>
        {kind !== "quiz" && (
          <Field label={copy.url} hint={copy.urlHint} optional={kind === "project"}>
            <Input type="url" value={f.url || ""} onChange={set("url")} placeholder="https://" required={kind === "video"} />
          </Field>
        )}
        <Field label={kind === "project" ? "What to build" : "Notes"} optional>
          <Textarea rows={3} value={f.description || ""} onChange={set("description")} maxLength={2000} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {kind === "quiz" ? (
            <>
              <Field label="Opens"><Input type="datetime-local" value={f.startTime || ""} onChange={set("startTime")} required /></Field>
              <Field label="Closes" hint="Also the deadline."><Input type="datetime-local" value={f.endTime || ""} onChange={set("endTime")} min={f.startTime} required /></Field>
            </>
          ) : (
            <Field label="Deadline" hint="1 point off per day late."><Input type="datetime-local" value={f.deadline || ""} onChange={set("deadline")} required /></Field>
          )}
          <Field label="Max score"><Input type="number" min={kind === "quiz" ? 1 : 0} max={10000} value={f.maxScore || ""} onChange={set("maxScore")} required /></Field>
        </div>
        <Field label="Topics" optional hint="Comma-separated. Used for per-topic mastery on the AI profile.">
          <Input value={f.tags || ""} onChange={set("tags")} placeholder="react, hooks" />
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-paper cursor-pointer">
          <input type="checkbox" checked={!!f.isLocked} onChange={set("isLocked")} className="size-4 accent-[var(--accent)]" />
          Locked: mentees can see it but can&apos;t complete it yet
        </label>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.pending} disabled={!f.title?.trim()}>{editing ? "Save changes" : "Publish"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
