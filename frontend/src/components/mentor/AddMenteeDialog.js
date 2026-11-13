"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAction } from "@/lib/useAction";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { CredentialDialog } from "@/components/ui/CredentialDialog";

// The server generates the enrollment number and the password.
export function AddMenteeDialog({ open, onClose, program, onAdded }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", interests: "" });
  const [issued, setIssued] = useState(null);
  const add = useAction((data) => api.mentor.addMentee(data));

  useEffect(() => { if (open) setForm({ name: "", email: "", interests: "" }); }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    const res = await add.run({
      name: form.name.trim(),
      email: form.email.trim(),
      programId: program._id,
      interests: form.interests.split(",").map((t) => t.trim()).filter(Boolean),
    });
    if (!res) return;
    onClose();
    onAdded?.(res);
    if (res.existing) toast.success(`${res.mentee.name} already had a login and is now in ${program.name}`);
    else setIssued(res);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} title={`Add a mentee to ${program?.name ?? "this program"}`}
        description="An enrollment number and password are generated for them.">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} autoFocus /></Field>
          <Field label="Email" hint="If they're already in another program, they keep their existing login.">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Interests" optional hint="Comma-separated. Feeds their AI profile; they can edit these later.">
            <Input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="react, ui design" />
          </Field>
          <FormError error={add.error} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={add.pending} disabled={!form.name.trim() || !form.email.trim()}>Add and generate login</Button>
          </div>
        </form>
      </Dialog>
      <CredentialDialog open={!!issued} onClose={() => setIssued(null)}
        title={`${issued?.mentee?.name ?? "Mentee"} is enrolled`}
        description="Share these with the mentee. The password can't be shown again, only reset."
        loginPath="/login?role=mentee"
        rows={issued ? [{ label: "Enrollment number", value: issued.mentee.enrollmentNumber }, { label: "Password", value: issued.tempPassword }] : []} />
    </>
  );
}
