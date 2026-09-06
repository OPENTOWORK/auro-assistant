import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProjectIcon } from "@/components/ui/AppIcon";
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
} from "@/lib/constants";
import { deadlineUrgency, formatDateOnly } from "@/lib/intelligence/dates";
import type { Project } from "@/types/database";

interface ProjectCardProps {
  project: Project;
  taskCount?: number;
  compact?: boolean;
}

export function ProjectCard({ project, taskCount = 0, compact }: ProjectCardProps) {
  return (
    <Link href={`/proyectos/${project.slug}`}>
      <Card className="relative overflow-hidden transition-colors hover:border-auro-accent/40">
        <div
          className="absolute left-0 top-0 h-full w-1"
          style={{ backgroundColor: project.color }}
        />

        <div className={`pl-3 ${compact ? "space-y-1.5" : "space-y-2"}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <ProjectIcon
                name={project.icon}
                color={project.color}
                size={compact ? "sm" : "md"}
              />
              <div className="min-w-0">
                <h3 className="font-medium text-auro-text text-sm leading-snug truncate">
                  {project.name}
                </h3>
                {!compact && (
                  <p className="text-xs text-auro-muted truncate">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-mono text-auro-muted">
              #{project.priority}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge className={PROJECT_STATUS_COLORS[project.status]}>
                {PROJECT_STATUS_LABELS[project.status]}
              </Badge>
              {!compact && (
                <Badge className="bg-auro-surface text-auro-muted border-auro-border">
                  {PROJECT_TYPE_LABELS[project.type]}
                </Badge>
              )}
            </div>
            {taskCount > 0 && (
              <span className="text-xs text-auro-accent font-medium shrink-0">
                {taskCount} {taskCount === 1 ? "tarea" : "tareas"}
              </span>
            )}
          </div>

          {(project.blocked_reason || project.deadline || (!compact && project.next_action)) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {project.blocked_reason && (
                <Badge className="bg-red-500/15 text-red-700 border-red-500/25 dark:text-red-300">
                  Bloqueado
                </Badge>
              )}
              {project.deadline && (
                <span
                  className={
                    deadlineUrgency(project.deadline) === "overdue"
                      ? "text-[11px] text-red-400"
                      : deadlineUrgency(project.deadline) === "today"
                        ? "text-[11px] text-amber-400"
                        : "text-[11px] text-auro-muted"
                  }
                >
                  {formatDateOnly(project.deadline)}
                </span>
              )}
              {!compact && project.next_action && (
                <span className="text-[11px] text-auro-muted truncate max-w-[180px]">
                  {project.next_action}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
