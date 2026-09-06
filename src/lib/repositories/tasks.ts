import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import type {
  Task,
  TaskPriority,
  TaskSource,
  TaskStatus,
} from "@/types/database";

const COLUMNS =
  "id, title, description, source, priority, status, ai_summary, suggested_action, project_id, metadata, created_at, updated_at";

const DEFAULT_LIMIT = 200;

export interface TaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  source?: TaskSource;
  status?: TaskStatus;
  project_id?: string | null;
  ai_summary?: string | null;
  suggested_action?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ListTasksOptions {
  projectId?: string;
  statuses?: TaskStatus[];
  limit?: number;
}

function mapRow(row: Task): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    source: row.source,
    priority: row.priority,
    status: row.status,
    ai_summary: row.ai_summary,
    suggested_action: row.suggested_action,
    project_id: row.project_id,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listTasks(
  options: ListTasksOptions = {}
): Promise<Task[]> {
  const admin = createAdminClient();
  const limit = options.limit ?? DEFAULT_LIMIT;

  let query = admin
    .from("tasks")
    .select(COLUMNS)
    .eq("owner_key", AURO_OWNER_KEY)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.projectId) {
    query = query.eq("project_id", options.projectId);
  }
  if (options.statuses && options.statuses.length > 0) {
    query = query.in("status", options.statuses);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Task));
}

export async function getTaskById(id: string): Promise<Task | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("tasks")
    .select(COLUMNS)
    .eq("id", id)
    .eq("owner_key", AURO_OWNER_KEY)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data as Task) : null;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("tasks")
    .insert({
      owner_key: AURO_OWNER_KEY,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority ?? "medium",
      source: input.source ?? "manual",
      status: input.status ?? "pending",
      project_id: input.project_id ?? null,
      ai_summary: input.ai_summary ?? null,
      suggested_action: input.suggested_action ?? null,
      metadata: input.metadata ?? {},
    })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return mapRow(data as Task);
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<Task | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .eq("owner_key", AURO_OWNER_KEY)
    .select(COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data as Task) : null;
}
