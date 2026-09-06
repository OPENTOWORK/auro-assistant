import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProjectLabel } from "@/components/ui/AppIcon";
import { RECURRING_FREQUENCY_LABELS } from "@/lib/constants";
import { formatRecurringSchedule } from "@/lib/recurring-period";
import { useProjects } from "@/components/projects/ProjectsProvider";
import type { RecurringTask } from "@/types/database";

interface RecurringTaskCardProps {
  task: RecurringTask;
}

export function RecurringTaskCard({ task }: RecurringTaskCardProps) {
  const { getById } = useProjects();
  const project = task.project_id ? getById(task.project_id) : null;

  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-auro-text leading-snug">
          {task.title}
        </p>
        <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/25 dark:text-purple-300 shrink-0">
          {RECURRING_FREQUENCY_LABELS[task.frequency]}
        </Badge>
      </div>

      {task.description && (
        <p className="text-xs text-auro-muted line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-auro-muted">
        <span>{formatRecurringSchedule(task)}</span>
        {project && (
          <ProjectLabel
            name={project.name}
            icon={project.icon}
            color={project.color}
            className="text-auro-accent"
          />
        )}
      </div>
    </Card>
  );
}
