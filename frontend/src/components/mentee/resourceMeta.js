import { FileVideo, FolderGit2, ListChecks } from "lucide-react";

export const TYPE = {
  video: { label: "Video", icon: FileVideo, action: "Watch" },
  quiz: { label: "Quiz", icon: ListChecks, action: "Take quiz" },
  project: { label: "Project", icon: FolderGit2, action: "Submit" },
};

// One status vocabulary for every mentee screen.
// tone: neutral | accent | urgent | signal (signal = verified/scored only)
export function statusOf(r, now = new Date()) {
  if (r.status === "verified") return { key: "verified", label: `Reviewed · ${r.score}/${r.maxScore}`, tone: "signal" };
  if (r.status === "submitted") return { key: "submitted", label: "Awaiting review", tone: "accent" };
  if (r.status === "completed") return { key: "done", label: `Done · ${r.score}/${r.maxScore}`, tone: "signal" };
  if (r.isLocked) return { key: "locked", label: "Locked", tone: "neutral" };
  if (r.type === "quiz") {
    const st = r.quizWindow?.state;
    if (st === "upcoming") return { key: "upcoming", label: "Not open yet", tone: "neutral" };
    if (st === "closed") return { key: "missed", label: "Closed · missed", tone: "neutral" };
    return { key: "open", label: "Open now", tone: "accent" };
  }
  if (r.deadline && new Date(r.deadline) < now) return { key: "overdue", label: "Overdue", tone: "urgent" };
  return { key: "todo", label: "To do", tone: "neutral" };
}

// What the mentee can do next, and whether it's still actionable.
export function actionOf(r) {
  const s = statusOf(r);
  if (["locked", "upcoming", "missed"].includes(s.key)) return { label: "View", primary: false };
  if (s.key === "verified" || s.key === "done") return { label: r.type === "quiz" ? "See result" : "View", primary: false };
  if (s.key === "submitted") return { label: "View submission", primary: false };
  return { label: TYPE[r.type].action, primary: true };
}

// Actionable items first: overdue, then by deadline. Done items last.
export function sortForAction(resources) {
  const rank = (r) => {
    const k = statusOf(r).key;
    if (k === "overdue") return 0;
    if (k === "open" || k === "todo") return 1;
    if (k === "upcoming" || k === "locked") return 2;
    if (k === "submitted") return 3;
    return 4;
  };
  return [...resources].sort((a, b) => rank(a) - rank(b) || new Date(a.deadline) - new Date(b.deadline));
}
