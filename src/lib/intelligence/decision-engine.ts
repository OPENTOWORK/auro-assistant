import type { CalendarEvent, Project, Task } from "@/types/database";
import { asDateOnly, dateOnlyInTimeZone } from "@/lib/intelligence/dates";
import {
  daysSinceActivity,
  isProjectOverdue,
  isProjectStalled,
} from "@/lib/intelligence/project-health";
import type {
  CalendarDecisionContext,
  DailyDecision,
  DecisionEngineInput,
  DecisionProject,
  DecisionReason,
  DecisionTask,
  FocusPlan,
  RankedTask,
} from "@/lib/intelligence/decision-types";

/**
 * Única fuente de verdad de puntuación.
 * Los scores no se persisten. Mismo input + mismo now = mismo output.
 */
export const DECISION_WEIGHTS = {
  taskPriority: {
    urgent: 40,
    high: 25,
    medium: 10,
    low: 0,
  },
  inProgress: 10,
  plannedToday: 30,
  dueOverdue: 50,
  dueToday: 40,
  dueWithin24h: 35,
  dueWithin3d: 20,
  dueWithin7d: 10,
  projectPriorityMax: 10,
  projectOverdue: 15,
  projectStalled: 8,
} as const;

export const MAX_RECOMMENDED = 5;
export const MIN_AVAILABLE_MINUTES = 15;
export const MAX_AVAILABLE_MINUTES = 720;

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

const TASK_PRIORITY_RANK: Record<Task["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Desempate determinista (mismo score):
 * 1. due_at más próxima (null al final)
 * 2. planned_for hoy antes que no planificada
 * 3. project.priority menor (1 gana a 10)
 * 4. prioridad de tarea: urgent > high > medium > low
 * 5. created_at más antiguo
 * 6. id
 */
export function isTaskBlocked(task: Task | DecisionTask): boolean {
  return Boolean(task.blocked_reason?.trim());
}

export function isTaskActionable(task: Task | DecisionTask): boolean {
  return (
    (task.status === "pending" || task.status === "in_progress") &&
    !isTaskBlocked(task)
  );
}

export function toDecisionTask(task: Task): DecisionTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    project_id: task.project_id,
    due_at: task.due_at,
    planned_for: task.planned_for,
    estimated_minutes: task.estimated_minutes,
    blocked_reason: task.blocked_reason,
    created_at: task.created_at,
  };
}

export function toDecisionProject(project: Project): DecisionProject {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    priority: project.priority,
    status: project.status,
  };
}

function projectPriorityPoints(priority: number): number {
  if (priority < 1 || priority > 10) return 0;
  return DECISION_WEIGHTS.projectPriorityMax + 1 - priority;
}

function dueReason(
  task: Task,
  now: Date,
  today: string,
  timezone: string
): DecisionReason | null {
  if (!task.due_at) return null;
  const due = new Date(task.due_at);
  if (Number.isNaN(due.getTime())) return null;

  if (due.getTime() < now.getTime()) {
    return {
      code: "task_overdue",
      label: "La tarea está vencida",
      points: DECISION_WEIGHTS.dueOverdue,
    };
  }

  const dueDay = dateOnlyInTimeZone(due, timezone);
  if (dueDay === today) {
    return {
      code: "due_today",
      label: "La tarea vence hoy",
      points: DECISION_WEIGHTS.dueToday,
    };
  }

  const remaining = due.getTime() - now.getTime();
  if (remaining <= 24 * MS_PER_HOUR) {
    return {
      code: "due_within_24h",
      label: "La tarea vence en las próximas 24 horas",
      points: DECISION_WEIGHTS.dueWithin24h,
    };
  }
  if (remaining <= 3 * MS_PER_DAY) {
    return {
      code: "due_within_3d",
      label: "La tarea vence en 3 días o menos",
      points: DECISION_WEIGHTS.dueWithin3d,
    };
  }
  if (remaining <= 7 * MS_PER_DAY) {
    return {
      code: "due_within_7d",
      label: "La tarea vence en 7 días o menos",
      points: DECISION_WEIGHTS.dueWithin7d,
    };
  }
  return null;
}

function scoreTask(
  task: Task,
  project: Project | null,
  now: Date,
  today: string,
  timezone: string
): RankedTask {
  const reasons: DecisionReason[] = [];
  const plannedToday = asDateOnly(task.planned_for) === today;

  const priorityPoints = DECISION_WEIGHTS.taskPriority[task.priority];
  if (priorityPoints > 0) {
    reasons.push({
      code: `task_priority_${task.priority}`,
      label: `Prioridad de tarea: ${task.priority}`,
      points: priorityPoints,
    });
  }

  if (task.status === "in_progress") {
    reasons.push({
      code: "in_progress",
      label: "La tarea ya está en progreso",
      points: DECISION_WEIGHTS.inProgress,
    });
  }

  if (plannedToday) {
    reasons.push({
      code: "planned_today",
      label: "Está planificada para hoy",
      points: DECISION_WEIGHTS.plannedToday,
    });
  }

  const due = dueReason(task, now, today, timezone);
  if (due) reasons.push(due);

  if (project) {
    const projectPts = projectPriorityPoints(project.priority);
    if (projectPts > 0) {
      reasons.push({
        code: "project_priority",
        label: `Pertenece a un proyecto P${project.priority}`,
        points: projectPts,
      });
    }

    if (isProjectOverdue(project, today)) {
      reasons.push({
        code: "project_overdue",
        label: "El proyecto tiene la fecha objetivo vencida",
        points: DECISION_WEIGHTS.projectOverdue,
      });
    }

    if (isProjectStalled(project, now)) {
      const days = daysSinceActivity(project, now);
      reasons.push({
        code: "project_stalled",
        label: `El proyecto lleva ${days} días sin actividad`,
        points: DECISION_WEIGHTS.projectStalled,
      });
    }
  }

  const score = reasons.reduce((sum, reason) => sum + reason.points, 0);

  return {
    task: toDecisionTask(task),
    project: project ? toDecisionProject(project) : null,
    score,
    reasons,
    actionable: isTaskActionable(task),
  };
}

