"use client";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = "Confirm", danger = false, pending = false }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={pending}>{confirmLabel}</Button>
      </>}>
      <div className="text-sm text-muted">{children}</div>
    </Dialog>
  );
}
