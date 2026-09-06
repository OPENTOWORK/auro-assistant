/**
 * Fechas de inteligencia de AURO.
 *
 * DATE (deadline, planned_for): día de calendario, sin hora.
 * Se compara y formatea como YYYY-MM-DD en zona local.
 * Nunca usar `new Date("YYYY-MM-DD")`: eso es medianoche UTC y
 * puede mostrar el día anterior en España.
 *
 * TIMESTAMPTZ (due_at, completed_at, last_activity_at): instante real.
 * Se parsea con `new Date(iso)` y se muestra en hora local.
 */

export function localDateOnly(date = new Date()): string {
  const y = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${month}-${day}`;
}

export function asDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export function formatDateOnly(value: string | null | undefined): string {
  const day = asDateOnly(value);
  if (!day) return "Sin definir";
  const [year, month, date] = day.split("-");
  return `${Number(date)}/${Number(month)}/${year}`;
}

export function addLocalDateOnly(dateOnly: string, days: number): string {
  const [year, month, date] = dateOnly.split("-").map(Number);
  return localDateOnly(new Date(year, month - 1, date + days));
}

export type DeadlineUrgency = "overdue" | "today" | "soon" | "later";

export function deadlineUrgency(
  deadline: string | null | undefined,
  today = localDateOnly()
): DeadlineUrgency | null {
  const day = asDateOnly(deadline);
  if (!day) return null;
  if (day < today) return "overdue";
  if (day === today) return "today";
  if (day <= addLocalDateOnly(today, 7)) return "soon";
  return "later";
}

export function datetimeLocalToIso(value: string): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const local = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5])
  );
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Sin definir";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sin definir";
  return date.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
