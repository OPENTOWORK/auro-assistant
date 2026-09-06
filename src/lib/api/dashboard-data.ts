import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  MOCK_CALENDAR_EVENTS,
  MOCK_EMAILS,
  MOCK_LEADS,
  MOCK_RECURRING_TASKS,
  getUpcomingCalendarEvents,
} from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/config";
import { mergeCalendarWithRecurring } from "@/lib/recurring-to-calendar";
import type {
  Alert,
  CalendarEvent,
  ImportantEmail,
  Lead,
  RecurringTask,
  Task,
} from "@/types/database";

/**
 * Composición de los datos del dashboard.
 *
 * Regla de fiabilidad: cuando Supabase está configurado NUNCA se inyectan
 * datos de ejemplo. Si una consulta falla se devuelve vacío y se marca
 * `partial`, para que la interfaz pueda distinguir "no tengo nada" de
 * "no he podido leer". Los mocks solo existen en modo demo, es decir cuando
 * no hay Supabase configurado en absoluto.
 */

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

/** Ninguna consulta debe ser ilimitada. */
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

function buildDemoDashboard(): DashboardPayload {
  const mockRecurring = MOCK_RECURRING_TASKS.filter((t) => t.is_active);
  return {
    ...EMPTY_DASHBOARD,
    emails: MOCK_EMAILS,
    leads: MOCK_LEADS,
    calendarEvents: mergeCalendarWithRecurring(
      getUpcomingCalendarEvents(MOCK_CALENDAR_EVENTS),
      mockRecurring,
      { daysBack: 60, daysAhead: 120, limit: 200 }
    ),
    recurringTasks: mockRecurring,
  };
}

export async function fetchDashboardData(): Promise<DashboardPayload> {
  if (!isSupabaseConfigured()) {
    return buildDemoDashboard();
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
        if (!isMissingTableError(error)) {
          console.error(`[dashboard-data:${label}]`, error);
        }
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

  // Los proyectos no se piden aquí: el cliente los carga por su cuenta desde
  // /api/projects. Pedirlos también en este composer era una consulta extra
  // por cada render y por cada llamada a herramienta del asistente.
  const [alerts, emails, leads, tasks, calendarEvents, recurringTasks] =
    await Promise.all([
      safeQuery<Alert[]>("alerts", async () =>
        admin
          .from("alerts")
          .select("*")
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(LIMITS.alerts)
      ),
      safeQuery<ImportantEmail[]>("emails", async () =>
        admin
          .from("important_emails")
          .select("*")
          .eq("is_processed", false)
          .not("subject", "eq", "(Sin asunto)")
          .not("sender", "eq", "desconocido")
          .order("received_at", { ascending: false })
          .limit(LIMITS.emails)
      ),
      safeQuery<Lead[]>("leads", async () =>
        admin
          .from("leads")
          .select("*")
          .eq("status", "new")
          .order("created_at", { ascending: false })
          .limit(LIMITS.leads)
      ),
      safeQuery<Task[]>("tasks", async () =>
        admin
          .from("tasks")
          .select("*")
          .in("status", ["pending", "in_progress", "waiting_approval"])
          .order("created_at", { ascending: false })
          .limit(LIMITS.tasks)
      ),
      safeQuery<CalendarEvent[]>("calendar", async () =>
        admin
          .from("calendar_events")
          .select("*")
          .gte("start_at", calendarFrom.toISOString())
          .order("start_at", { ascending: true })
          .limit(LIMITS.calendarEvents)
      ),
      safeQuery<RecurringTask[]>("recurring", async () =>
        admin
          .from("recurring_tasks")
          .select("*")
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
