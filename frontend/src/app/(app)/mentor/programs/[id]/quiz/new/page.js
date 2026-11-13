"use client";
import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAction } from "@/lib/useAction";
import { toLocalInput, fromLocalInput, daysFromNow } from "@/lib/datetime";
import { plural } from "@/lib/format";
import { PageHeader } from "@/components/shell/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { cn } from "@/lib/cn";

let uid = 0;
const blankQuestion = () => ({ key: ++uid, questionText: "", options: ["", ""], correctOptionIndex: null, marks: 1 });

// Same rules the API enforces, so mistakes show before submitting.
function problems(q) {
  const out = [];
  if (!q.questionText.trim()) out.push("Write the question");
  if (q.options.some((o) => !o.trim())) out.push("Fill in every option or remove it");
  if (q.correctOptionIndex == null) out.push("Mark the correct option");
  return out;
}

function QuestionEditor({ q, index, total, onChange, onMove, onDuplicate, onRemove, showErrors }) {
  const errs = showErrors ? problems(q) : [];
  const setOption = (i, v) => onChange({ ...q, options: q.options.map((o, j) => (j === i ? v : o)) });
  const removeOption = (i) => {
    const options = q.options.filter((_, j) => j !== i);
    let c = q.correctOptionIndex;
    if (c === i) c = null; else if (c != null && c > i) c -= 1;
    onChange({ ...q, options, correctOptionIndex: c });
  };
  return (
    <Card className={cn(errs.length && "border-danger/40")}>
      <CardBody>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[15px] font-semibold text-paper">Question {index + 1}</h2>
          <div className="flex items-center gap-0.5">
            <Button size="icon" variant="ghost" className="size-8" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up"><ArrowUp className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="size-8" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move down"><ArrowDown className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="size-8" onClick={onDuplicate} aria-label="Duplicate"><Copy className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="size-8 hover:text-danger" onClick={onRemove} disabled={total === 1} aria-label="Delete question"><Trash2 className="size-4" /></Button>
          </div>
        </div>
        <Textarea rows={2} value={q.questionText} onChange={(e) => onChange({ ...q, questionText: e.target.value })}
          placeholder="What does useEffect run after?" aria-label={`Question ${index + 1} text`} maxLength={1000} />

        <fieldset className="mt-4">
          <legend className="text-[13px] text-muted mb-2">Options · click the circle to mark the correct one</legend>
          <ul className="flex flex-col gap-2">
            {q.options.map((opt, i) => {
              const correct = q.correctOptionIndex === i;
              return (
                <li key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => onChange({ ...q, correctOptionIndex: i })}
                    aria-label={`Mark option ${i + 1} correct`} aria-pressed={correct}
                    className={cn("size-8 shrink-0 rounded-full border grid place-items-center transition",
                      correct ? "bg-signal-soft border-signal text-signal" : "border-line-strong text-transparent hover:text-muted")}>
                    <Check className="size-4" />
                  </button>
                  <Input value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`}
                    aria-label={`Option ${i + 1}`} className={cn(correct && "border-signal/50")} />
                  <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={() => removeOption(i)} disabled={q.options.length <= 2} aria-label={`Remove option ${i + 1}`}>
                    <X className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
            <Button size="sm" variant="ghost" onClick={() => onChange({ ...q, options: [...q.options, ""] })} disabled={q.options.length >= 6}>
              <Plus className="size-4" aria-hidden /> Add option
            </Button>
            <label className="flex items-center gap-2 text-[13px] text-muted">
              Marks
              <Input type="number" min={1} max={100} value={q.marks} onChange={(e) => onChange({ ...q, marks: e.target.value })} className="w-20 h-8" />
            </label>
          </div>
        </fieldset>
        {errs.length > 0 && <p className="text-[13px] text-danger mt-3">{errs.join(" · ")}</p>}
      </CardBody>
    </Card>
  );
}

export default function NewQuiz({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const program = useApi(() => api.mentor.program(id), [id]);
  const [meta, setMeta] = useState({
    title: "", description: "", tags: "",
    startTime: toLocalInput(new Date()), endTime: toLocalInput(daysFromNow(7)),
    maxScore: "", revealScores: true,
  });
  const [questions, setQuestions] = useState(() => [blankQuestion()]);
  const [showErrors, setShowErrors] = useState(false);
  const totalMarks = useMemo(() => questions.reduce((s, q) => s + (Number(q.marks) || 0), 0), [questions]);
  const publish = useAction((data) => api.mentor.addQuiz(data), { success: (r) => `Published “${r.resource.title}”` });

  const update = (i, q) => setQuestions((qs) => qs.map((x, j) => (j === i ? q : x)));
  const move = (i, d) => setQuestions((qs) => { const c = [...qs]; [c[i], c[i + d]] = [c[i + d], c[i]]; return c; });
  const invalid = !meta.title.trim() || questions.some((q) => problems(q).length) || !meta.endTime || new Date(meta.endTime) <= new Date(meta.startTime);

  const submit = async (e) => {
    e.preventDefault();
    setShowErrors(true);
    if (invalid) return;
    const res = await publish.run({
      program: id,
      title: meta.title.trim(),
      description: meta.description.trim() || undefined,
      tags: meta.tags.split(",").map((t) => t.trim()).filter(Boolean),
      startTime: fromLocalInput(meta.startTime),
      endTime: fromLocalInput(meta.endTime),
      maxScore: meta.maxScore ? Number(meta.maxScore) : undefined,
      revealScores: meta.revealScores,
      questions: questions.map((q) => ({ questionText: q.questionText.trim(), options: q.options.map((o) => o.trim()), correctOptionIndex: q.correctOptionIndex, marks: Number(q.marks) || 1 })),
    });
    if (res) router.push(`/mentor/programs/${id}?tab=resources`);
  };

  const publishBlock = (
    <>
      <FormError error={publish.error} />
      {showErrors && invalid && !publish.error && <p className="text-[13px] text-danger">Fix the highlighted questions first.</p>}
      <Button type="submit" size="lg" loading={publish.pending}>Publish quiz</Button>
    </>
  );

  return (
    <form onSubmit={submit} noValidate>
      <Link href={`/mentor/programs/${id}?tab=resources`} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-paper mb-4">
        <ArrowLeft className="size-4" aria-hidden /> {program.data?.name ?? "Program"}
      </Link>
      <PageHeader eyebrow={program.data?.name} title="New quiz"
        description="Multiple choice, scored automatically. Mentees get one attempt while it's open." />

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="flex flex-col gap-4 order-2 lg:order-1">
          {questions.map((q, i) => (
            <QuestionEditor key={q.key} q={q} index={i} total={questions.length} showErrors={showErrors}
              onChange={(nq) => update(i, nq)} onMove={(d) => move(i, d)}
              onDuplicate={() => setQuestions((qs) => [...qs.slice(0, i + 1), { ...q, key: ++uid, options: [...q.options] }, ...qs.slice(i + 1)])}
              onRemove={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} />
          ))}
          <Button variant="secondary" size="lg" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])} disabled={questions.length >= 100}>
            <Plus className="size-4" aria-hidden /> Add question
          </Button>
          {/* Below lg the settings stack first, so Publish belongs after the questions. */}
          <div className="lg:hidden flex flex-col gap-3 pt-2">{publishBlock}</div>
        </div>

        <Card className="order-1 lg:order-2 lg:sticky lg:top-6">
          <CardBody className="flex flex-col gap-4">
            <Field label="Title" error={showErrors && !meta.title.trim() ? "Give the quiz a title" : undefined}>
              <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} maxLength={140} placeholder="React mental model" />
            </Field>
            <Field label="Notes" optional><Textarea rows={2} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} maxLength={2000} /></Field>
            <Field label="Opens"><Input type="datetime-local" value={meta.startTime} onChange={(e) => setMeta({ ...meta, startTime: e.target.value })} /></Field>
            <Field label="Closes" hint="This is also the deadline."
              error={showErrors && new Date(meta.endTime) <= new Date(meta.startTime) ? "Must be after it opens" : undefined}>
              <Input type="datetime-local" value={meta.endTime} min={meta.startTime} onChange={(e) => setMeta({ ...meta, endTime: e.target.value })} />
            </Field>
            <Field label="Max score" hint={`Blank uses total marks (${totalMarks}). Scores scale to this.`}>
              <Input type="number" min={1} max={10000} value={meta.maxScore} placeholder={String(totalMarks)} onChange={(e) => setMeta({ ...meta, maxScore: e.target.value })} />
            </Field>
            <Field label="Topics" optional><Input value={meta.tags} onChange={(e) => setMeta({ ...meta, tags: e.target.value })} placeholder="react, hooks" /></Field>
            <label className="flex items-start gap-2.5 text-sm text-paper cursor-pointer">
              <input type="checkbox" checked={meta.revealScores} onChange={(e) => setMeta({ ...meta, revealScores: e.target.checked })} className="size-4 mt-0.5 accent-[var(--accent)]" />
              Show mentees which answers were right after they submit
            </label>
            <div className="pt-3 border-t border-line text-[13px] text-muted">
              {plural(questions.length, "question")} · {plural(totalMarks, "mark")}
            </div>
            <div className="hidden lg:flex flex-col gap-3">{publishBlock}</div>
          </CardBody>
        </Card>
      </div>
    </form>
  );
}
