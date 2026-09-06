"use client";

import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Card } from "@/components/ui/Card";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { ProjectLabel } from "@/components/ui/AppIcon";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { isSupabaseConfigured } from "@/lib/config";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProjects } from "@/components/projects/ProjectsProvider";
import { countTasksByProject } from "@/lib/task-utils";
import { sortProjectsByPriority } from "@/lib/project-utils";
import { formatRelativeTime } from "@/lib/utils";

export function DashboardView() {
  const { projects, getById, isLive: projectsLive } = useProjects();
  const { emails, leads, tasks, calendarEvents } = useDashboardData();

  const allProjects = sortProjectsByPriority(projects);
  const showDemo = !isSupabaseConfigured();

  return (
    <div className="space-y-4">
      {showDemo && <DemoBanner />}

      {projectsLive && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          Proyectos sincronizados con Supabase
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-auro-text">
          Buenos días, Charly
        </h2>
        <p className="text-sm text-auro-muted mt-0.5">
          {new Date().toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          {allProjects.length === 0 ? " · No hay proyectos todavía" : null}
        </p>
      </section>

      <CollapsibleSection
        title="Mis proyectos"
        count={allProjects.length}
        href="/proyectos"
      >
        {allProjects.length === 0 ? (
          <p className="text-sm text-auro-muted py-2">No hay proyectos todavía</p>
        ) : (
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
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Gmails destacados" count={emails.length}>
        {emails.length > 0 ? (
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
      >
        <CalendarWidget events={calendarEvents} />
        {showDemo && (
          <p className="text-[10px] text-auro-muted pt-1">
            Modo demo — conecta Google Calendar vía n8n para eventos reales.
          </p>
        )}
      </CollapsibleSection>

      {leads.length > 0 && (
        <CollapsibleSection title="Leads recientes" count={leads.length}>
          {leads.map((lead) => {
            const project = lead.project_id ? getById(lead.project_id) : null;
            return (
              <Card key={lead.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-auro-text">{lead.name}</p>
                  <p className="text-xs text-auro-muted truncate">
                    {lead.notes ?? lead.email ?? lead.phone}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  {project && (
                    <ProjectLabel
                      name={project.name}
                      icon={project.icon}
                      color={project.color}
                      className="text-xs text-auro-accent"
                    />
                  )}
                  <p className="text-[10px] text-auro-muted">
                    {formatRelativeTime(lead.created_at)}
                  </p>
                </div>
              </Card>
            );
          })}
        </CollapsibleSection>
      )}
    </div>
  );
}
