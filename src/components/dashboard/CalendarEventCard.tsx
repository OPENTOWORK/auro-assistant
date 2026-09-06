import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { AppIcon, ProjectLabel } from "@/components/ui/AppIcon";
import { useProjects } from "@/components/projects/ProjectsProvider";
import { formatEventRange, isEventToday } from "@/lib/utils";
import { isRecurringCalendarEvent } from "@/lib/recurring-to-calendar";
import type { CalendarEvent } from "@/types/database";

interface CalendarEventCardProps {
  event: CalendarEvent;
}

export function CalendarEventCard({ event }: CalendarEventCardProps) {
  const { getById } = useProjects();
  const project = event.project_id ? getById(event.project_id) : null;
  const today = isEventToday(event.start_at);
  const isRecurring = isRecurringCalendarEvent(event);

  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
              isRecurring
                ? "bg-purple-500/10 border-purple-500/25 text-purple-400"
                : "bg-auro-surface border-auro-border text-auro-accent"
            }`}
          >
            <AppIcon name="calendar" className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-auro-text leading-snug">
              {event.title}
            </p>
            <p className="text-xs text-auro-muted mt-0.5">
              {formatEventRange(event.start_at, event.end_at, event.all_day)}
            </p>
          </div>
        </div>
        {today && (
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 shrink-0">
            Hoy
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-auro-muted">
        <span className="truncate">{event.calendar_name}</span>
        {project && (
          <ProjectLabel
            name={project.name}
            icon={project.icon}
            color={project.color}
            className="text-auro-accent shrink-0"
          />
        )}
      </div>

      {event.location && (
        <p className="flex items-center gap-1 text-xs text-auro-muted/80">
          <AppIcon name="map-pin" className="h-3 w-3 shrink-0" />
          <span className="truncate">{event.location}</span>
        </p>
      )}
    </Card>
  );
}
