"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { isSupabaseConfigured } from "@/lib/config";
import type { Alert } from "@/types/database";

const inputClass =
  "w-full rounded-lg border border-auro-border bg-auro-bg px-3 py-2 text-sm text-auro-text placeholder:text-auro-muted/50 focus:outline-none focus:border-auro-accent transition-colors";

const SEVERITY_LABELS = {
  info: "Información",
  warning: "Aviso",
  critical: "Crítica",
} as const;

interface NewAlertFormProps {
  onCreated: (alert: Alert) => void;
  onCancel?: () => void;
}

export function NewAlertForm({ onCreated, onCancel }: NewAlertFormProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Alert["severity"]>("warning");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase no configurado.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim() || null,
          severity,
          source: "manual",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al crear la alerta");

      onCreated(json.alert);
      setTitle("");
      setMessage("");
      setSeverity("warning");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la alerta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
      <h3 className="text-sm font-semibold text-auro-text">Nueva alerta</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="alert-title" className="text-xs font-medium text-auro-muted">
            Título *
          </label>
          <input
            id="alert-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="Ej: Revisar contrato de Dralo"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="alert-message" className="text-xs font-medium text-auro-muted">
            Mensaje
          </label>
          <textarea
            id="alert-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
            placeholder="Detalle opcional..."
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="alert-severity" className="text-xs font-medium text-auro-muted">
            Urgencia
          </label>
          <select
            id="alert-severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Alert["severity"])}
            className={inputClass}
          >
            {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="submit" loading={loading} className="flex-1">
            Crear alerta
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
