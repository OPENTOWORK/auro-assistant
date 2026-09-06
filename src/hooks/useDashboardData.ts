"use client";

import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import {
  MOCK_CALENDAR_EVENTS,
  MOCK_EMAILS,
  MOCK_LEADS,
  MOCK_RECURRING_TASKS,
  MOCK_TASKS,
  MOCK_ALERTS,
  getUpcomingCalendarEvents,
} from "@/lib/mock-data";
import type {
  Alert,
  CalendarEvent,
  ImportantEmail,
  Lead,
  RecurringTask,
  Task,
} from "@/types/database";

interface DashboardData {
  alerts: Alert[];
  emails: ImportantEmail[];
  leads: Lead[];
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  recurringTasks: RecurringTask[];
  loading: boolean;
  isLive: boolean;
  partial: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
  const [data, setData] = useState<Omit<DashboardData, "refresh">>({
    alerts: [],
    emails: [],
    leads: [],
    tasks: [],
    calendarEvents: [],
    recurringTasks: [],
    loading: true,
    isLive: false,
    partial: false,
    error: null,
  });

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    if (!isSupabaseConfigured()) {
      setData({
        alerts: MOCK_ALERTS,
        emails: MOCK_EMAILS,
        leads: MOCK_LEADS,
        tasks: MOCK_TASKS,
        calendarEvents: getUpcomingCalendarEvents(MOCK_CALENDAR_EVENTS),
        recurringTasks: MOCK_RECURRING_TASKS.filter((t) => t.is_active),
        loading: false,
        isLive: false,
        partial: false,
        error: null,
      });
      return;
    }

    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "No se pudieron cargar los datos");
      }
      setData({
        alerts: json.alerts ?? [],
        emails: json.emails ?? [],
        leads: json.leads ?? [],
        tasks: json.tasks ?? [],
        calendarEvents: json.calendarEvents ?? [],
        recurringTasks: json.recurringTasks ?? [],
        loading: false,
        isLive: Boolean(json.isLive),
        partial: Boolean(json.partial),
        error: null,
      });
    } catch {
      setData({
        alerts: [],
        emails: [],
        leads: [],
        tasks: [],
        calendarEvents: getUpcomingCalendarEvents(MOCK_CALENDAR_EVENTS),
        recurringTasks: [],
        loading: false,
        isLive: isSupabaseConfigured(),
        partial: true,
        error: "No se pudieron cargar los datos",
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, refresh: load };
}
