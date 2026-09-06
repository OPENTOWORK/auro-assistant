import type { Task } from "@/types/database";

const STORAGE_KEY = "auro-local-tasks-v2";

export function getLocalTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

export function clearLocalTasks(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("auro-local-tasks");
}

export function addLocalTask(task: Task): void {
  const tasks = getLocalTasks();
  tasks.unshift(task);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function createLocalTask(
  data: Pick<Task, "title" | "description" | "priority" | "source" | "project_id">
): Task {
  const now = new Date().toISOString();
  return {
    id: `local-${Date.now()}`,
    title: data.title,
    description: data.description,
    source: data.source,
    priority: data.priority,
    status: "pending",
    ai_summary: null,
    suggested_action: null,
    project_id: data.project_id,
    created_at: now,
    updated_at: now,
  };
}
