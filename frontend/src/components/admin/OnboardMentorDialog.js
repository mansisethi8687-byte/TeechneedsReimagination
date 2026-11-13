"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAction } from "@/lib/useAction";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { CredentialDialog } from "@/components/ui/CredentialDialog";
import { cn } from "@/lib/cn";

// Creates a mentor; the server generates the password, which is shown once.
export function OnboardMentorDialog({ open, onClose, programs = [], defaultProgramIds = [], onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", expertise: "", programIds: [] });
  const [created, setCreated] = useState(null);
  const create = useAction((data) => api.admin.createMentor(data), { success: (m) => `${m.name} onboarded` });

  useEffect(() => {
    if (open) setForm({ name: "", email: "", expertise: "", programIds: defaultProgramIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id) => setForm((f) => ({ ...f, programIds: f.programIds.includes(id) ? f.programIds.filter((x) => x !== id) : [...f.programIds, id] }));

  const submit = async (e) => {
    e.preventDefault();
    const res = await create.run({
      name: form.name.trim(),
      email: form.email.trim(),
      programIds: form.programIds,
      expertise: form.expertise.split(",").map((t) => t.trim()).filter(Boolean),
    });
    if (res) {
      onClose();
      setCreated(res);
      onCreated?.(res);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} title="Onboard a mentor" description="TechNeeds generates a secure password. You'll see it once.">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} autoFocus /></Field>
          <Field label="Email" hint="They sign in with this."><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label="Expertise" optional hint="Comma-separated, e.g. react, node, system design.">
            <Input value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} />
          </Field>
          {programs.length > 0 && (
            <fieldset>
              <legend className="text-[13px] font-medium text-paper mb-1.5">Programs</legend>
              <div className="flex flex-wrap gap-2">
                {programs.map((p) => {
                  const on = form.programIds.includes(p._id);
                  return (
                    <button type="button" key={p._id} onClick={() => toggle(p._id)} aria-pressed={on}
                      className={cn("h-8 px-3 rounded-full border text-[13px] transition",
                        on ? "bg-accent-soft border-accent/40 text-accent" : "border-line text-muted hover:text-paper")}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
          <FormError error={create.error} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={create.pending} disabled={!form.name.trim() || !form.email.trim()}>Create login</Button>
          </div>
        </form>
      </Dialog>
      <CredentialDialog
        open={!!created}
        onClose={() => setCreated(null)}
        title={`${created?.name ?? "Mentor"} is onboarded`}
        description="Send these to the mentor. The password can't be shown again, only reset."
        loginPath="/login?role=mentor"
        rows={created ? [{ label: "Email", value: created.email }, { label: "Password", value: created.tempPassword }] : []}
      />
    </>
  );
}
