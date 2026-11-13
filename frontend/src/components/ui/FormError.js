// Shows an API error under a form. Field details from the API are listed.
export function FormError({ error }) {
  if (!error) return null;
  const details = error.details && typeof error.details === "object" ? Object.values(error.details) : [];
  return (
    <div role="alert" className="rounded-[10px] border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-paper">
      {error.message}
      {details.length > 0 && <ul className="mt-1 list-disc pl-5 text-[13px] text-muted">{details.map((d) => <li key={d}>{d}</li>)}</ul>}
    </div>
  );
}
