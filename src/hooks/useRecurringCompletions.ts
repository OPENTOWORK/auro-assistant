"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import {
  isRecurringTaskCompleted,
  setRecurringTaskCompleted,
} from "@/lib/recurring-completions";
import type { RecurringFrequency, RecurringTask } from "@/types/database";

/**
 * Estado de completión de las tareas recurrentes en su periodo actual.
 *
 * Fuente de verdad: la tabla `recurring_completions` de Supabase. localStorage
 * se sigue usando, pero solo como caché optimista y como almacenamiento del
 * modo demo (cuando no hay Supabase configurado).
 *
 * Este hook centraliza lógica que antes estaba duplicada, idéntica, en
 * `RecurringTasksTable` y en `TodayAgenda`.
 */

interface UseRecurringCompletions {
  /** Mapa taskId -> completada en el periodo actual. */
  completed: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  isCompleted: (taskId: string) => boolean;
  toggle: (task: Pick<RecurringTask, "id" | "frequency">) => Promise<void>;
  /** Número de tareas completadas de entre las recibidas. */
  doneCount: number;
}

export function useRecurringCompletions(
  tasks: RecurringTask[]
): UseRecurringCompletions {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clave estable: solo cambia si cambian las tareas de verdad, no en cada
  // render. Sin esto el efecto se relanzaría en bucle.
  const tasksKey = useMemo(
    () => tasks.map((t) => `${t.id}:${t.frequency}`).join(","),
    [tasks]
  );

  const readFromLocalStorage = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const entry of tasksKey ? tasksKey.split(",") : []) {
      const [id, frequency] = entry.split(":");
      if (!id) continue;
      next[id] = isRecurringTaskCompleted(id, frequency as RecurringFrequency);
    }
    return next;
  }, [tasksKey]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setCompleted(readFromLocalStorage());
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/recurring-tasks/completions", {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "No se pudieron cargar las completiones");
      }

      const next: Record<string, boolean> = {};
      for (const completion of json.completions ?? []) {
        next[completion.recurring_task_id] = true;
      }
      setCompleted(next);
      setError(null);
    } catch (err) {
      // Degradación explícita: se muestra la caché local y se avisa del fallo,
      // en lugar de fingir que nada está completado.
      setCompleted(readFromLocalStorage());
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar las completiones"
      );
    } finally {
      setLoading(false);
    }
  }, [readFromLocalStorage]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    async (task: Pick<RecurringTask, "id" | "frequency">) => {
      const next = !completed[task.id];

      setCompleted((prev) => ({ ...prev, [task.id]: next }));
      setRecurringTaskCompleted(task.id, task.frequency, next);

      if (!isSupabaseConfigured()) return;

      try {
        const res = await fetch("/api/recurring-tasks/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recurring_task_id: task.id,
            frequency: task.frequency,
            completed: next,
          }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "No se pudo guardar");
        }
        setError(null);
      } catch (err) {
        setCompleted((prev) => ({ ...prev, [task.id]: !next }));
        setRecurringTaskCompleted(task.id, task.frequency, !next);
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    },
    [completed]
  );

  const isCompleted = useCallback(
    (taskId: string) => completed[taskId] ?? false,
    [completed]
  );

  const doneCount = tasks.filter((task) => completed[task.id]).length;

  return { completed, loading, error, isCompleted, toggle, doneCount };
}
