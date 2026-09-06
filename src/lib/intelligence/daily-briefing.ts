import { asDateOnly } from "@/lib/intelligence/dates";
import {
  assertValidAvailableMinutes,
} from "@/lib/intelligence/decision-engine";
import {
  daysSinceActivity,
  isProjectOverdue,
  isProjectStalled,
} from "@/lib/intelligence/project-health";
import {
  buildDailyDecision,
  loadDailyDecisionContext,
} from "@/lib/intelligence/daily-decision";
import { listImportantEmails } from "@/lib/repositories/important-emails";
import { listUnreadAlerts } from "@/lib/repositories/alerts";
import type { Alert, Project } from "@/types/database";
import type { DailyDecision, RankedTask } from "@/lib/intelligence/decision-types";
import type {
  BriefingAlert,
  BriefingBlockedProject,
  BriefingEmail,
  BriefingOverdueProject,
  BriefingStalledProject,
  DailyBriefing,
} from "@/lib/intelligence/daily-briefing-types";

export const BRIEFING_MAX_PRIORITIES = 3;
export const BRIEFING_MAX_SECTION = 5;
export const BRIEFING_MAX_TODAY_EVENTS = 10;
export const BRIEFING_EMAIL_FETCH = 20;
export const BRIEFING_ALERT_FETCH = 50;

function take<T>(items: T[], max: number): T[] {
  return items.slice(0, max);
}

function compareId(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function collectStalledProjects(
  projects: Project[],
  now: Date
): BriefingStalledProject[] {
  return projects
    .filter((project) => isProjectStalled(project, now))
    .map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      priority: project.priority,
      objective: project.objective,
      deadline: project.deadline,
      next_action: project.next_action,
      blocked_reason: project.blocked_reason,
      last_activity_at: project.last_activity_at,
      days_since_activity: daysSinceActivity(project, now),
    }))
    .sort((a, b) => {
      if (a.days_since_activity !== b.days_since_activity) {
        return b.days_since_activity - a.days_since_activity;
      }
      if (a.priority !== b.priority) return a.priority - b.priority;
      return compareId(a.id, b.id);
    });
}

export function collectOverdueProjects(
  projects: Project[],
  today: string
): BriefingOverdueProject[] {
  return projects
    .filter((project) => isProjectOverdue(project, today))
    .map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      priority: project.priority,
      deadline: project.deadline,
      next_action: project.next_action,
    }))
    .sort((a, b) => {
      const aDeadline = asDateOnly(a.deadline) ?? "9999-12-31";
      const bDeadline = asDateOnly(b.deadline) ?? "9999-12-31";
      if (aDeadline !== bDeadline) return aDeadline < bDeadline ? -1 : 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return compareId(a.id, b.id);
    });
}

export function collectBlockedProjects(
  projects: Project[]
): BriefingBlockedProject[] {
  return projects
    .filter(
      (project) =>
        project.status !== "paused" && Boolean(project.blocked_reason?.trim())
    )
    .map((project) => ({
      id: project.id,
      name: project.name,
      priority: project.priority,
      blocked_reason: project.blocked_reason?.trim() ?? "",
      next_action: project.next_action,
      deadline: project.deadline,
    }))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const aDeadline = asDateOnly(a.deadline) ?? "9999-12-31";
      const bDeadline = asDateOnly(b.deadline) ?? "9999-12-31";
      if (aDeadline !== bDeadline) return aDeadline < bDeadline ? -1 : 1;
      return compareId(a.id, b.id);
    });
}

function toBriefingAlert(alert: Alert): BriefingAlert {
  return {
    id: alert.id,
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    source: alert.source,
    project_id: alert.project_id,
    created_at: alert.created_at,
  };
}

export function buildDailyBriefing(input: {
  decision: DailyDecision;
  projects: Project[];
  now: Date;
  emails: BriefingEmail[];
  alerts: Alert[];
}): DailyBriefing {
  const { decision, projects, now, emails, alerts } = input;
  const stalled = collectStalledProjects(projects, now);
  const overdueProjects = collectOverdueProjects(projects, decision.date);
  const blockedProjects = collectBlockedProjects(projects);

  const sliceTasks = (items: RankedTask[]) => take(items, BRIEFING_MAX_SECTION);

  return {
    generated_at: decision.generated_at,
    date: decision.date,
    timezone: decision.timezone,
    priorities: take(decision.recommended, BRIEFING_MAX_PRIORITIES),
    focus_plan: decision.focus_plan,
    agenda: {
      today_events: take(decision.calendar.today_events, BRIEFING_MAX_TODAY_EVENTS),
      next_event: decision.calendar.next_event,
      calendar_event_count: decision.calendar.calendar_event_count,
    },
    tasks: {
      blocked: sliceTasks(decision.blocked),
      waiting: sliceTasks(decision.waiting),
      overdue: sliceTasks(decision.overdue),
      planned_today: sliceTasks(decision.planned_today),
    },
    projects: {
      stalled: take(stalled, BRIEFING_MAX_SECTION),
      overdue: take(overdueProjects, BRIEFING_MAX_SECTION),
      blocked: take(blockedProjects, BRIEFING_MAX_SECTION),
    },
    inbox: {
      important_emails: take(emails, BRIEFING_MAX_SECTION),
      unread_alerts: take(alerts, BRIEFING_MAX_SECTION).map(toBriefingAlert),
    },
    counts: {
      recommended_tasks: decision.recommended.length,
      blocked_tasks: decision.blocked.length,
      waiting_tasks: decision.waiting.length,
      overdue_tasks: decision.overdue.length,
      planned_today_tasks: decision.planned_today.length,
      today_events: decision.calendar.calendar_event_count,
      stalled_projects: stalled.length,
      overdue_projects: overdueProjects.length,
      blocked_projects: blockedProjects.length,
      important_emails: emails.length,
      unread_alerts: alerts.length,
      critical_alerts: alerts.filter((alert) => alert.severity === "critical")
        .length,
      warning_alerts: alerts.filter((alert) => alert.severity === "warning")
        .length,
    },
  };
}

export async function getDailyBriefing(
  availableMinutes?: number,
  now = new Date()
): Promise<DailyBriefing> {
  assertValidAvailableMinutes(availableMinutes);

  const [context, emails, alerts] = await Promise.all([
    loadDailyDecisionContext(now),
    listImportantEmails({ limit: BRIEFING_EMAIL_FETCH }),
    listUnreadAlerts({ limit: BRIEFING_ALERT_FETCH }),
  ]);

  const decision = buildDailyDecision(context, availableMinutes);

  return buildDailyBriefing({
    decision,
    projects: context.projects,
    now: context.now,
    emails,
    alerts,
  });
}
