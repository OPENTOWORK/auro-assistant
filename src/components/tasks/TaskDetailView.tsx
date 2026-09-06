"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AppIcon, ProjectLabel } from "@/components/ui/AppIcon";
import { DemoBanner } from "@/components/layout/DemoBanner";
import {
  PRIORITY_COLORS,
  STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_SOURCE_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import { SOURCE_ICON_NAMES } from "@/lib/icons";
import { isSupabaseConfigured } from "@/lib/config";
import { useProjects } from "@/components/projects/ProjectsProvider";
import { formatRelativeTime } from "@/lib/utils";
import type { Task } from "@/types/database";

interface TaskDetailViewProps {
  taskId: string;
}

export function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const { getById } = useProjects();
  const showDemo = !isSupabaseConfigured();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (res.ok) {
          const json = await res.json();
          setTask(json.task ?? null);
        } else {
          setTask(null);
        }
      } catch {
        setTask(null);
      }
      setLoading(false);
    }
    load();
  }, [taskId]);

  if (loading) {
    return <p className="text-sm text-auro-muted">Cargando tarea...</p>;
  }

  if (!task) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-auro-muted">Tarea no encontrada.</p>
        <Link href="/tareas" className="text-sm text-auro-accent hover:underline">
          ← Volver a tareas
        </Link>
      </div>
    );
  }

  const project = task.project_id ? getById(task.project_id) : null;

  return (
    <div className="space-y-5">
      {showDemo && <DemoBanner />}

      <Link
        href="/tareas"
        className="inline-flex items-center gap-1 text-xs text-auro-muted hover:text-auro-text transition-colors"
      >
        ← Volver a tareas
      </Link>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-auro-surface border border-auro-border text-auro-muted">
            <AppIcon name={SOURCE_ICON_NAMES[task.source]} className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-auro-text leading-snug">
              {task.title}
            </h2>
            <p className="text-xs text-auro-muted mt-1 flex flex-wrap items-center gap-1">
              {project ? (
                <Link
                  href={`/proyectos/${project.slug}`}
                  className="text-auro-accent hover:underline"
                >
                  <ProjectLabel
                    name={project.name}
                    icon={project.icon}
                    color={project.color}
                  />
                </Link>
              ) : (
                TASK_SOURCE_LABELS[task.source]
              )}
              <span>·</span>
              <span>{formatRelativeTime(task.created_at)}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={PRIORITY_COLORS[task.priority]}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </Badge>
          <Badge className={STATUS_COLORS[task.status]}>
            {TASK_STATUS_LABELS[task.status]}
          </Badge>
        </div>
      </div>

      {task.description && (
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-auro-muted mb-2">
            Descripción
          </h3>
          <p className="text-sm text-auro-text leading-relaxed">{task.description}</p>
        </Card>
      )}

      {task.ai_summary && (
        <Card className="border-auro-accent/20 bg-auro-accent/5">
          <div className="flex items-center gap-2 mb-2">
            <AppIcon name="sparkles" className="h-4 w-4 text-auro-accent" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-auro-accent">
              Resumen de IA
            </h3>
          </div>
          <p className="text-sm text-auro-text leading-relaxed">{task.ai_summary}</p>
        </Card>
      )}

      {task.suggested_action && (
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-auro-muted mb-2">
            Acción sugerida
          </h3>
          <p className="text-sm text-auro-text leading-relaxed">
            {task.suggested_action}
          </p>
        </Card>
      )}

      {task.status !== "done" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" className="flex-1">
            Marcar como completada
          </Button>
          <Button variant="secondary" className="flex-1">
            <AppIcon name="pencil" className="h-3.5 w-3.5 mr-1.5" />
            Editar tarea
          </Button>
        </div>
      )}
    </div>
  );
}
