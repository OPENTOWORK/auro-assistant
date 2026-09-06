import type { RecurringFrequency } from "@/types/database";
import { getPeriodKey } from "@/lib/recurring-period";

/**
 * Caché local de completiones de tareas recurrentes.
 *
 * La fuente de verdad es la tabla `recurring_completions` de Supabase; esto es
 * solo una caché optimista que permite pintar los ticks al instante y sostener
 * el modo demo. No leas de aquí directamente: usa `useRecurringCompletions`.
 */

const STORAGE_KEY = "auro-recurring-completions";

type CompletionMap = Record<string, true>;

function readAll(): CompletionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CompletionMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: CompletionMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function completionKey(
  taskId: string,
  frequency: RecurringFrequency,
  date = new Date()
): string {
  return `${taskId}:${getPeriodKey(frequency, date)}`;
}

export function isRecurringTaskCompleted(
  taskId: string,
  frequency: RecurringFrequency,
  date = new Date()
): boolean {
  const map = readAll();
  return map[completionKey(taskId, frequency, date)] === true;
}

export function setRecurringTaskCompleted(
  taskId: string,
  frequency: RecurringFrequency,
  completed: boolean,
  date = new Date()
): void {
  const map = readAll();
  const key = completionKey(taskId, frequency, date);
  if (completed) {
    map[key] = true;
  } else {
    delete map[key];
  }
  writeAll(map);
}

