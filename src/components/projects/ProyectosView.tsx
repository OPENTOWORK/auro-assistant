"use client";

import { useEffect, useState } from "react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { useProjects } from "@/components/projects/ProjectsProvider";
import { Button } from "@/components/ui/Button";
import { AppIcon } from "@/components/ui/AppIcon";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { isSupabaseConfigured } from "@/lib/config";
import { countTasksByProject } from "@/lib/task-utils";
import type { Project, Task } from "@/types/database";

export function ProyectosView() {
  const {
    projects,
    loading,
    error,
    refresh,
    addProject,
    updateProject,
    deleteProject,
  } = useProjects();
  const showDemo = !isSupabaseConfigured();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tasks")
      .then(async (res) => {
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && Array.isArray(json.tasks)) {
          setTasks(json.tasks);
        }
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projects.length]);

  const activeCount = projects.filter((p) => p.status !== "paused").length;
  const nextPriority =
    projects.length > 0
      ? Math.max(...projects.map((p) => p.priority)) + 1
      : 1;

  async function handleDelete(project: Project) {
    if (
      !confirm(
        `¿Eliminar "${project.name}"? Las tareas vinculadas quedarán sin proyecto.`
      )
    ) {
      return;
    }
    await deleteProject(project.id);
  }

  return (
    <div className="space-y-5">
      {showDemo && <DemoBanner />}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-auro-text">Mis proyectos</h2>
          <p className="text-sm text-auro-muted mt-0.5">
            {loading
              ? "Cargando..."
              : `${projects.length} proyectos · ${activeCount} activos`}
          </p>
        </div>
        {!showForm && !editing && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            + Nuevo
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
          <p className="text-xs text-red-400">{error}</p>
          <Button size="sm" variant="ghost" onClick={() => refresh()}>
            Reintentar
          </Button>
        </div>
      )}

      {showForm && (
        <ProjectForm
          nextPriority={nextPriority}
          onSubmit={async (data) => {
            await addProject(data);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editing && (
        <ProjectForm
          initial={editing}
          onSubmit={async (data) => {
            await updateProject(editing.id, data);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {!loading && projects.length === 0 ? (
        <p className="text-sm text-auro-muted text-center py-8 rounded-xl border border-dashed border-auro-border">
          No hay proyectos todavía
        </p>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div key={project.id} className="flex items-stretch gap-2">
              <div className="flex-1 min-w-0">
                <ProjectCard
                  project={project}
                  taskCount={countTasksByProject(project.id, tasks)}
                />
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(project);
                  }}
                  aria-label={`Editar ${project.name}`}
                >
                  <AppIcon name="pencil" className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(project)}
                  aria-label={`Eliminar ${project.name}`}
                >
                  <AppIcon name="trash" className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
