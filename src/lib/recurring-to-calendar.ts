import { MONTHLY_LAST_DAY } from "@/lib/recurring-period";
import type { CalendarEvent, RecurringTask } from "@/types/database";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function resolveMonthlyDay(year: number, month: number, scheduleDay: number): number {
  if (scheduleDay === MONTHLY_LAST_DAY) {
    return daysInMonth(year, month);
  }
  return Math.min(scheduleDay, daysInMonth(year, month));
}

export function getWeeklyOccurrences(
  weekday: number,
  from: Date,
  until: Date
): Date[] {
  const dates: Date[] = [];
  const cursor = startOfDay(from);

  while (cursor.getDay() !== weekday) {
    cursor.setDate(cursor.getDate() + 1);
  }

  while (cursor <= until) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return dates;
}

export function getMonthlyOccurrences(
  scheduleDay: number,
  from: Date,
  until: Date
): Date[] {
  const dates: Date[] = [];
  let year = from.getFullYear();
  let month = from.getMonth();

  while (true) {
    const day = resolveMonthlyDay(year, month, scheduleDay);
    const occurrence = new Date(year, month, day);

    if (occurrence > until) break;
    if (occurrence >= startOfDay(from)) {
      dates.push(occurrence);
    }

    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return dates;
}

export function recurringTaskToCalendarEvents(
  task: RecurringTask,
  from = new Date(),
  daysAhead = 30
): CalendarEvent[] {
  const until = new Date(from);
  until.setDate(until.getDate() + daysAhead);

  const occurrences =
    task.frequency === "weekly"
      ? getWeeklyOccurrences(task.schedule_day, from, until)
      : getMonthlyOccurrences(task.schedule_day, from, until);

  const label =
    task.frequency === "weekly" ? "Tarea semanal" : "Tarea mensual";

  return occurrences.map((date) => {
    const start = startOfDay(date);
    const end = endOfDay(date);
    const key = start.toISOString().slice(0, 10);

    return {
      id: `recurring-${task.id}-${key}`,
      title: task.title,
      description: task.description,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: true,
      calendar_name: label,
      location: null,
      html_link: null,
      google_event_id: null,
      project_id: task.project_id,
      created_at: task.created_at,
    };
  });
}

export function mergeCalendarWithRecurring(
  googleEvents: CalendarEvent[],
  recurringTasks: RecurringTask[],
  options: { daysAhead?: number; daysBack?: number; limit?: number } = {}
): CalendarEvent[] {
  const { daysAhead = 30, daysBack = 0, limit = 15 } = options;
  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  const until = new Date();
  until.setDate(until.getDate() + daysAhead);

  const recurringEvents = recurringTasks.flatMap((task) =>
    recurringTaskToCalendarEvents(task, from, daysAhead + daysBack)
  );

  return [...googleEvents, ...recurringEvents]
    .filter((event) => {
      const start = new Date(event.start_at);
      const end = new Date(event.end_at);
      return end >= from && start <= until;
    })
    .sort(
      (a, b) =>
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    )
    .slice(0, limit);
}

export function isRecurringCalendarEvent(event: CalendarEvent): boolean {
  return event.id.startsWith("recurring-");
}

export function eventOccursToday(
  event: CalendarEvent,
  ref = new Date()
): boolean {
  const dayStart = startOfDay(ref);
  const dayEnd = endOfDay(ref);
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  return start < dayEnd && end > dayStart;
}

export function getTodayCalendarEvents(
  events: CalendarEvent[],
  ref = new Date()
): CalendarEvent[] {
  return events
    .filter((event) => eventOccursToday(event, ref))
    .sort((a, b) => {
      if (a.all_day !== b.all_day) return a.all_day ? -1 : 1;
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    });
}

export function isRecurringTaskDueToday(
  task: RecurringTask,
  ref = new Date()
): boolean {
  if (task.frequency === "weekly") {
    return ref.getDay() === task.schedule_day;
  }
  const today = ref.getDate();
  if (task.schedule_day === MONTHLY_LAST_DAY) {
    return today === daysInMonth(ref.getFullYear(), ref.getMonth());
  }
  return today === task.schedule_day;
}
