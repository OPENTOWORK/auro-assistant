import { listProjects } from "@/lib/repositories/projects";
import { listTasks } from "@/lib/repositories/tasks";
import { listCalendarEvents } from "@/lib/repositories/calendar-events";
import {
  dateOnlyInTimeZone,
  getAuroTimezone,
} from "@/lib/intelligence/dates";
import { runDecisionEngine } from "@/lib/intelligence/decision-engine";
import type { DailyDecision } from "@/lib/intelligence/decision-types";

const CALENDAR_WINDOW_MS = 2 * 86_400_000;

export async function getDailyDecision(
  availableMinutes?: number,
  now = new Date()
): Promise<DailyDecision> {
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

  return runDecisionEngine({
    now,
    today,
    timezone,
    tasks,
    projects,
    events,
    availableMinutes,
  });
}
