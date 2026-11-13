"use client";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { CredentialCard } from "./CredentialCard";

// Shown right after credentials are generated. Closing it is deliberate:
// the password cannot be retrieved again.
export function CredentialDialog({ open, onClose, title, description, rows, loginPath }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}${loginPath}` : loginPath;
  const shareText = [`TechNeeds login`, url, ...rows.map((r) => `${r.label}: ${r.value}`)].join("\n");
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} dismissible={false}
      footer={<Button onClick={onClose}>I&apos;ve saved these</Button>}>
      <CredentialCard rows={[...rows, { label: "Sign in at", value: url }]} shareText={shareText} />
    </Dialog>
  );
}
