import type { CalendarEvent } from "@/types/database";
import type { FocusPlan, RankedTask } from "@/lib/intelligence/decision-types";

export interface BriefingStalledProject {
  id: string;
  name: string;
  slug: string;
  priority: number;
  objective: string | null;
  deadline: string | null;
  next_action: string | null;
  blocked_reason: string | null;
  last_activity_at: string;
  days_since_activity: number;
}

export interface BriefingOverdueProject {
  id: string;
  name: string;
  slug: string;
  priority: number;
  deadline: string | null;
  next_action: string | null;
}

export interface BriefingBlockedProject {
  id: string;
  name: string;
  priority: number;
  blocked_reason: string;
  next_action: string | null;
  deadline: string | null;
}

export interface BriefingEmail {
  id: string;
  subject: string;
  sender: string;
  snippet: string | null;
  received_at: string;
}

export interface BriefingAlert {
  id: string;
  title: string;
  message: string | null;
  severity: "info" | "warning" | "critical";
  source: string | null;
  project_id: string | null;
  created_at: string;
}

export interface DailyBriefingCounts {
  recommended_tasks: number;
  blocked_tasks: number;
  waiting_tasks: number;
  overdue_tasks: number;
  planned_today_tasks: number;
  today_events: number;
  stalled_projects: number;
  overdue_projects: number;
  blocked_projects: number;
  important_emails: number;
  unread_alerts: number;
  critical_alerts: number;
  warning_alerts: number;
}

export interface DailyBriefing {
  generated_at: string;
  date: string;
  timezone: string;
  priorities: RankedTask[];
  focus_plan: FocusPlan | null;
  agenda: {
    today_events: CalendarEvent[];
    next_event: CalendarEvent | null;
    calendar_event_count: number;
  };
  tasks: {
    blocked: RankedTask[];
    waiting: RankedTask[];
    overdue: RankedTask[];
    planned_today: RankedTask[];
  };
  projects: {
    stalled: BriefingStalledProject[];
    overdue: BriefingOverdueProject[];
    blocked: BriefingBlockedProject[];
  };
  inbox: {
    important_emails: BriefingEmail[];
    unread_alerts: BriefingAlert[];
  };
  counts: DailyBriefingCounts;
}
