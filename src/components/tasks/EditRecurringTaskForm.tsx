"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WEEKDAY_LABELS } from "@/lib/constants";
import { getMonthlyScheduleOptions } from "@/lib/recurring-period";
import { useProjects } from "@/components/projects/ProjectsProvider";
import { sortProjectsByPriority } from "@/lib/project-utils";
import type { RecurringTask } from "@/types/database";

const inputClass =
  "w-full rounded-lg border border-auro-border bg-auro-bg px-3 py-2 text-sm text-auro-text placeholder:text-auro-muted/50 focus:outline-none focus:border-auro-accent transition-colors";

async function readApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 120) || `Error ${res.status}`);
  }
}

interface EditRecurringTaskFormProps {
  task: RecurringTask;
  onUpdated: (task: RecurringTask) => void;
  onCancel: () => void;
}

export function EditRecurringTaskForm({
  task,
  onUpdated,
  onCancel,
}: EditRecurringTaskFormProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [projectId, setProjectId] = useState(task.project_id ?? "");
  const [scheduleDay, setScheduleDay] = useState(String(task.schedule_day));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { projects: allProjects } = useProjects();
  const projects = sortProjectsByPriority(allProjects);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/recurring-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          frequency: task.frequency,
          schedule_day: Number(scheduleDay),
          project_id: projectId || null,
        }),
      });

      const json = await readApiResponse<{ task?: RecurringTask; error?: string }>(res);
      if (!res.ok) {
        throw new Error(json.error ?? "Error al guardar");
      }
      if (!json.task) throw new Error("Respuesta incompleta del servidor");
      onUpdated(json.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-3 mb-3 border-auro-accent/30">
      <h4 className="text-sm font-semibold text-auro-text">Editar tarea recurrente</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-auro-muted">Título *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-auro-muted">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-auro-muted">Proyecto</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={inputClass}
          >
            <option value="">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-auro-muted">
            {task.frequency === "weekly" ? "Día de la semana" : "Día del mes"}
          </label>
          <select
            value={scheduleDay}
            onChange={(e) => setScheduleDay(e.target.value)}
            className={inputClass}
          >
            {task.frequency === "weekly"
              ? WEEKDAY_LABELS.map((label, index) => (
                  <option key={label} value={String(index)}>
                    {label}
                  </option>
                ))
              : getMonthlyScheduleOptions().map((opt) => (
                  <option key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
          </select>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" loading={loading} size="sm">
            Guardar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
