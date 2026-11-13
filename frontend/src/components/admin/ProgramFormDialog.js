"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAction } from "@/lib/useAction";
import { toLocalInput, fromLocalInput } from "@/lib/datetime";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";

// Mirrors the backend's deriveProgramCode: initials, or first 4 letters of one word.
export function suggestCode(name = "") {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !/^\d+$/.test(w));
  if (!words.length) return "";
  return words.length === 1 ? words[0].slice(0, 4) : words.map((w) => w[0]).join("").slice(0, 4);
}

const toDate = (v) => (v ? toLocalInput(v).slice(0, 10) : "");

export function ProgramFormDialog({ open, onClose, program, onSaved }) {
  const editing = !!program;
  const [form, setForm] = useState({ name: "", code: "", description: "", startDate: "", endDate: "" });
  const [codeTouched, setCodeTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(program
      ? { name: program.name, code: program.code || "", description: program.description || "", startDate: toDate(program.startDate), endDate: toDate(program.endDate) }
      : { name: "", code: "", description: "", startDate: "", endDate: "" });
    setCodeTouched(editing);
  }, [open, program, editing]);

  const save = useAction(
    (data) => (editing ? api.admin.updateProgram(program._id, data) : api.admin.createProgram(data)),
    { success: editing ? "Program updated" : (p) => `Created ${p.name}` },
  );

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v, ...(k === "name" && !codeTouched ? { code: suggestCode(v) } : {}) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const result = await save.run({
      name: form.name.trim(),
      code: form.code.trim().toUpperCase() || undefined,
      description: form.description.trim() || undefined,
      startDate: fromLocalInput(form.startDate && `${form.startDate}T00:00`),
      endDate: fromLocalInput(form.endDate && `${form.endDate}T23:59`),
    });
    if (result) {
      onSaved?.(result);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={editing ? "Edit program" : "New program"}
      description={editing ? undefined : "A cohort with its own mentors, mentees and resources."}>
      <form id="program-form" onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Name"><Input value={form.name} onChange={set("name")} placeholder="Web Development" required maxLength={80} autoFocus /></Field>
        <Field label="Code" hint={`Used in enrollment numbers, e.g. TN-${form.code || "WD"}${String(new Date().getFullYear()).slice(-2)}-001. 2–6 letters or digits.`}>
          <Input value={form.code} onChange={(e) => { setCodeTouched(true); set("code")(e); }} className="uppercase" maxLength={6} pattern="[A-Za-z0-9]{2,6}" />
        </Field>
        <Field label="Description" optional><Textarea rows={3} value={form.description} onChange={set("description")} maxLength={500} placeholder="What mentees will learn and build." /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts" optional><Input type="date" value={form.startDate} onChange={set("startDate")} /></Field>
          <Field label="Ends" optional><Input type="date" value={form.endDate} onChange={set("endDate")} min={form.startDate || undefined} /></Field>
        </div>
        <FormError error={save.error} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.pending} disabled={!form.name.trim()}>{editing ? "Save changes" : "Create program"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
