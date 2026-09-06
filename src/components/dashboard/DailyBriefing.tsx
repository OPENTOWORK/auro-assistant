"use client";

import { useEffect, useState } from "react";
import { DecisionPriorityRow } from "@/components/dashboard/DecisionPriorityRow";
import { formatDateTime } from "@/lib/intelligence/dates";
import type { DailyBriefing } from "@/lib/intelligence/daily-briefing-types";

export function DailyBriefingCard() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/briefing/daily")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "No se pudo cargar");
        if (!cancelled) setBriefing(json.briefing ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo calcular el briefing de hoy");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = briefing?.counts;
  const onlyBlocked =
    briefing !== null &&
    briefing.priorities.length === 0 &&
    (counts?.blocked_tasks ?? 0) > 0;

  return (
    <section className="rounded-xl border border-auro-border bg-auro-card overflow-hidden">
      <div className="px-4 py-3 border-b border-auro-border/50">
        <h2 className="text-sm font-semibold text-auro-text">Briefing de hoy</h2>
        <p className="text-xs text-auro-muted mt-0.5">
          Resumen estructurado. El ranking lo calcula el Decision Engine.
        </p>
      </div>
      <div className="p-4 space-y-4">
        {loading ? (
          <p className="text-sm text-auro-muted">Preparando briefing...</p>
        ) : error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : briefing && counts ? (
          <>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-auro-muted">
                Prioridad
              </p>
              {briefing.priorities.length > 0 ? (
                briefing.priorities.map((item, index) => (
                  <DecisionPriorityRow
                    key={item.task.id}
                    item={item}
                    index={index + 1}
                  />
                ))
              ) : (
                <p className="text-sm text-auro-muted">
                  No hay tareas accionables ahora mismo.
                </p>
              )}
              {onlyBlocked && (
                <p className="text-xs text-amber-400">
                  Hay {counts.blocked_tasks}{" "}
                  {counts.blocked_tasks === 1
                    ? "tarea bloqueada"
                    : "tareas bloqueadas"}
                  .
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-auro-muted">
                Agenda
              </p>
              {briefing.agenda.next_event ? (
                <p className="text-sm text-auro-text">
                  Siguiente: {briefing.agenda.next_event.title}
                  <span className="text-xs text-auro-muted ml-2">
                    {formatDateTime(briefing.agenda.next_event.start_at)}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-auro-muted">Sin siguiente evento.</p>
              )}
              <p className="text-xs text-auro-muted">
                {counts.today_events}{" "}
                {counts.today_events === 1 ? "evento hoy" : "eventos hoy"}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-auro-muted">
                Atención
              </p>
              <div className="flex flex-wrap gap-1.5">
                <CountChip
                  label="Vencidas"
                  value={counts.overdue_tasks}
                  tone={counts.overdue_tasks > 0 ? "warn" : "muted"}
                />
                <CountChip
                  label="Bloqueadas"
                  value={counts.blocked_tasks}
                  tone={counts.blocked_tasks > 0 ? "warn" : "muted"}
                />
                <CountChip
                  label="Esperando"
                  value={counts.waiting_tasks}
                  tone={counts.waiting_tasks > 0 ? "warn" : "muted"}
                />
                <CountChip
                  label="Proyectos estancados"
                  value={counts.stalled_projects}
                  tone={counts.stalled_projects > 0 ? "warn" : "muted"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-auro-muted">
                Inbox
              </p>
              <div className="flex flex-wrap gap-1.5">
                <CountChip
                  label="Correos importantes"
                  value={counts.important_emails}
                  tone="muted"
                />
                <CountChip
                  label="Alertas"
                  value={counts.unread_alerts}
                  tone={counts.critical_alerts > 0 ? "critical" : "muted"}
                />
                {counts.critical_alerts > 0 && (
                  <CountChip
                    label="Críticas"
                    value={counts.critical_alerts}
                    tone="critical"
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-auro-muted">Sin briefing.</p>
        )}
      </div>
    </section>
  );
}

function CountChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "muted" | "warn" | "critical";
}) {
  const color =
    tone === "critical"
      ? "bg-red-500/15 text-red-400 border-red-500/25"
      : tone === "warn"
        ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
        : "bg-auro-surface text-auro-muted border-auro-border";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${color}`}
    >
      {label} {value}
    </span>
  );
}
