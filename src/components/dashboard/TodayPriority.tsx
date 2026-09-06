"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatDateOnly, formatDateTime } from "@/lib/intelligence/dates";
import { topDecisionReasons } from "@/lib/intelligence/decision-engine";
import type { DailyDecision, RankedTask } from "@/lib/intelligence/decision-types";

export function TodayPriority() {
  const [decision, setDecision] = useState<DailyDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/decision/today")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "No se pudo cargar");
        if (!cancelled) setDecision(json.decision ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo calcular la prioridad de hoy");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recommended = decision?.recommended.slice(0, 3) ?? [];
  const blockedCount = decision?.blocked.length ?? 0;
  const noActionable =
    decision !== null &&
    decision.recommended.length === 0 &&
    decision.ranked_tasks.every((item) => !item.actionable);

  return (
    <section className="rounded-xl border border-auro-border bg-auro-card overflow-hidden">
      <div className="px-4 py-3 border-b border-auro-border/50">
        <h2 className="text-sm font-semibold text-auro-text">Prioridad de hoy</h2>
        <p className="text-xs text-auro-muted mt-0.5">
          Ranking del Decision Engine. No guarda puntuaciones.
        </p>
      </div>
      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-auro-muted">Calculando prioridad...</p>
        ) : error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : recommended.length > 0 ? (
          recommended.map((item, index) => (
            <PriorityRow key={item.task.id} item={item} index={index + 1} />
          ))
        ) : (
          <p className="text-sm text-auro-muted">
            No hay tareas accionables ahora mismo.
          </p>
        )}
        {noActionable && blockedCount > 0 && (
          <p className="text-xs text-amber-400">
            Hay {blockedCount} {blockedCount === 1 ? "tarea bloqueada" : "tareas bloqueadas"}.
          </p>
        )}
      </div>
    </section>
  );
}

function planningLabel(item: RankedTask): string | null {
  const plannedToday = item.reasons.some(
    (reason) => reason.code === "planned_today"
  );
  if (plannedToday) return "Planificada para hoy";
  if (item.task.planned_for) {
    return `Planificada: ${formatDateOnly(item.task.planned_for)}`;
  }
  return null;
}

function PriorityRow({ item, index }: { item: RankedTask; index: number }) {
  const topReasons = topDecisionReasons(item.reasons, 2);
  const details = [
    planningLabel(item),
    item.task.due_at ? `Deadline: ${formatDateTime(item.task.due_at)}` : null,
    item.task.estimated_minutes ? `${item.task.estimated_minutes} min` : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <Link href={`/tareas/${item.task.id}`}>
      <Card className="py-2.5 px-3 hover:border-auro-accent/40 transition-colors">
        <p className="text-sm font-medium text-auro-text">
          {index}. {item.task.title}
        </p>
        {item.project && (
          <p className="text-xs text-auro-accent mt-0.5">{item.project.name}</p>
        )}
        {topReasons.length > 0 && (
          <p className="text-xs text-auro-muted mt-1">
            {topReasons.map((reason) => reason.label).join(" · ")}
          </p>
        )}
        {details.length > 0 && (
          <p className="text-[11px] text-auro-muted mt-1">{details.join(" · ")}</p>
        )}
      </Card>
    </Link>
  );
}
