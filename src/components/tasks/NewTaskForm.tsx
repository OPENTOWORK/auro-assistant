"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getMonthlyScheduleOptions } from "@/lib/recurring-period";
import {
  TASK_KIND_LABELS,
  TASK_PRIORITY_LABELS,
  WEEKDAY_LABELS,
  type TaskKind,
} from "@/lib/constants";
import { useProjects } from "@/components/projects/ProjectsProvider";
import { datetimeLocalToIso } from "@/lib/intelligence/dates";
import { sortProjectsByPriority } from "@/lib/project-utils";
import type { Alert, RecurringTask, Task, TaskPriority } from "@/types/database";

const inputClass =
  "w-full rounded-lg border border-auro-border bg-auro-bg px-3 py-2 text-sm text-auro-text placeholder:text-auro-muted/50 focus:outline-none focus:border-auro-accent transition-colors";

async function readApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    if (text.includes("Internal Server Error")) {
      throw new Error(
        "Error del servidor. Para el terminal: Ctrl+C, luego npm run dev. Si persiste, borra la carpeta .next y vuelve a arrancar."
      );
    }
    throw new Error(text.slice(0, 120) || `Error ${res.status}`);
  }
}

export type CreatedItem =
  | { kind: "alert"; item: Alert }
  | { kind: "task"; item: Task }
  | { kind: "recurring"; item: RecurringTask };

interface NewTaskFormProps {
  onCreated: (result: CreatedItem) => void;
  onCancel?: () => void;
}

export function NewTaskForm({ onCreated, onCancel }: NewTaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [kind, setKind] = useState<TaskKind>("priority");
  const [scheduleDay, setScheduleDay] = useState("1");
  const [dueAt, setDueAt] = useState("");
  const [plannedFor, setPlannedFor] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
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
      if (kind === "alert") {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            message: description.trim() || null,
            severity: "critical",
            source: "manual",
            project_id: projectId || null,
          }),
        });

        const json = await readApiResponse<{ alert?: Alert; error?: string }>(res);
        if (!res.ok) throw new Error(json.error ?? "Error al crear la alerta");
        if (!json.alert) throw new Error("Respuesta incompleta del servidor");
        onCreated({ kind: "alert", item: json.alert });
      } else if (kind === "weekly" || kind === "monthly") {
        const res = await fetch("/api/recurring-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            frequency: kind,
            schedule_day: Number(scheduleDay),
            project_id: projectId || null,
          }),
        });

        const json = await readApiResponse<{ task?: RecurringTask; error?: string }>(res);
        if (!res.ok) {
          throw new Error(json.error ?? "Error al crear la tarea recurrente");
        }
        if (!json.task) throw new Error("Respuesta incompleta del servidor");
        onCreated({ kind: "recurring", item: json.task });
      } else {
        const minutes = estimatedMinutes.trim()
          ? Number(estimatedMinutes)
          : null;
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            priority,
            source: "manual",
            project_id: projectId || null,
            due_at: datetimeLocalToIso(dueAt),
            planned_for: plannedFor || null,
            estimated_minutes: Number.isFinite(minutes) ? minutes : null,
            blocked_reason: blockedReason.trim() || null,
          }),
        });

        const data = await readApiResponse<{ task?: Task; error?: string }>(res);
        if (!res.ok) {
          throw new Error(data.error ?? "Error al crear la tarea");
        }
        if (!data.task) throw new Error("Respuesta incompleta del servidor");
        onCreated({ kind: "task", item: data.task });
      }

      setTitle("");
      setDescription("");
      setProjectId("");
      setPriority("medium");
      setKind("priority");
      setScheduleDay("1");
      setDueAt("");
      setPlannedFor("");
      setEstimatedMinutes("");
      setBlockedReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setLoading(false);
    }
  }

  const submitLabel =
    kind === "alert"
      ? "Crear alerta"
      : kind === "weekly" || kind === "monthly"
        ? "Crear recurrente"
        : "Crear tarea";

  return (
    <Card className="space-y-4">
      <h3 className="text-sm font-semibold text-auro-text">Nueva tarea</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="task-title" className="text-xs font-medium text-auro-muted">
            Título *
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="Ej: Llamar al cliente de Dralo"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="task-desc" className="text-xs font-medium text-auro-muted">
            Descripción
          </label>
          <textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
            placeholder="Detalles opcionales..."
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="task-project" className="text-xs font-medium text-auro-muted">
            Proyecto
          </label>
          <select
            id="task-project"
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

        <div className="grid grid-cols-2 gap-3">
          {kind === "priority" && (
            <div className="space-y-1.5">
              <label
                htmlFor="task-priority"
                className="text-xs font-medium text-auro-muted"
              >
                Prioridad
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={inputClass}
              >
                {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div
            className={
              kind === "priority" ? "space-y-1.5" : "space-y-1.5 col-span-2"
            }
          >
            <label htmlFor="task-kind" className="text-xs font-medium text-auro-muted">
              Tipo
            </label>
            <select
              id="task-kind"
              value={kind}
              onChange={(e) => {
                const next = e.target.value as TaskKind;
                setKind(next);
                if (next === "weekly") setScheduleDay("1");
                if (next === "monthly") setScheduleDay("1");
              }}
              className={inputClass}
            >
              {Object.entries(TASK_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {kind === "weekly" && (
          <div className="space-y-1.5">
            <label htmlFor="task-weekday" className="text-xs font-medium text-auro-muted">
              Día de la semana
            </label>
            <select
              id="task-weekday"
              value={scheduleDay}
              onChange={(e) => setScheduleDay(e.target.value)}
              className={inputClass}
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <option key={label} value={String(index)}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {kind === "priority" && (
          <div className="space-y-3 rounded-lg border border-auro-border/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-auro-muted">
              Planificación
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="task-due" className="text-xs font-medium text-auro-muted">
                  Deadline
                </label>
                <input
                  id="task-due"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="task-planned" className="text-xs font-medium text-auro-muted">
                  Planificada para
                </label>
                <input
                  id="task-planned"
                  type="date"
                  value={plannedFor}
                  onChange={(e) => setPlannedFor(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="task-minutes" className="text-xs font-medium text-auro-muted">
                  Estimación (minutos)
                </label>
                <input
                  id="task-minutes"
                  type="number"
                  min={1}
                  max={1440}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className={inputClass}
                  placeholder="60"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="task-block" className="text-xs font-medium text-auro-muted">
                  Bloqueo
                </label>
                <input
                  id="task-block"
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  maxLength={2000}
                  className={inputClass}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </div>
        )}

        {kind === "monthly" && (
          <div className="space-y-1.5">
            <label htmlFor="task-monthday" className="text-xs font-medium text-auro-muted">
              Día del mes
            </label>
            <select
              id="task-monthday"
              value={scheduleDay}
              onChange={(e) => setScheduleDay(e.target.value)}
              className={inputClass}
            >
              {getMonthlyScheduleOptions().map((opt) => (
                <option key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="submit" loading={loading} className="flex-1">
            {submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
