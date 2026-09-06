import { createAdminClient } from "@/lib/supabase/admin";
import { getPeriodKey } from "@/lib/recurring-period";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import type { RecurringFrequency } from "@/types/database";

export interface RecurringCompletion {
  recurring_task_id: string;
  period_key: string;
  completed_at: string;
}

export function currentPeriodKeys(now = new Date()): string[] {
  return [getPeriodKey("weekly", now), getPeriodKey("monthly", now)];
}

export async function listCurrentCompletions(
  now = new Date()
): Promise<RecurringCompletion[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("recurring_completions")
    .select("recurring_task_id, period_key, completed_at")
    .eq("owner_key", AURO_OWNER_KEY)
    .in("period_key", currentPeriodKeys(now))
    .limit(500);

  if (error) throw error;
  return (data ?? []) as RecurringCompletion[];
}

export async function setCompletion(
  recurringTaskId: string,
  frequency: RecurringFrequency,
  completed: boolean,
  now = new Date()
): Promise<{ completed: boolean; periodKey: string }> {
  const admin = createAdminClient();
  const periodKey = getPeriodKey(frequency, now);

  const { data: ownedTask, error: taskError } = await admin
    .from("recurring_tasks")
    .select("id")
    .eq("id", recurringTaskId)
    .eq("owner_key", AURO_OWNER_KEY)
    .maybeSingle();

  if (taskError) throw taskError;
  if (!ownedTask) {
    throw new Error("Tarea recurrente no encontrada");
  }

  if (completed) {
    const { error } = await admin.from("recurring_completions").upsert(
      {
        owner_key: AURO_OWNER_KEY,
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
      .eq("owner_key", AURO_OWNER_KEY)
      .eq("period_key", periodKey);
    if (error) throw error;
  }

  return { completed, periodKey };
}

export async function listCompletionHistory(
  recurringTaskId: string,
  limit = 24
): Promise<RecurringCompletion[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("recurring_completions")
    .select("recurring_task_id, period_key, completed_at")
    .eq("recurring_task_id", recurringTaskId)
    .eq("owner_key", AURO_OWNER_KEY)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as RecurringCompletion[];
}
