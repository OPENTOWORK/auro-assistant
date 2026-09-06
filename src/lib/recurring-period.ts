import type { RecurringFrequency, RecurringTask } from "@/types/database";
import { WEEKDAY_LABELS } from "@/lib/constants";

/** Día 31 = último día del mes (febrero, 30 días, etc.) */
export const MONTHLY_LAST_DAY = 31;

export function getPeriodKey(
  frequency: RecurringFrequency,
  date = new Date()
): string {
  if (frequency === "weekly") {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

/**
 * Valida el día de una tarea recurrente según su frecuencia.
 * Devuelve un mensaje de error en español, o null si es válido.
 *
 * Vive aquí y no en las rutas API porque la misma regla la aplican el POST y
 * el PATCH de `recurring-tasks`, y además la refleja una restricción CHECK en
 * la base de datos.
 */
export function validateRecurringSchedule(
  frequency: RecurringFrequency,
  scheduleDay: number
): string | null {
  if (frequency === "weekly" && (scheduleDay < 0 || scheduleDay > 6)) {
    return "Día de la semana inválido (0-6)";
  }
  if (frequency === "monthly" && (scheduleDay < 1 || scheduleDay > MONTHLY_LAST_DAY)) {
    return `Día del mes inválido (1-${MONTHLY_LAST_DAY})`;
  }
  return null;
}

export function formatRecurringSchedule(task: RecurringTask): string {
  if (task.frequency === "weekly") {
    return `Cada ${WEEKDAY_LABELS[task.schedule_day]}`;
  }
  if (task.schedule_day === MONTHLY_LAST_DAY) {
    return "Último día de cada mes";
  }
  return `Día ${task.schedule_day} de cada mes`;
}

export function getMonthlyScheduleOptions() {
  const options = Array.from({ length: 30 }, (_, i) => ({
    value: i + 1,
    label: `Día ${i + 1}`,
  }));
  options.push({ value: MONTHLY_LAST_DAY, label: "Último día del mes" });
  return options;
}
