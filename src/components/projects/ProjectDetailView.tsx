"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { useProjects } from "@/components/projects/ProjectsProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AppIcon, ProjectIcon } from "@/components/ui/AppIcon";
import { DemoBanner } from "@/components/layout/DemoBanner";
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
} from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/config";
import type { Task } from "@/types/database";

interface ProjectDetailViewProps {
  slug: string;
}

export function ProjectDetailView({ slug }: ProjectDetailViewProps) {
  const router = useRouter();
  const { getBySlug, updateProject, deleteProject, loading } = useProjects();
  const showDemo = !isSupabaseConfigured();
  const [editing, setEditing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const project = getBySlug(slug);
  const projectId = project?.id;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setTasksLoading(true);
    fetch(`/api/tasks?projectId=${projectId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        const json = await res.json();
        if (!cancelled) setTasks(Array.isArray(json.tasks) ? json.tasks : []);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return <p className="text-sm text-auro-muted">Cargando proyecto...</p>;
  }

  if (!project) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-auro-muted">Proyecto no encontrado.</p>
        <Link href="/proyectos" className="text-sm text-auro-accent hover:underline">
          ← Volver a proyectos
        </Link>
      </div>
    );
  }

  const pendingTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "waiting_approval"
  );

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${project!.name}"?`)) return;
    await deleteProject(project!.id);
    router.push("/proyectos");
  }

  return (
    <div className="space-y-5">
      {showDemo && <DemoBanner />}

      <Link
        href="/proyectos"
        className="inline-flex items-center gap-1 text-xs text-auro-muted hover:text-auro-text transition-colors"
      >
        ← Volver a proyectos
      </Link>

      {editing ? (
        <ProjectForm
          initial={project}
          onSubmit={async (data) => {
            const updated = await updateProject(project.id, data);
            setEditing(false);
            if (updated && updated.slug !== slug) {
              router.replace(`/proyectos/${updated.slug}`);
            }
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="flex items-start gap-3">
            <ProjectIcon name={project.icon} color={project.color} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-auro-text">
                  {project.name}
                </h2>
                <span className="text-xs font-mono text-auro-muted">
                  P{project.priority}
                </span>
              </div>
              <p className="text-sm text-auro-muted mt-0.5">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className={PROJECT_STATUS_COLORS[project.status]}>
                  {PROJECT_STATUS_LABELS[project.status]}
                </Badge>
                <Badge className="bg-auro-surface text-auro-muted border-auro-border">
                  {PROJECT_TYPE_LABELS[project.type]}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <AppIcon name="pencil" className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <AppIcon name="trash" className="h-3.5 w-3.5 mr-1.5" />
              Eliminar
            </Button>
          </div>
        </>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-auro-muted">
            Tareas del proyecto
          </h3>
          <span className="text-xs text-auro-muted">
            {pendingTasks.length} pendientes
          </span>
        </div>

        {tasksLoading ? (
          <p className="text-sm text-auro-muted text-center py-8">
            Cargando tareas...
          </p>
        ) : tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-auro-muted text-center py-8 rounded-xl border border-dashed border-auro-border">
            Sin tareas asignadas a este proyecto todavía.
          </p>
        )}
      </section>
    </div>
  );
}
