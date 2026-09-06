import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import type { CalendarEvent } from "@/types/database";

const COLUMNS =
  "id, title, description, start_at, end_at, all_day, calendar_name, location, html_link, google_event_id, project_id, created_at";

const DEFAULT_LIMIT = 100;

export interface ListCalendarEventsOptions {
  from: Date;
  to: Date;
  limit?: number;
}

export async function listCalendarEvents(
  options: ListCalendarEventsOptions
): Promise<CalendarEvent[]> {
  const admin = createAdminClient();
  const limit = options.limit ?? DEFAULT_LIMIT;

  const { data, error } = await admin
    .from("calendar_events")
    .select(COLUMNS)
    .eq("owner_key", AURO_OWNER_KEY)
    .lt("start_at", options.to.toISOString())
    .gt("end_at", options.from.toISOString())
    .order("start_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}
