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

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_CALENDAR_YEAR = 1900;
const MAX_CALENDAR_YEAR = 2200;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return DAYS_IN_MONTH[month - 1] ?? 0;
}

export const DEFAULT_AURO_TIMEZONE = "Europe/Madrid";

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

/**
 * Zona IANA del motor server-side.
 * Si AURO_TIMEZONE falta o es inválida: Europe/Madrid.
 */
export function getAuroTimezone(): string {
  const raw = process.env.AURO_TIMEZONE?.trim();
  if (raw && isValidTimeZone(raw)) return raw;
  return DEFAULT_AURO_TIMEZONE;
}

/** YYYY-MM-DD en una zona IANA. No usa el timezone del proceso. */
export function dateOnlyInTimeZone(now: Date, timezone: string): string {
  const tz = isValidTimeZone(timezone) ? timezone : DEFAULT_AURO_TIMEZONE;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return localDateOnly(now);
  return `${year}-${month}-${day}`;
}

/** Día de calendario real YYYY-MM-DD. No usa `new Date("YYYY-MM-DD")`. */
export function isValidDateOnly(value: string): boolean {
  const match = DATE_ONLY_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < MIN_CALENDAR_YEAR || year > MAX_CALENDAR_YEAR) return false;
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

export function localDateOnly(date = new Date()): string {
  const y = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${month}-${day}`;
}

export function asDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  return isValidDateOnly(day) ? day : null;
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
