"use client";
// Native <dialog>: focus trapping, Escape and inert background come from the browser.
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Dialog({ open, onClose, title, description, children, footer, size = "md", dismissible = true }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); if (dismissible) onClose?.(); }}
      onClick={(e) => { if (dismissible && e.target === ref.current) onClose?.(); }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] p-0 rounded-[20px] border border-line-strong bg-ink-2 text-paper shadow-2xl",
        "backdrop:bg-black/60 backdrop:backdrop-blur-[2px]",
        size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg",
      )}
      aria-labelledby="dialog-title"
    >
      {open && (
        <div className="flex flex-col max-h-[85vh]">
          <div className="flex items-start justify-between gap-4 px-5 pt-5">
            <div>
              <h2 id="dialog-title" className="tn-heading text-lg">{title}</h2>
              {description && <p className="text-sm text-muted mt-1">{description}</p>}
            </div>
            {dismissible && (
              <button onClick={onClose} className="text-muted hover:text-paper -mr-1 size-11 grid place-items-center rounded-xl hover:bg-ink-3" aria-label="Close">
                <X className="size-5" />
              </button>
            )}
          </div>
          <div className="px-5 py-4 overflow-y-auto">{children}</div>
          {footer && <div className="px-5 pb-5 pt-1 flex flex-wrap justify-end gap-2">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
