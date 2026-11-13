// Human dates and deadlines: "Due Thu · in 2 days", never raw ISO strings.
const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function dayDiff(date, now = new Date()) {
  return Math.round((startOfDay(new Date(date)) - startOfDay(now)) / DAY);
}

export function shortDate(date) {
  const d = new Date(date);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

export function weekdayDate(date) {
  return new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function timeOfDay(date) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function relativeDays(date, now = new Date()) {
  const n = dayDiff(date, now);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

// { label, tone } where tone is 'urgent' (overdue or due within 48h), 'normal' or 'muted'.
export function deadlineInfo(deadline, { done = false, now = new Date() } = {}) {
  if (!deadline) return { label: "No deadline", tone: "muted" };
  const d = new Date(deadline);
  const hours = (d - now) / 3600000;
  if (done) return { label: `Was due ${shortDate(d)}`, tone: "muted" };
  if (hours < 0) {
    const late = -dayDiff(d, now);
    return { label: late <= 0 ? "Overdue · was due today" : `Overdue · ${plural(late, "day")} late`, tone: "urgent" };
  }
  if (hours < 24) return { label: `Due ${hours < 1 ? "within the hour" : `today, ${timeOfDay(d)}`}`, tone: "urgent" };
  if (hours < 48) return { label: `Due tomorrow, ${timeOfDay(d)}`, tone: "urgent" };
  return { label: `Due ${weekdayDate(d)} · ${relativeDays(d, now)}`, tone: "normal" };
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function firstName(name = "") {
  return name.trim().split(/\s+/)[0] || name;
}

export function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}
