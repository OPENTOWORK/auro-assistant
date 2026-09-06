"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProjectLabel } from "@/components/ui/AppIcon";
import { useProjects } from "@/components/projects/ProjectsProvider";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRecurringCompletions } from "@/hooks/useRecurringCompletions";
import {
  getTodayCalendarEvents,
  isRecurringCalendarEvent,
} from "@/lib/recurring-to-calendar";
import { isTaskPlannedToday } from "@/lib/intelligence/project-health";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/database";

function formatTodayTime(event: CalendarEvent): string {
  if (event.all_day) return "Todo el día";
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  const startTime = start.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startTime} – ${endTime}`;
}

function recurringIdFromEvent(event: CalendarEvent): string | null {
  if (!isRecurringCalendarEvent(event)) return null;
  const match = event.id.match(/^recurring-(.+)-(\d{4}-\d{2}-\d{2})$/);
  return match?.[1] ?? null;
}

export function TodayAgenda() {
  const { calendarEvents, recurringTasks, alerts, tasks, loading } = useDashboardData();
  const { getById } = useProjects();
  const { isCompleted, toggle } = useRecurringCompletions(recurringTasks);

  const today = new Date();
  const todayEvents = getTodayCalendarEvents(calendarEvents, today);
  const todayTasks = tasks.filter((task) => isTaskPlannedToday(task));

  const dateLabel = today.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <section className="rounded-xl border border-auro-border bg-auro-card overflow-hidden">
      <div className="px-4 py-3 border-b border-auro-border/50">
        <h2 className="text-sm font-semibold text-auro-text capitalize">
          Tu día · {dateLabel}
        </h2>
        <p className="text-xs text-auro-muted mt-0.5">
          {loading
            ? "Cargando..."
            : `${todayEvents.length} en agenda${todayTasks.length > 0 ? ` · ${todayTasks.length} tareas` : ""}${alerts.length > 0 ? ` · ${alerts.length} alertas` : ""}`}
        </p>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-auro-muted">Cargando agenda...</p>
        ) : todayEvents.length === 0 && alerts.length === 0 && todayTasks.length === 0 ? (
          <p className="text-sm text-auro-muted py-4 text-center">
            Nada programado para hoy. Disfruta el día o crea una tarea en Tareas.
          </p>
        ) : (
          <>
            {todayTasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-auro-accent">
                  Tareas para hoy
                </p>
                {todayTasks.map((task) => (
                  <Link key={task.id} href={`/tareas/${task.id}`}>
                    <Card className="py-2.5 px-3 hover:border-auro-accent/40 transition-colors">
                      <p className="text-sm font-medium text-auro-text">{task.title}</p>
                      {task.blocked_reason && (
                        <p className="text-xs text-red-400 mt-0.5">Bloqueada</p>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {alerts.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
                  Alertas urgentes
                </p>
                {alerts.map((alert) => (
                  <Card key={alert.id} className="border-amber-500/20 bg-amber-500/5 py-2.5 px-3">
                    <p className="text-sm font-medium text-auro-text">{alert.title}</p>
                    {alert.message && (
                      <p className="text-xs text-auro-muted mt-0.5 line-clamp-2">
                        {alert.message}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {todayEvents.length > 0 && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full min-w-[480px] text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-auro-border/60 text-left">
                      <th className="w-10 py-2 pl-1 text-[10px] font-semibold uppercase tracking-wider text-auro-muted">
                        Hecho
                      </th>
                      <th className="py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-auro-muted w-28">
                        Hora
                      </th>
                      <th className="py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-auro-muted">
                        Tarea / evento
                      </th>
                      <th className="py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-auro-muted w-32">
                        Tipo
                      </th>
                      <th className="py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-auro-muted w-36">
                        Proyecto
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayEvents.map((event) => {
                      const recurringId = recurringIdFromEvent(event);
                      const recurringTask = recurringId
                        ? recurringTasks.find((t) => t.id === recurringId)
                        : null;
                      const done = recurringId ? isCompleted(recurringId) : false;
                      const project = event.project_id
                        ? getById(event.project_id)
                        : null;
                      const isGoogle = !isRecurringCalendarEvent(event);

                      return (
                        <tr
                          key={event.id}
                          className={cn(
                            "border-b border-auro-border/30",
                            done && "bg-emerald-500/5"
                          )}
                        >
                          <td className="py-3 pl-1 align-middle">
                            {recurringTask ? (
                              <button
                                type="button"
                                onClick={() => void toggle(recurringTask)}
                                aria-pressed={done}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md border-2 transition-all",
                                  done
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : "border-auro-border bg-auro-bg/50 text-transparent hover:border-emerald-500/60"
                                )}
                              >
                                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                                  <path
                                    d="M3.5 8.5L6.5 11.5L12.5 4.5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            ) : (
                              <span className="inline-block h-7 w-7" aria-hidden />
                            )}
                          </td>
                          <td className="py-3 px-2 align-middle text-xs text-auro-muted whitespace-nowrap">
                            {formatTodayTime(event)}
                          </td>
                          <td className="py-3 px-2 align-middle">
                            <p
                              className={cn(
                                "font-medium text-auro-text",
                                done && "line-through text-auro-muted"
                              )}
                            >
                              {event.title}
                            </p>
                          </td>
                          <td className="py-3 px-2 align-middle">
                            <Badge
                              className={
                                isGoogle
                                  ? "bg-blue-500/15 text-blue-700 border-blue-500/25 dark:text-blue-300"
                                  : "bg-purple-500/15 text-purple-700 border-purple-500/25 dark:text-purple-300"
                              }
                            >
                              {event.calendar_name}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 align-middle">
                            {project ? (
                              <ProjectLabel
                                name={project.name}
                                icon={project.icon}
                                color={project.color}
                                className="text-auro-accent text-xs"
                              />
                            ) : (
                              <span className="text-xs text-auro-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
