"use client";
// Replaces every upstream alert(). useToast().success("Saved") etc.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const TONE = { success: "text-signal", error: "text-danger", info: "text-accent" };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((kind, message, { duration = kind === "error" ? 6000 : 3500 } = {}) => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    if (duration) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({
    success: (m, o) => push("success", m, o),
    error: (m, o) => push("error", typeof m === "string" ? m : m?.message || "Something went wrong", o),
    info: (m, o) => push("info", m, o),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="fixed z-[100] bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-96 pointer-events-none">
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div key={t.id} role={t.kind === "error" ? "alert" : "status"}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line-strong bg-ink-2/95 backdrop-blur px-4 py-3 shadow-2xl shadow-black/30 text-sm animate-[toast-in_180ms_ease-out]">
              <Icon className={cn("size-[18px] mt-px shrink-0", TONE[t.kind])} aria-hidden />
              <p className="flex-1 text-paper">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-muted hover:text-paper" aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes toast-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
