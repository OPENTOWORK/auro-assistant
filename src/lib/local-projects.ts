import { DEFAULT_PROJECTS } from "@/lib/default-projects";
import type { Project } from "@/types/database";

const STORAGE_KEY = "auro-projects-v2";

export function getLocalProjects(): Project[] {
  if (typeof window === "undefined") return DEFAULT_PROJECTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROJECTS));
      return DEFAULT_PROJECTS;
    }
    return JSON.parse(raw) as Project[];
  } catch {
    return DEFAULT_PROJECTS;
  }
}

export function saveLocalProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
