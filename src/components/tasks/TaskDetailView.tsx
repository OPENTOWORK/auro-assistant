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
import {
  datetimeLocalToIso,
  formatDateOnly,
  formatDateTime,
  isoToDatetimeLocal,
} from "@/lib/intelligence/dates";
import { formatRelativeTime } from "@/lib/utils";
import { sortProjectsByPriority } from "@/lib/project-utils";
import type { Task, TaskPriority } from "@/types/database";

const inputClass =
  "w-full rounded-lg border border-auro-border bg-auro-bg px-3 py-2 text-sm text-auro-text focus:outline-none focus:border-auro-accent transition-colors";

interface TaskDetailViewProps {
  taskId: string;
}

export function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const { getById } = useProjects();
  const showDemo = !isSupabaseConfigured();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const currentTask = task;
  const project = currentTask.project_id ? getById(currentTask.project_id) : null;

  async function markDone() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${currentTask.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo completar");
      setTask(json.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al completar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {showDemo && <DemoBanner />}

      <Link
        href="/tareas"
        className="inline-flex items-center gap-1 text-xs text-auro-muted hover:text-auro-text transition-colors"
      >
        ← Volver a tareas
      </Link>

      {editing ? (
        <TaskEditForm
          task={task}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setTask(updated);
            setEditing(false);
          }}
        />
      ) : (
        <>
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

          <Card className="space-y-3">
            <Field label="Deadline" value={formatDateTime(task.due_at)} empty={!task.due_at} />
            <Field
              label="Planificada para"
              value={formatDateOnly(task.planned_for)}
              empty={!task.planned_for}
            />
            <Field
              label="Estimación"
              value={
                task.estimated_minutes
                  ? `${task.estimated_minutes} min`
                  : "Sin definir"
              }
              empty={!task.estimated_minutes}
            />
            <Field
              label="Bloqueo"
              value={task.blocked_reason?.trim() || "Sin definir"}
              empty={!task.blocked_reason?.trim()}
            />
            {task.status === "done" && (
              <Field
                label="Completada"
                value={formatDateTime(task.completed_at)}
                empty={!task.completed_at}
              />
            )}
          </Card>

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

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {task.status !== "done" && (
              <Button
                variant="primary"
                className="flex-1"
                loading={saving}
                onClick={() => void markDone()}
              >
                Marcar como completada
              </Button>
            )}
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setEditing(true)}
            >
              <AppIcon name="pencil" className="h-3.5 w-3.5 mr-1.5" />
              Editar tarea
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  empty,
}: {
  label: string;
  value: string;
  empty: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-auro-muted">
        {label}
      </p>
      <p className={empty ? "text-sm text-auro-muted" : "text-sm text-auro-text"}>
        {value}
      </p>
    </div>
  );
}

function TaskEditForm({
  task,
  onCancel,
  onSaved,
}: {
  task: Task;
  onCancel: () => void;
  onSaved: (task: Task) => void;
}) {
  const { projects } = useProjects();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [projectId, setProjectId] = useState(task.project_id ?? "");
  const [dueAt, setDueAt] = useState(isoToDatetimeLocal(task.due_at));
  const [plannedFor, setPlannedFor] = useState(task.planned_for?.slice(0, 10) ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    task.estimated_minutes ? String(task.estimated_minutes) : ""
  );
  const [blockedReason, setBlockedReason] = useState(task.blocked_reason ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    const minutes = estimatedMinutes.trim() ? Number(estimatedMinutes) : null;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          project_id: projectId || null,
          due_at: datetimeLocalToIso(dueAt),
          planned_for: plannedFor || null,
          estimated_minutes: Number.isFinite(minutes) ? minutes : null,
          blocked_reason: blockedReason.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      onSaved(json.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-3">
        <h3 className="text-sm font-semibold text-auro-text">Editar tarea</h3>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-auro-muted">Título</label>
          <input
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
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-auro-muted">Prioridad</label>
            <select
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
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-auro-muted">Proyecto</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={inputClass}
            >
              <option value="">Sin proyecto</option>
              {sortProjectsByPriority(projects).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-auro-muted">Deadline</label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-auro-muted">
              Planificada para
            </label>
            <input
              type="date"
              value={plannedFor}
              onChange={(e) => setPlannedFor(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-auro-muted">
              Estimación (minutos)
            </label>
            <input
              type="number"
              min={1}
              max={1440}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-auro-muted">Bloqueo</label>
            <input
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              maxLength={2000}
              className={inputClass}
            />
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={loading} className="flex-1">
            Guardar
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
