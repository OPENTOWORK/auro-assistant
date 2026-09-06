import { isRecurringCalendarEvent } from "@/lib/recurring-to-calendar";
import type { CalendarEvent } from "@/types/database";

export type CalendarViewMode = "month" | "week" | "day";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"] as const;

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/** Lunes como primer día de la semana (convención española). */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function getWeekdayLabels(): readonly string[] {
  return WEEKDAY_LABELS;
}

/** Matriz de semanas para un mes (incluye días de meses adyacentes). */
export function getMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const gridStart = startOfWeek(first);
  const weeks: Date[][] = [];

  let cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
    if (w >= 4 && week.some((day) => day.getMonth() === month && day.getDate() > 20)) {
      const lastDay = week[6];
      if (lastDay.getMonth() !== month && lastDay.getDate() < 8) break;
    }
  }

  return weeks;
}

export function getWeekDays(ref: Date): Date[] {
  const start = startOfWeek(ref);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function eventOccursOnDay(event: CalendarEvent, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  return start < dayEnd && end > dayStart;
}

export function eventsForDay(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  return events
    .filter((event) => eventOccursOnDay(event, day))
    .sort((a, b) => {
      if (a.all_day !== b.all_day) return a.all_day ? -1 : 1;
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    });
}

export function eventsForWeek(
  events: CalendarEvent[],
  ref: Date
): Map<string, CalendarEvent[]> {
  const days = getWeekDays(ref);
  const map = new Map<string, CalendarEvent[]>();
  for (const day of days) {
    map.set(day.toDateString(), eventsForDay(events, day));
  }
  return map;
}

export function formatMonthYear(date: Date): string {
  const label = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeekRange(ref: Date): string {
  const days = getWeekDays(ref);
  const start = days[0];
  const end = days[6];
  const sameMonth = start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.getDate()} – ${end.getDate()} ${formatMonthYear(start)}`;
  }

  const startStr = start.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const endStr = end.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

export function formatDayLong(date: Date): string {
  const label = date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatEventTime(event: CalendarEvent): string {
  if (event.all_day) return "Todo el día";
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  const startTime = start.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startTime} – ${endTime}`;
}

export function eventAccentClass(event: CalendarEvent): string {
  if (isRecurringCalendarEvent(event)) {
    return "bg-purple-500/20 text-purple-200 border-purple-500/30";
  }
  return "bg-blue-500/20 text-blue-200 border-blue-500/30";
}

export function navigateDate(
  date: Date,
  mode: CalendarViewMode,
  direction: -1 | 1
): Date {
  if (mode === "month") return addMonths(date, direction);
  if (mode === "week") return addDays(date, direction * 7);
  return addDays(date, direction);
}
