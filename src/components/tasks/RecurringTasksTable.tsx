"use client";

import { useState } from "react";
import { EditRecurringTaskForm } from "@/components/tasks/EditRecurringTaskForm";
import { ProjectLabel } from "@/components/ui/AppIcon";
import { Badge } from "@/components/ui/Badge";
import { useProjects } from "@/components/projects/ProjectsProvider";
import { RECURRING_FREQUENCY_LABELS } from "@/lib/constants";
import { useRecurringCompletions } from "@/hooks/useRecurringCompletions";
import { formatRecurringSchedule } from "@/lib/recurring-period";
import { cn } from "@/lib/utils";
import type { RecurringTask } from "@/types/database";

interface RecurringTasksTableProps {
  tasks: RecurringTask[];
  loading?: boolean;
  onUpdated?: (task: RecurringTask) => void;
  onDeleted?: (id: string) => void;
}

export function RecurringTasksTable({
  tasks,
  loading = false,
  onUpdated,
  onDeleted,
}: RecurringTasksTableProps) {
  const { getById } = useProjects();
  const { isCompleted, toggle, doneCount, error: completionsError } =
    useRecurringCompletions(tasks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(task: RecurringTask) {
    if (
      !window.confirm(`¿Eliminar la tarea "${task.title}"? Esta acción no se puede deshacer.`)
    ) {
      return;
    }

    setDeletingId(task.id);
    try {
      const res = await fetch(`/api/recurring-tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.slice(0, 120) || "Error al eliminar");
      }
      if (editingId === task.id) setEditingId(null);
      onDeleted?.(task.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-auro-muted py-2">Cargando tareas recurrentes...</p>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-auro-muted py-2">
        Sin tareas recurrentes configuradas.
      </p>
    );
  }

  const editingTask = editingId
    ? tasks.find((t) => t.id === editingId)
    : undefined;

  return (
    <div className="space-y-2">
      <p className="text-xs text-auro-muted">
        {doneCount}/{tasks.length} completadas este periodo
      </p>

      {completionsError && (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          {completionsError}
        </p>
      )}

      {editingTask && (
        <EditRecurringTaskForm
          task={editingTask}
          onUpdated={(updated) => {
            onUpdated?.(updated);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      )}

      <div className="overflow-x-auto -mx-1">
        <table className="w-full min-w-[580px] text-sm border-collapse">
          <thead>
            <tr className="border-b border-auro-border/60 text-left">
              <th className="w-10 py-2 pl-1 pr-2 text-[10px] font-semibold uppercase tracking-wider text-auro-muted">
                Hecho
              </th>
              <th className="py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-auro-muted">
                Tarea
              </th>
              <th className="py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-auro-muted w-24">
                Tipo
              </th>
              <th className="py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-auro-muted w-44">
                Cuándo
              </th>
              <th className="py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-auro-muted w-32">
                Proyecto
              </th>
              <th className="w-20 py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-auro-muted text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const done = isCompleted(task.id);
              const project = task.project_id ? getById(task.project_id) : null;
              const isDeleting = deletingId === task.id;

              return (
                <tr
                  key={task.id}
                  className={cn(
                    "border-b border-auro-border/30 transition-colors",
                    done && "bg-emerald-500/5",
                    editingId === task.id && "opacity-50"
                  )}
                >
                  <td className="py-3 pl-1 pr-2 align-middle">
                    <button
                      type="button"
                      onClick={() => void toggle(task)}
                      aria-label={
                        done
                          ? `Marcar "${task.title}" como pendiente`
                          : `Marcar "${task.title}" como hecha`
                      }
                      aria-pressed={done}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md border-2 transition-all",
                        done
                          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                          : "border-auro-border bg-auro-bg/50 text-transparent hover:border-emerald-500/60"
                      )}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-4 w-4"
                        aria-hidden
                      >
                        <path
                          d="M3.5 8.5L6.5 11.5L12.5 4.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </td>
                  <td className="py-3 px-2 align-middle">
                    <p
                      className={cn(
                        "font-medium text-auro-text leading-snug",
                        done && "line-through text-auro-muted"
                      )}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-auro-muted line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-2 align-middle">
                    <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/25 dark:text-purple-300">
                      {RECURRING_FREQUENCY_LABELS[task.frequency]}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 align-middle text-xs text-auro-muted">
                    {formatRecurringSchedule(task)}
                  </td>
                  <td className="py-3 px-2 align-middle">
                    {project ? (
                      <ProjectLabel
                        name={project.name}
                        icon={project.icon}
                        color={project.color}
                        className="text-auro-accent text-xs"
                      />
                    ) : (
                      <span className="text-xs text-auro-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 px-2 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(task.id)}
                        disabled={isDeleting}
                        className="p-1.5 rounded-md text-auro-muted hover:text-auro-text hover:bg-auro-border/40 transition-colors"
                        aria-label={`Editar ${task.title}`}
                        title="Editar"
                      >
                        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
                          <path
                            d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(task)}
                        disabled={isDeleting}
                        className="p-1.5 rounded-md text-auro-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        aria-label={`Eliminar ${task.title}`}
                        title="Eliminar"
                      >
                        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
                          <path
                            d="M3 4h10M6 4V3h4v1M5 4v9h6V4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
