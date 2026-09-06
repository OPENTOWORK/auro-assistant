import { createAdminClient } from "@/lib/supabase/admin";
import { getPeriodKey } from "@/lib/recurring-period";
import type { RecurringFrequency } from "@/types/database";

/**
 * Repositorio de completiones de tareas recurrentes.
 *
 * Una completión no guarda una fecha, guarda un PERIODO: la semana ISO para
 * las semanales y el mes para las mensuales. Así "hecho esta semana" sigue
 * siendo cierto el resto de la semana, y la escritura es idempotente gracias
 * a la restricción única (recurring_task_id, period_key).
 *
 * Antes esto vivía únicamente en localStorage, lo que impedía que el
 * asistente supiera qué se había completado.
 */

export interface RecurringCompletion {
  recurring_task_id: string;
  period_key: string;
  completed_at: string;
}

/** Claves de los periodos vigentes ahora mismo (semana actual y mes actual). */
export function currentPeriodKeys(now = new Date()): string[] {
  return [getPeriodKey("weekly", now), getPeriodKey("monthly", now)];
}

/** Completiones de los periodos vigentes, para pintar los ticks. */
export async function listCurrentCompletions(
  now = new Date()
): Promise<RecurringCompletion[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("recurring_completions")
    .select("recurring_task_id, period_key, completed_at")
    .in("period_key", currentPeriodKeys(now))
    .limit(500);

  if (error) throw error;
  return (data ?? []) as RecurringCompletion[];
}

/**
 * Marca o desmarca una tarea recurrente en su periodo actual.
 * El `period_key` se calcula en el servidor a partir de la frecuencia, para
 * que el cliente no pueda escribir en periodos arbitrarios.
 */
export async function setCompletion(
  recurringTaskId: string,
  frequency: RecurringFrequency,
  completed: boolean,
  now = new Date()
): Promise<{ completed: boolean; periodKey: string }> {
  const admin = createAdminClient();
  const periodKey = getPeriodKey(frequency, now);

  if (completed) {
    const { error } = await admin.from("recurring_completions").upsert(
      {
        recurring_task_id: recurringTaskId,
        period_key: periodKey,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "recurring_task_id,period_key" }
    );
    if (error) throw error;
  } else {
    const { error } = await admin
      .from("recurring_completions")
      .delete()
      .eq("recurring_task_id", recurringTaskId)
      .eq("period_key", periodKey);
    if (error) throw error;
  }

  return { completed, periodKey };
}

/**
 * Historial de completiones de una tarea, de más reciente a más antigua.
 * Lo consumirán el Decision Engine y el Memory Engine para detectar patrones.
 */
export async function listCompletionHistory(
  recurringTaskId: string,
  limit = 24
): Promise<RecurringCompletion[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("recurring_completions")
    .select("recurring_task_id, period_key, completed_at")
    .eq("recurring_task_id", recurringTaskId)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as RecurringCompletion[];
}
