import type { Task } from "@/types/database";

export function getTasksByProject(projectId: string, tasks: Task[]): Task[] {
  return tasks.filter((t) => t.project_id === projectId);
}

export function countTasksByProject(projectId: string, tasks: Task[]): number {
  return tasks.filter(
    (t) =>
      t.project_id === projectId &&
      (t.status === "pending" ||
        t.status === "in_progress" ||
        t.status === "waiting_approval")
  ).length;
}
