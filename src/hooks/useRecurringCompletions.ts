"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RecurringTask } from "@/types/database";

interface UseRecurringCompletions {
  completed: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  isCompleted: (taskId: string) => boolean;
  toggle: (task: Pick<RecurringTask, "id" | "frequency">) => Promise<void>;
  doneCount: number;
}

export function useRecurringCompletions(
  tasks: RecurringTask[]
): UseRecurringCompletions {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tasksKey = useMemo(
    () => tasks.map((t) => `${t.id}:${t.frequency}`).join(","),
    [tasks]
  );

  const load = useCallback(async () => {
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
      setCompleted({});
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar las completiones"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, tasksKey]);

  const toggle = useCallback(
    async (task: Pick<RecurringTask, "id" | "frequency">) => {
      const next = !completed[task.id];
      setCompleted((prev) => ({ ...prev, [task.id]: next }));

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
