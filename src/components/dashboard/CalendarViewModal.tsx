"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AppIcon } from "@/components/ui/AppIcon";
import { useProjects } from "@/components/projects/ProjectsProvider";
import {
  eventAccentClass,
  eventsForDay,
  eventsForWeek,
  formatDayLong,
  formatEventTime,
  formatMonthYear,
  formatWeekRange,
  getMonthGrid,
  getWeekDays,
  getWeekdayLabels,
  isToday,
  navigateDate,
  type CalendarViewMode,
} from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/database";

interface CalendarViewModalProps {
  events: CalendarEvent[];
  open: boolean;
  onClose: () => void;
  focusDate: Date;
  onFocusDateChange: (date: Date) => void;
  initialMode?: CalendarViewMode;
}

const VIEW_MODES: { id: CalendarViewMode; label: string }[] = [
  { id: "month", label: "Mes" },
  { id: "week", label: "Semana" },
  { id: "day", label: "Día" },
];

function EventChip({
  event,
  compact = false,
}: {
  event: CalendarEvent;
  compact?: boolean;
}) {
  const { getById } = useProjects();
  const project = event.project_id ? getById(event.project_id) : null;

  return (
    <div
      className={cn(
        "rounded border px-1.5 py-0.5 text-left truncate",
        eventAccentClass(event),
        compact ? "text-[10px]" : "text-xs"
      )}
      title={event.title}
    >
      <span className="font-medium">{event.title}</span>
      {!compact && (
        <span className="block text-[10px] opacity-80 mt-0.5">
          {formatEventTime(event)}
          {project ? ` · ${project.name}` : ""}
        </span>
      )}
    </div>
  );
}

function MonthView({
  events,
  focusDate,
  onSelectDay,
}: {
  events: CalendarEvent[];
  focusDate: Date;
  onSelectDay: (date: Date) => void;
}) {
  const weeks = getMonthGrid(focusDate.getFullYear(), focusDate.getMonth());
  const labels = getWeekdayLabels();

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {labels.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] font-semibold uppercase text-auro-muted py-1"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-rows-6 gap-1 flex-1 min-h-0">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1 min-h-[72px]">
            {week.map((day) => {
              const inMonth = day.getMonth() === focusDate.getMonth();
              const dayEvents = eventsForDay(events, day);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "rounded-lg border p-1 text-left flex flex-col min-h-[72px] transition-colors",
                    inMonth
                      ? "border-auro-border/50 bg-auro-bg/40 hover:border-auro-accent/40"
                      : "border-transparent bg-transparent opacity-40",
                    today && "border-auro-accent/60 bg-auro-accent/10"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                      today && "bg-auro-accent text-white"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-0.5 space-y-0.5 overflow-hidden flex-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <EventChip key={event.id} event={event} compact />
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-auro-muted px-1">
                        +{dayEvents.length - 2} más
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView({
  events,
  focusDate,
  onSelectDay,
}: {
  events: CalendarEvent[];
  focusDate: Date;
  onSelectDay: (date: Date) => void;
}) {
  const days = getWeekDays(focusDate);
  const weekMap = eventsForWeek(events, focusDate);

  return (
    <div className="grid grid-cols-7 gap-2 h-full min-h-[320px]">
      {days.map((day) => {
        const dayEvents = weekMap.get(day.toDateString()) ?? [];
        const today = isToday(day);

        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex flex-col rounded-lg border border-auro-border/50 bg-auro-bg/30 overflow-hidden",
              today && "border-auro-accent/50"
            )}
          >
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className="px-2 py-2 border-b border-auro-border/40 text-center hover:bg-auro-surface/50"
            >
              <p className="text-[10px] uppercase text-auro-muted">
                {day.toLocaleDateString("es-ES", { weekday: "short" })}
              </p>
              <p
                className={cn(
                  "text-lg font-semibold",
                  today ? "text-auro-accent" : "text-auro-text"
                )}
              >
                {day.getDate()}
              </p>
            </button>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
              {dayEvents.length === 0 ? (
                <p className="text-[10px] text-auro-muted text-center py-4">—</p>
              ) : (
                dayEvents.map((event) => <EventChip key={event.id} event={event} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({
  events,
  focusDate,
}: {
  events: CalendarEvent[];
  focusDate: Date;
}) {
  const dayEvents = eventsForDay(events, focusDate);
  const allDay = dayEvents.filter((e) => e.all_day);
  const timed = dayEvents.filter((e) => !e.all_day);

  return (
    <div className="space-y-4 overflow-y-auto max-h-[60vh]">
      {dayEvents.length === 0 ? (
        <p className="text-sm text-auro-muted text-center py-12">
          No hay eventos este día.
        </p>
      ) : (
        <>
          {allDay.length > 0 && (
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-auro-muted mb-2">
                Todo el día
              </h4>
              <div className="space-y-2">
                {allDay.map((event) => (
                  <EventChip key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}
          {timed.length > 0 && (
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-auro-muted mb-2">
                Con hora
              </h4>
              <div className="space-y-2">
                {timed.map((event) => (
                  <EventChip key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function CalendarViewModal({
  events,
  open,
  onClose,
  focusDate,
  onFocusDateChange,
  initialMode = "month",
}: CalendarViewModalProps) {
  const [mode, setMode] = useState<CalendarViewMode>(initialMode);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title =
    mode === "month"
      ? formatMonthYear(focusDate)
      : mode === "week"
        ? formatWeekRange(focusDate)
        : formatDayLong(focusDate);

  function handlePrev() {
    onFocusDateChange(navigateDate(focusDate, mode, -1));
  }

  function handleNext() {
    onFocusDateChange(navigateDate(focusDate, mode, 1));
  }

  function handleSelectDay(day: Date) {
    onFocusDateChange(day);
    setMode("day");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Calendario ampliado"
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-auro-border bg-auro-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-auro-border/60 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AppIcon name="calendar" className="h-5 w-5 text-auro-accent shrink-0" />
            <h2 className="text-lg font-semibold text-auro-text truncate">{title}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex rounded-lg border border-auro-border overflow-hidden">
              {VIEW_MODES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setMode(v.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors",
                    mode === v.id
                      ? "bg-auro-accent text-white"
                      : "text-auro-muted hover:text-auro-text hover:bg-auro-surface"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-auro-muted hover:text-auro-text hover:bg-auro-surface transition-colors"
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5" aria-hidden>
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex sm:hidden border-b border-auro-border/60">
          {VIEW_MODES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setMode(v.id)}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium transition-colors",
                mode === v.id
                  ? "text-auro-accent border-b-2 border-auro-accent"
                  : "text-auro-muted"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-auro-border/40 shrink-0">
          <Button variant="ghost" size="sm" onClick={handlePrev} aria-label="Anterior">
            ←
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onFocusDateChange(new Date())}
          >
            Hoy
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNext} aria-label="Siguiente">
            →
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-5 min-h-0">
          {mode === "month" && (
            <MonthView
              events={events}
              focusDate={focusDate}
              onSelectDay={handleSelectDay}
            />
          )}
          {mode === "week" && (
            <WeekView
              events={events}
              focusDate={focusDate}
              onSelectDay={handleSelectDay}
            />
          )}
          {mode === "day" && <DayView events={events} focusDate={focusDate} />}
        </div>
      </div>
    </div>
  );
}
