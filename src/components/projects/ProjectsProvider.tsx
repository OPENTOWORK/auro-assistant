"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { slugify, sortProjectsByPriority } from "@/lib/project-utils";
import type { Project, ProjectStatus, ProjectType } from "@/types/database";

export interface ProjectFormData {
  name: string;
  description?: string | null;
  type: ProjectType;
  status: ProjectStatus;
  priority: number;
  icon: string;
  color: string;
  slug?: string;
  objective?: string | null;
  deadline?: string | null;
  next_action?: string | null;
  blocked_reason?: string | null;
}

interface ProjectsContextValue {
  projects: Project[];
  loading: boolean;
  isLive: boolean;
  error: string | null;
  getById: (id: string) => Project | undefined;
  getBySlug: (slug: string) => Project | undefined;
  addProject: (data: ProjectFormData) => Promise<Project>;
  updateProject: (id: string, data: ProjectFormData) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

function uniqueSlug(base: string, projects: Project[], excludeId?: string): string {
  let slug = base;
  let n = 2;
  while (projects.some((p) => p.slug === slug && p.id !== excludeId)) {
    slug = `${base}-${n}`;
    n++;
  }
  return slug;
}

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const { projects: data } = await res.json();
        setProjects(sortProjectsByPriority(Array.isArray(data) ? data : []));
        setIsLive(true);
        setError(null);
      } else {
        setProjects([]);
        setIsLive(false);
        setError("No se pudieron cargar los proyectos");
      }
    } catch {
      setProjects([]);
      setIsLive(false);
      setError("No se pudieron cargar los proyectos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getById = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  const getBySlug = useCallback(
    (slug: string) => projects.find((p) => p.slug === slug),
    [projects]
  );

  const addProject = useCallback(
    async (data: ProjectFormData): Promise<Project> => {
      const baseSlug = data.slug?.trim() || slugify(data.name);
      const slug = uniqueSlug(baseSlug, projects);

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, slug }),
      });
      if (!res.ok) throw new Error("Error al crear el proyecto");
      const { project } = await res.json();
      setProjects((prev) => sortProjectsByPriority([...prev, project]));
      setIsLive(true);
      setError(null);
      return project;
    },
    [projects]
  );

  const updateProject = useCallback(
    async (id: string, data: ProjectFormData): Promise<Project | null> => {
      const existing = projects.find((p) => p.id === id);
      if (!existing) return null;

      const baseSlug = data.slug?.trim() || slugify(data.name);
      const slug = uniqueSlug(baseSlug, projects, id);

      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, slug }),
      });
      if (!res.ok) throw new Error("Error al actualizar el proyecto");
      const { project } = await res.json();
      setProjects((prev) =>
        sortProjectsByPriority(prev.map((p) => (p.id === id ? project : p)))
      );
      return project;
    },
    [projects]
  );

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Error al eliminar el proyecto");
    setProjects((prev) => prev.filter((p) => p.id !== id));
    return true;
  }, []);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        loading,
        isLive,
        error,
        getById,
        getBySlug,
        addProject,
        updateProject,
        deleteProject,
        refresh,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error("useProjects debe usarse dentro de ProjectsProvider");
  }
  return ctx;
}
