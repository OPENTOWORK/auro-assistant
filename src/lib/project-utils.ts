export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateProjectId(): string {
  return `p-${Date.now()}`;
}

export function sortProjectsByPriority<T extends { priority: number }>(
  projects: T[]
): T[] {
  return [...projects].sort((a, b) => a.priority - b.priority);
}
