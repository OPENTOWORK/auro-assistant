import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { AppIcon, ProjectLabel } from "@/components/ui/AppIcon";
import {
  PRIORITY_COLORS,
  STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_SOURCE_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import { SOURCE_ICON_NAMES } from "@/lib/icons";
import { useProjects } from "@/components/projects/ProjectsProvider";
import { formatRelativeTime } from "@/lib/utils";
import type { Task } from "@/types/database";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const { getById } = useProjects();
  const project = task.project_id ? getById(task.project_id) : null;

  return (
    <Link href={`/tareas/${task.id}`}>
      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-auro-surface border border-auro-border text-auro-muted">
              <AppIcon name={SOURCE_ICON_NAMES[task.source]} className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-medium text-auro-text text-sm leading-snug truncate">
              {task.title}
            </h3>
          </div>
          <Badge className={PRIORITY_COLORS[task.priority]}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </Badge>
        </div>

        {task.ai_summary && (
          <p className="text-xs text-auro-muted line-clamp-2">{task.ai_summary}</p>
        )}

        <div className="flex items-center justify-between">
          <Badge className={STATUS_COLORS[task.status]}>
            {TASK_STATUS_LABELS[task.status]}
          </Badge>
          <div className="flex items-center gap-2 text-xs text-auro-muted">
            {project ? (
              <ProjectLabel
                name={project.name}
                icon={project.icon}
                color={project.color}
                className="text-auro-accent"
              />
            ) : (
              <span>{TASK_SOURCE_LABELS[task.source]}</span>
            )}
            <span>·</span>
            <span>{formatRelativeTime(task.created_at)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
