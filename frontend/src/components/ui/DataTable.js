import { cn } from "@/lib/cn";

// A table on wide screens, stacked cards under 640px. No horizontal page scroll.
// columns: [{ key, header, render?(row), className?, hideOnMobile?, primary? }]
export function DataTable({ columns, rows, rowKey = (r) => r._id || r.id, empty, className }) {
  if (!rows?.length) return empty || null;
  const primary = columns.find((c) => c.primary) || columns[0];
  const cell = (c, r) => (c.render ? c.render(r) : r[c.key]);
  return (
    <div className={className}>
      <table className="hidden sm:table w-full text-sm">
        <thead>
          <tr className="text-left text-[13px] text-muted border-b border-line">
            {columns.map((c) => <th key={c.key} scope="col" className={cn("font-medium py-2.5 px-5 first:pl-5", c.className)}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-b border-line last:border-0 hover:bg-ink-3/40">
              {columns.map((c) => <td key={c.key} className={cn("py-3 px-5 align-middle", c.className)}>{cell(c, r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="sm:hidden divide-y divide-line">
        {rows.map((r) => (
          <li key={rowKey(r)} className="px-4 py-3.5">
            <div className="font-medium text-paper">{cell(primary, r)}</div>
            <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
              {columns.filter((c) => c !== primary && !c.hideOnMobile).map((c) => (
                <div key={c.key} className="contents">
                  <dt className="text-muted">{c.header}</dt>
                  <dd className="text-paper min-w-0">{cell(c, r)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
