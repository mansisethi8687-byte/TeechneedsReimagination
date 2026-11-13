import { cn } from "@/lib/cn";

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={cn("flex flex-col items-center text-center px-6 py-12", className)}>
      {Icon && (
        <div className="size-11 rounded-xl bg-ink-3 border border-line grid place-items-center mb-4">
          <Icon className="size-5 text-muted" aria-hidden />
        </div>
      )}
      <h3 className="tn-heading text-base text-paper">{title}</h3>
      {children && <p className="text-sm text-muted mt-1 max-w-sm">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-[14px] border border-danger/30 bg-danger-soft px-5 py-4 text-sm flex items-center justify-between gap-4">
      <span className="text-paper">{error?.message || "Something went wrong."}</span>
      {onRetry && <button onClick={onRetry} className="text-danger font-medium hover:underline shrink-0">Try again</button>}
    </div>
  );
}
