import { listProjects } from "@/lib/repositories/projects";
import { listTasks } from "@/lib/repositories/tasks";
import { listCalendarEvents } from "@/lib/repositories/calendar-events";
import {
  dateOnlyInTimeZone,
  getAuroTimezone,
} from "@/lib/intelligence/dates";
import {
  assertValidAvailableMinutes,
  runDecisionEngine,
} from "@/lib/intelligence/decision-engine";
import type { DailyDecision } from "@/lib/intelligence/decision-types";
import type { CalendarEvent, Project, Task } from "@/types/database";

const CALENDAR_WINDOW_MS = 2 * 86_400_000;

export interface DailyDecisionContext {
  now: Date;
  timezone: string;
  today: string;
  projects: Project[];
  tasks: Task[];
  events: CalendarEvent[];
}

export async function loadDailyDecisionContext(
  now: Date
): Promise<DailyDecisionContext> {
  const timezone = getAuroTimezone();
  const today = dateOnlyInTimeZone(now, timezone);

  const [projects, tasks, events] = await Promise.all([
    listProjects(),
    listTasks({
      statuses: ["pending", "in_progress", "waiting_approval"],
    }),
    listCalendarEvents({
      from: new Date(now.getTime() - CALENDAR_WINDOW_MS),
      to: new Date(now.getTime() + CALENDAR_WINDOW_MS),
    }),
  ]);

  return { now, timezone, today, projects, tasks, events };
}

export function buildDailyDecision(
  context: DailyDecisionContext,
  availableMinutes?: number
): DailyDecision {
  assertValidAvailableMinutes(availableMinutes);
  return runDecisionEngine({
    now: context.now,
    today: context.today,
    timezone: context.timezone,
    tasks: context.tasks,
    projects: context.projects,
    events: context.events,
    availableMinutes,
  });
}

export async function getDailyDecision(
  availableMinutes?: number,
  now = new Date()
): Promise<DailyDecision> {
  assertValidAvailableMinutes(availableMinutes);
  const context = await loadDailyDecisionContext(now);
  return buildDailyDecision(context, availableMinutes);
}
