import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatDateOnly, formatDateTime } from "@/lib/intelligence/dates";
import { topDecisionReasons } from "@/lib/intelligence/decision-engine";
import type { RankedTask } from "@/lib/intelligence/decision-types";

function planningLabel(item: RankedTask): string | null {
  const plannedToday = item.reasons.some(
    (reason) => reason.code === "planned_today"
  );
  if (plannedToday) return "Planificada para hoy";
  if (item.task.planned_for) {
    return `Planificada: ${formatDateOnly(item.task.planned_for)}`;
  }
  return null;
}

export function DecisionPriorityRow({
  item,
  index,
}: {
  item: RankedTask;
  index: number;
}) {
  const topReasons = topDecisionReasons(item.reasons, 2);
  const details = [
    planningLabel(item),
    item.task.due_at ? `Deadline: ${formatDateTime(item.task.due_at)}` : null,
    item.task.estimated_minutes ? `${item.task.estimated_minutes} min` : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <Link href={`/tareas/${item.task.id}`}>
      <Card className="py-2.5 px-3 hover:border-auro-accent/40 transition-colors">
        <p className="text-sm font-medium text-auro-text">
          {index}. {item.task.title}
        </p>
        {item.project && (
          <p className="text-xs text-auro-accent mt-0.5">{item.project.name}</p>
        )}
        {topReasons.length > 0 && (
          <p className="text-xs text-auro-muted mt-1">
            {topReasons.map((reason) => reason.label).join(" · ")}
          </p>
        )}
        {details.length > 0 && (
          <p className="text-[11px] text-auro-muted mt-1">{details.join(" · ")}</p>
        )}
      </Card>
    </Link>
  );
}
