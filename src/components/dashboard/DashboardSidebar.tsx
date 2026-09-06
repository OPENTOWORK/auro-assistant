"use client";

import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Card } from "@/components/ui/Card";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { isSupabaseConfigured } from "@/lib/config";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProjects } from "@/components/projects/ProjectsProvider";
import { countTasksByProject } from "@/lib/task-utils";
import { sortProjectsByPriority } from "@/lib/project-utils";
import { formatRelativeTime } from "@/lib/utils";

export function DashboardSidebar() {
  const { projects } = useProjects();
  const {
    emails,
    tasks,
    calendarEvents,
    loading,
    error,
  } = useDashboardData();

  const allProjects = sortProjectsByPriority(projects);
  const showDemo = !isSupabaseConfigured();

  return (
    <div className="space-y-3">
      {showDemo && <DemoBanner />}
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <CollapsibleSection
        title="Mis proyectos"
        count={allProjects.length}
        href="/proyectos"
      >
        {loading && allProjects.length === 0 ? (
          <p className="text-sm text-auro-muted py-2">Cargando...</p>
        ) : allProjects.length > 0 ? (
          <div className="space-y-2">
            {allProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={countTasksByProject(project.id, tasks)}
                compact
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-auro-muted py-2">No hay proyectos todavía</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Gmails destacados" count={emails.length}>
        {loading ? (
          <p className="text-sm text-auro-muted py-2">Cargando...</p>
        ) : emails.length > 0 ? (
          emails.map((email) => (
            <Card key={email.id} className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-auro-text truncate">
                  {email.subject}
                </p>
                <span className="text-[10px] text-auro-muted shrink-0">
                  {formatRelativeTime(email.received_at)}
                </span>
              </div>
              <p className="text-xs text-auro-muted truncate">{email.sender}</p>
              {email.snippet && (
                <p className="text-xs text-auro-muted/70 line-clamp-2">
                  {email.snippet}
                </p>
              )}
            </Card>
          ))
        ) : (
          <p className="text-sm text-auro-muted py-2">
            No hay emails con estrella. Márcalos en Gmail para verlos aquí.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Calendario de Google"
        count={calendarEvents.length}
        defaultOpen={calendarEvents.length > 0}
      >
        {loading ? (
          <p className="text-sm text-auro-muted py-2">Cargando...</p>
        ) : (
          <CalendarWidget events={calendarEvents} loading={loading} />
        )}
      </CollapsibleSection>
    </div>
  );
}
