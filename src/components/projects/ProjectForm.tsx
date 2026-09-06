"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AppIcon } from "@/components/ui/AppIcon";
import { cn } from "@/lib/utils";
import {
  PROJECT_ICON_OPTIONS,
  resolveIconName,
} from "@/lib/icons";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
} from "@/lib/constants";
import type { Project } from "@/types/database";
import type { ProjectFormData } from "@/components/projects/ProjectsProvider";

const inputClass =
  "w-full rounded-lg border border-auro-border bg-auro-bg px-3 py-2 text-sm text-auro-text focus:outline-none focus:border-auro-accent transition-colors";

interface ProjectFormProps {
  initial?: Project;
  nextPriority?: number;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel?: () => void;
}

export function ProjectForm({
  initial,
  nextPriority = 10,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState(initial?.type ?? "brand");
  const [status, setStatus] = useState(initial?.status ?? "in_progress");
  const [priority, setPriority] = useState(initial?.priority ?? nextPriority);
  const [icon, setIcon] = useState(
    resolveIconName(initial?.icon ?? "folder")
  );
  const [color, setColor] = useState(initial?.color ?? "#3b82f6");
  const [objective, setObjective] = useState(initial?.objective ?? "");
  const [deadline, setDeadline] = useState(initial?.deadline?.slice(0, 10) ?? "");
  const [nextAction, setNextAction] = useState(initial?.next_action ?? "");
  const [blockedReason, setBlockedReason] = useState(initial?.blocked_reason ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        type,
        status,
        priority,
        icon,
        color,
        objective: objective.trim() || null,
        deadline: deadline || null,
        next_action: nextAction.trim() || null,
        blocked_reason: blockedReason.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
      <h3 className="text-sm font-semibold text-auro-text">
        {initial ? "Editar proyecto" : "Nuevo proyecto"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-auro-muted">Nombre *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Ej: Hype"
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
            placeholder="Breve descripción del proyecto"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-auro-muted">Objetivo</label>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={2}
            maxLength={2000}
            className={`${inputClass} resize-none`}
            placeholder="Resultado concreto que quieres conseguir"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-auro-muted">Fecha objetivo</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-auro-muted">Siguiente acción</label>
            <input
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              maxLength={1000}
              className={inputClass}
              placeholder="Siguiente paso concreto"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-auro-muted">Bloqueo actual</label>
          <textarea
            value={blockedReason}
            onChange={(e) => setBlockedReason(e.target.value)}
            rows={2}
            maxLength={2000}
            className={`${inputClass} resize-none`}
            placeholder="Si algo impide avanzar, descríbelo aquí"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-auro-muted">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Project["type"])}
              className={inputClass}
            >
              {Object.entries(PROJECT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-auro-muted">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Project["status"])}
              className={inputClass}
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-auro-muted">Prioridad</label>
            <input
              type="number"
              min={1}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-xs font-medium text-auro-muted">Icono</label>
            <div className="grid grid-cols-7 gap-1.5">
              {PROJECT_ICON_OPTIONS.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  title={option.label}
                  onClick={() => setIcon(option.name)}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-lg border transition-colors",
                    icon === option.name
                      ? "border-auro-accent bg-auro-accent/15 text-auro-accent"
                      : "border-auro-border bg-auro-bg text-auro-muted hover:border-auro-accent/40 hover:text-auro-text"
                  )}
                >
                  <AppIcon name={option.name} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-auro-muted">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-full rounded-lg border border-auro-border bg-auro-bg cursor-pointer"
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
            {initial ? "Guardar cambios" : "Crear proyecto"}
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
