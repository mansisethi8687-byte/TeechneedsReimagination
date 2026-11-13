"use client";
import { cloneElement, forwardRef, isValidElement, useId } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full bg-ink-3 text-paper placeholder:text-muted/70 border border-line rounded-[10px] px-3.5 " +
  "transition focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 " +
  "disabled:opacity-60 aria-[invalid=true]:border-danger";

// <Field label hint error>{({ id, describedBy, invalid }) => <Input ... />}</Field>
// or with a single child element, which receives id/aria props automatically.
export function Field({ label, hint, error, optional, className, children }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint && hintId, error && errId].filter(Boolean).join(" ") || undefined;
  const props = { id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined };
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-paper">
          {label}
          {optional && <span className="text-muted font-normal"> (optional)</span>}
        </label>
      )}
      {typeof children === "function" ? children(props) : childWith(children, props)}
      {hint && !error && <p id={hintId} className="text-[13px] text-muted">{hint}</p>}
      {error && <p id={errId} className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

function childWith(child, props) {
  return isValidElement(child) ? cloneElement(child, { ...props, ...child.props }) : child;
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(control, "h-10", className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 4, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(control, "py-2.5 resize-y min-h-24", className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(control, "h-10 pr-9 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:16px]", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b93a1' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}>
      {children}
    </select>
  );
});
