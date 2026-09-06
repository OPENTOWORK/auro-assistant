import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config";
import { mergeCalendarWithRecurring } from "@/lib/recurring-to-calendar";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import type {
  Alert,
  CalendarEvent,
  ImportantEmail,
  Lead,
  RecurringTask,
  Task,
} from "@/types/database";

export interface DashboardPayload {
  alerts: Alert[];
  emails: ImportantEmail[];
  leads: Lead[];
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  recurringTasks: RecurringTask[];
  isLive: boolean;
  partial: boolean;
}

const LIMITS = {
  alerts: 50,
  emails: 50,
  leads: 50,
  tasks: 200,
  calendarEvents: 100,
  recurringTasks: 100,
} as const;

const EMPTY_DASHBOARD: DashboardPayload = {
  alerts: [],
  emails: [],
  leads: [],
  tasks: [],
  calendarEvents: [],
  recurringTasks: [],
  isLive: false,
  partial: false,
};

const TASK_COLUMNS =
  "id, title, description, source, priority, status, ai_summary, suggested_action, project_id, metadata, created_at, updated_at";
const ALERT_COLUMNS =
  "id, title, message, severity, is_read, source, project_id, created_at";
const EMAIL_COLUMNS =
  "id, subject, sender, snippet, gmail_id, is_processed, received_at, created_at";
const LEAD_COLUMNS =
  "id, name, email, phone, source, status, notes, project_id, created_at";
const CALENDAR_COLUMNS =
  "id, title, description, start_at, end_at, all_day, calendar_name, location, html_link, google_event_id, project_id, created_at";
const RECURRING_COLUMNS =
  "id, title, description, frequency, schedule_day, project_id, is_active, created_at";

export async function fetchDashboardData(): Promise<DashboardPayload> {
  if (!isSupabaseConfigured()) {
    return EMPTY_DASHBOARD;
  }

  const admin = createAdminClient();
  const calendarFrom = new Date();
  calendarFrom.setDate(calendarFrom.getDate() - 60);
  let partial = false;

  const safeQuery = async <T>(
    label: string,
    query: () => Promise<{
      data: T | null;
      error: { code?: string; message?: string } | null;
    }>
  ): Promise<T> => {
    try {
      const { data, error } = await query();
      if (error) {
        console.error(`[dashboard-data:${label}]`, error);
        partial = true;
        return [] as T;
      }
      return (data ?? []) as T;
    } catch (err) {
      console.error(`[dashboard-data:${label}]`, err);
      partial = true;
      return [] as T;
    }
  };

  const [alerts, emails, leads, tasks, calendarEvents, recurringTasks] =
    await Promise.all([
      safeQuery<Alert[]>("alerts", async () =>
        admin
          .from("alerts")
          .select(ALERT_COLUMNS)
          .eq("owner_key", AURO_OWNER_KEY)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(LIMITS.alerts)
      ),
      safeQuery<ImportantEmail[]>("emails", async () =>
        admin
          .from("important_emails")
          .select(EMAIL_COLUMNS)
          .eq("owner_key", AURO_OWNER_KEY)
          .eq("is_processed", false)
          .not("subject", "eq", "(Sin asunto)")
          .not("sender", "eq", "desconocido")
          .order("received_at", { ascending: false })
          .limit(LIMITS.emails)
      ),
      safeQuery<Lead[]>("leads", async () =>
        admin
          .from("leads")
          .select(LEAD_COLUMNS)
          .eq("owner_key", AURO_OWNER_KEY)
          .eq("status", "new")
          .order("created_at", { ascending: false })
          .limit(LIMITS.leads)
      ),
      safeQuery<Task[]>("tasks", async () =>
        admin
          .from("tasks")
          .select(TASK_COLUMNS)
          .eq("owner_key", AURO_OWNER_KEY)
          .in("status", ["pending", "in_progress", "waiting_approval"])
          .order("created_at", { ascending: false })
          .limit(LIMITS.tasks)
      ),
      safeQuery<CalendarEvent[]>("calendar", async () =>
        admin
          .from("calendar_events")
          .select(CALENDAR_COLUMNS)
          .eq("owner_key", AURO_OWNER_KEY)
          .gte("start_at", calendarFrom.toISOString())
          .order("start_at", { ascending: true })
          .limit(LIMITS.calendarEvents)
      ),
      safeQuery<RecurringTask[]>("recurring", async () =>
        admin
          .from("recurring_tasks")
          .select(RECURRING_COLUMNS)
          .eq("owner_key", AURO_OWNER_KEY)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(LIMITS.recurringTasks)
      ),
    ]);

  return {
    alerts,
    emails,
    leads,
    tasks,
    calendarEvents: mergeCalendarWithRecurring(calendarEvents, recurringTasks, {
      daysBack: 60,
      daysAhead: 120,
      limit: 200,
    }),
    recurringTasks,
    isLive: true,
    partial,
  };
}
