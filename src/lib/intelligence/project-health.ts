import type { Project, Task } from "@/types/database";
import { asDateOnly, localDateOnly } from "@/lib/intelligence/dates";

/**
 * Statuses en los que un proyecto se considera "en marcha"
 * a efectos de estancamiento. `established` y `paused` no entran:
 * uno está asentado y el otro está deliberadamente parado.
 */
export const ACTIVE_PROJECT_STATUSES: readonly Project["status"][] = [
  "in_progress",
  "active",
];

export const OPEN_TASK_STATUSES: readonly Task["status"][] = [
  "pending",
  "in_progress",
  "waiting_approval",
];

const MS_PER_DAY = 86_400_000;

export function daysSinceActivity(project: Project, now = new Date()): number {
  const last = new Date(project.last_activity_at);
  if (Number.isNaN(last.getTime())) return 0;
  const diff = now.getTime() - last.getTime();
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}

export function isProjectStalled(
  project: Project,
  now = new Date(),
  thresholdDays = 7
): boolean {
  if (!ACTIVE_PROJECT_STATUSES.includes(project.status)) return false;
  return daysSinceActivity(project, now) >= thresholdDays;
}

export function isProjectOverdue(
  project: Project,
  today = localDateOnly()
): boolean {
  if (project.status === "paused") return false;
  const deadline = asDateOnly(project.deadline);
  if (!deadline) return false;
  return deadline < today;
}

export function isTaskOverdue(task: Task, now = new Date()): boolean {
  if (task.status === "done" || task.status === "rejected") return false;
  if (!task.due_at) return false;
  const due = new Date(task.due_at);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}

export function isTaskPlannedToday(
  task: Task,
  date = localDateOnly()
): boolean {
  if (!OPEN_TASK_STATUSES.includes(task.status)) return false;
  return asDateOnly(task.planned_for) === date;
}
