"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CalendarViewModal } from "@/components/dashboard/CalendarViewModal";
import {
  addMonths,
  eventsForDay,
  formatMonthYear,
  getMonthGrid,
  getWeekdayLabels,
  isToday,
} from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/database";

interface CalendarWidgetProps {
  events: CalendarEvent[];
  loading?: boolean;
}

export function CalendarWidget({ events, loading = false }: CalendarWidgetProps) {
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"month" | "week" | "day">("month");

  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();
  const weeks = getMonthGrid(year, month);
  const labels = getWeekdayLabels();

  function openView(mode: "month" | "week" | "day" = "month") {
    setModalMode(mode);
    setModalOpen(true);
  }

  if (loading) {
    return <p className="text-sm text-auro-muted py-2">Cargando calendario...</p>;
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFocusDate((d) => addMonths(d, -1))}
              className="p-1 rounded text-auro-muted hover:text-auro-text hover:bg-auro-surface transition-colors"
              aria-label="Mes anterior"
            >
              ←
            </button>
            <p className="text-sm font-medium text-auro-text min-w-[120px] text-center">
              {formatMonthYear(focusDate)}
            </p>
            <button
              type="button"
              onClick={() => setFocusDate((d) => addMonths(d, 1))}
              className="p-1 rounded text-auro-muted hover:text-auro-text hover:bg-auro-surface transition-colors"
              aria-label="Mes siguiente"
            >
              →
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={() => openView("month")}>
            View
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {labels.map((label) => (
            <div
              key={label}
              className="text-center text-[9px] font-semibold text-auro-muted py-0.5"
            >
              {label}
            </div>
          ))}
          {weeks.flat().map((day) => {
            const inMonth = day.getMonth() === month;
            const today = isToday(day);
            const dayEvents = eventsForDay(events, day);
            const hasEvents = dayEvents.length > 0;

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  setFocusDate(day);
                  openView("day");
                }}
                className={cn(
                  "relative flex flex-col items-center justify-start rounded-md py-1 min-h-[32px] transition-colors",
                  inMonth ? "hover:bg-auro-surface/60" : "opacity-30",
                  today && "bg-auro-accent/15 ring-1 ring-auro-accent/40"
                )}
              >
                <span
                  className={cn(
                    "text-[11px] leading-none font-medium",
                    today ? "text-auro-accent" : "text-auro-text"
                  )}
                >
                  {day.getDate()}
                </span>
                {hasEvents && (
                  <span className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={cn(
                          "h-1 w-1 rounded-full",
                          event.id.startsWith("recurring-")
                            ? "bg-purple-400"
                            : "bg-blue-400"
                        )}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {events.length === 0 && (
          <p className="text-xs text-auro-muted text-center py-1">
            No hay eventos próximos.
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-[11px]"
            onClick={() => openView("week")}
          >
            Semana
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-[11px]"
            onClick={() => openView("day")}
          >
            Día
          </Button>
        </div>
      </div>

      <CalendarViewModal
        events={events}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        focusDate={focusDate}
        onFocusDateChange={setFocusDate}
        initialMode={modalMode}
      />
    </>
  );
}
