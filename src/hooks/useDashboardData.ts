"use client";

import { useCallback, useEffect, useState } from "react";
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

const EMPTY = {
  alerts: [] as Alert[],
  emails: [] as ImportantEmail[],
  leads: [] as Lead[],
  tasks: [] as Task[],
  calendarEvents: [] as CalendarEvent[],
  recurringTasks: [] as RecurringTask[],
};

export function useDashboardData(): DashboardData {
  const [data, setData] = useState<Omit<DashboardData, "refresh">>({
    ...EMPTY,
    loading: true,
    isLive: false,
    partial: false,
    error: null,
  });

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

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
        ...EMPTY,
        loading: false,
        isLive: false,
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
