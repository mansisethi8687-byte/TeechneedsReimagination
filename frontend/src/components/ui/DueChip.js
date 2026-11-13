import { Clock } from "lucide-react";
import { Badge } from "./Badge";
import { deadlineInfo } from "@/lib/format";

export function DueChip({ deadline, done = false, className }) {
  const { label, tone } = deadlineInfo(deadline, { done });
  return (
    <Badge tone={tone === "urgent" ? "urgent" : "neutral"} icon={Clock} className={className}>
      <time dateTime={deadline ? new Date(deadline).toISOString() : undefined}>{label}</time>
    </Badge>
  );
}
