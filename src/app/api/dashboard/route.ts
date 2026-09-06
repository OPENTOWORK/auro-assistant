import { NextResponse } from "next/server";
import { fetchDashboardData } from "@/lib/api/dashboard-data";

export const dynamic = "force-dynamic";
import { isSupabaseConfigured } from "@/lib/config";
import {
  MOCK_CALENDAR_EVENTS,
  MOCK_EMAILS,
  MOCK_LEADS,
  getUpcomingCalendarEvents,
} from "@/lib/mock-data";

export async function GET() {
  try {
    const data = await fetchDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/dashboard]", error);
    return NextResponse.json({
      alerts: [],
      emails: isSupabaseConfigured() ? [] : MOCK_EMAILS,
      leads: isSupabaseConfigured() ? [] : MOCK_LEADS,
      tasks: [],
      calendarEvents: isSupabaseConfigured()
        ? []
        : getUpcomingCalendarEvents(MOCK_CALENDAR_EVENTS),
      recurringTasks: [],
      isLive: isSupabaseConfigured(),
      partial: true,
    });
  }
}