function compareRanked(a: RankedTask, b: RankedTask): number {
  if (a.score !== b.score) return b.score - a.score;

  const aDue = a.task.due_at ? new Date(a.task.due_at).getTime() : Number.POSITIVE_INFINITY;
  const bDue = b.task.due_at ? new Date(b.task.due_at).getTime() : Number.POSITIVE_INFINITY;
  if (aDue !== bDue) return aDue - bDue;

  const aToday = a.reasons.some((reason) => reason.code === "planned_today");
  const bToday = b.reasons.some((reason) => reason.code === "planned_today");
  if (aToday !== bToday) return aToday ? -1 : 1;

  const aProjectPriority = a.project?.priority ?? Number.POSITIVE_INFINITY;
  const bProjectPriority = b.project?.priority ?? Number.POSITIVE_INFINITY;
  if (aProjectPriority !== bProjectPriority) {
    return aProjectPriority - bProjectPriority;
  }

  const aRank = TASK_PRIORITY_RANK[a.task.priority];
  const bRank = TASK_PRIORITY_RANK[b.task.priority];
  if (aRank !== bRank) return aRank - bRank;

  const aCreated = new Date(a.task.created_at).getTime();
  const bCreated = new Date(b.task.created_at).getTime();
  if (aCreated !== bCreated) return aCreated - bCreated;

  if (a.task.id < b.task.id) return -1;
  if (a.task.id > b.task.id) return 1;
  return 0;
}

function eventTouchesDate(
  event: CalendarEvent,
  today: string,
  timezone: string
): boolean {
  const startDay = dateOnlyInTimeZone(new Date(event.start_at), timezone);
  if (startDay === today) return true;
  const endDay = dateOnlyInTimeZone(new Date(event.end_at), timezone);
  return startDay < today && endDay >= today;
}

export function buildCalendarContext(
  events: CalendarEvent[],
  now: Date,
  today: string,
  timezone: string
): CalendarDecisionContext {
  const todayEvents = events.filter((event) =>
    eventTouchesDate(event, today, timezone)
  );
  const nextEvent =
    events
      .filter((event) => new Date(event.end_at).getTime() > now.getTime())
      .slice()
      .sort((a, b) => {
        const startDiff =
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
        if (startDiff !== 0) return startDiff;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      })[0] ?? null;

  return {
    today_events: todayEvents,
    next_event: nextEvent,
    calendar_event_count: events.length,
  };
}

/**
 * Greedy por ranking. No es optimización global:
 * recorre accionables en orden y suma estimated_minutes
 * mientras no se exceda el presupuesto. Sin estimación, no afirma que cabe.
 */
export function buildFocusPlan(
  actionable: RankedTask[],
  availableMinutes: number
): FocusPlan {
  const selected: RankedTask[] = [];
  let used = 0;

  for (const item of actionable) {
    const estimate = item.task.estimated_minutes;
    if (estimate === null) continue;
    if (used + estimate <= availableMinutes) {
      selected.push(item);
      used += estimate;
    }
  }

  return {
    available_minutes: availableMinutes,
    used_minutes: used,
    remaining_minutes: availableMinutes - used,
    selected,
  };
}

export function runDecisionEngine(input: DecisionEngineInput): DailyDecision {
  const { now, today, timezone, tasks, projects, events, availableMinutes } =
    input;
  const projectById = new Map(projects.map((project) => [project.id, project]));

  const ranked = tasks
    .filter(
      (task) =>
        task.status === "pending" ||
        task.status === "in_progress" ||
        task.status === "waiting_approval"
    )
    .map((task) =>
      scoreTask(
        task,
        task.project_id ? projectById.get(task.project_id) ?? null : null,
        now,
        today,
        timezone
      )
    )
    .sort(compareRanked);

  const actionable = ranked.filter((item) => item.actionable);
  const focusPlan =
    availableMinutes === undefined
      ? null
      : buildFocusPlan(actionable, availableMinutes);

  return {
    generated_at: now.toISOString(),
    date: today,
    timezone,
    ranked_tasks: ranked,
    recommended: focusPlan
      ? focusPlan.selected
      : actionable.slice(0, MAX_RECOMMENDED),
    blocked: ranked.filter((item) => isTaskBlocked(item.task)),
    waiting: ranked.filter((item) => item.task.status === "waiting_approval"),
    overdue: ranked.filter((item) =>
      item.reasons.some((reason) => reason.code === "task_overdue")
    ),
    planned_today: ranked.filter((item) =>
      item.reasons.some((reason) => reason.code === "planned_today")
    ),
    focus_plan: focusPlan,
    calendar: buildCalendarContext(events, now, today, timezone),
  };
}
