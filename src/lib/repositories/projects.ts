import { createAdminClient } from "@/lib/supabase/admin";
import { isUniqueViolation } from "@/lib/supabase/errors";
import { sortProjectsByPriority } from "@/lib/project-utils";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import type { Project, ProjectStatus, ProjectType } from "@/types/database";

const COLUMNS =
  "id, slug, name, description, type, status, priority, icon, color, url, created_at, objective, deadline, next_action, blocked_reason, last_activity_at";

const DEFAULT_LIMIT = 200;

interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: ProjectType;
  status: ProjectStatus;
  priority: number;
  icon: string;
  color: string;
  url: string | null;
  created_at: string;
  objective: string | null;
  deadline: string | null;
  next_action: string | null;
  blocked_reason: string | null;
  last_activity_at: string;
}

export interface ProjectInput {
  name: string;
  description?: string | null;
  type: ProjectType;
  status: ProjectStatus;
  priority: number;
  icon: string;
  color: string;
  slug: string;
  url?: string | null;
  objective?: string | null;
  deadline?: string | null;
  next_action?: string | null;
  blocked_reason?: string | null;
}

function mapRow(row: ProjectRow): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    type: row.type,
    status: row.status,
    priority: row.priority,
    icon: row.icon,
    color: row.color,
    url: row.url,
    created_at: row.created_at,
    objective: row.objective ?? null,
    deadline: row.deadline ?? null,
    next_action: row.next_action ?? null,
    blocked_reason: row.blocked_reason ?? null,
    last_activity_at: row.last_activity_at ?? row.created_at,
  };
}

function toRow(input: ProjectInput) {
  return {
    owner_key: AURO_OWNER_KEY,
    slug: input.slug.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    type: input.type,
    status: input.status,
    priority: input.priority,
    icon: input.icon,
    color: input.color,
    url: input.url?.trim() || null,
    objective: input.objective?.trim() || null,
    deadline: input.deadline || null,
    next_action: input.next_action?.trim() || null,
    blocked_reason: input.blocked_reason?.trim() || null,
  };
}

export class DuplicateSlugError extends Error {
  constructor(slug: string) {
    super(`Ya existe un proyecto con el identificador "${slug}"`);
    this.name = "DuplicateSlugError";
  }
}

export async function listProjects(limit = DEFAULT_LIMIT): Promise<Project[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("projects")
    .select(COLUMNS)
    .eq("owner_key", AURO_OWNER_KEY)
    .order("priority", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return sortProjectsByPriority((data ?? []).map((row) => mapRow(row as ProjectRow)));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("projects")
    .select(COLUMNS)
    .eq("id", id)
    .eq("owner_key", AURO_OWNER_KEY)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data as ProjectRow) : null;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("projects")
    .insert(toRow(input))
    .select(COLUMNS)
    .single();

  if (error) {
    if (isUniqueViolation(error)) throw new DuplicateSlugError(input.slug);
    throw error;
  }

  return mapRow(data as ProjectRow);
}

export async function updateProject(
  id: string,
  input: ProjectInput
): Promise<Project | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("projects")
    .update(toRow(input))
    .eq("id", id)
    .eq("owner_key", AURO_OWNER_KEY)
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    if (isUniqueViolation(error)) throw new DuplicateSlugError(input.slug);
    throw error;
  }

  return data ? mapRow(data as ProjectRow) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("owner_key", AURO_OWNER_KEY)
    .select("id");

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
