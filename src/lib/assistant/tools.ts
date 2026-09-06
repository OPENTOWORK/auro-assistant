import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDashboardData } from "@/lib/api/dashboard-data";
import { listProjects } from "@/lib/repositories/projects";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import {
  fallbackCreatePendingAction,
  fallbackGetConfirmedMemory,
  fallbackGetPendingActions,
  isMissingTableError,
} from "@/lib/assistant/fallback-store";
import type { ActionType, PendingAction } from "@/types/assistant";
import { parseProposedAction } from "@/lib/assistant/action-schemas";

export async function runAssistantTool(
  name: string,
  args: Record<string, unknown>,
  conversationId?: string
): Promise<unknown> {
  switch (name) {
    case "get_projects":
      return { projects: await listProjects() };
    case "get_tasks": {
      const dashboard = await fetchDashboardData();
      let tasks = dashboard.tasks;
      const projectName = String(args.project_name ?? "").toLowerCase();
      if (projectName) {
        const projects = await listProjects();
        const match = projects.find((p) =>
          p.name.toLowerCase().includes(projectName)
        );
        tasks = match
          ? tasks.filter((t) => t.project_id === match.id)
          : tasks.filter((t) =>
              t.title.toLowerCase().includes(projectName)
            );
      }
      const limit = Number(args.limit ?? 20);
      return { tasks: tasks.slice(0, limit) };
    }
    case "get_calendar_events": {
      const dashboard = await fetchDashboardData();
      const limit = Number(args.limit ?? 10);
      return { events: dashboard.calendarEvents.slice(0, limit) };
    }
    case "get_important_emails": {
      const dashboard = await fetchDashboardData();
      const limit = Number(args.limit ?? 10);
      return { emails: dashboard.emails.slice(0, limit) };
    }
    case "get_leads": {
      const dashboard = await fetchDashboardData();
      const limit = Number(args.limit ?? 10);
      return { leads: dashboard.leads.slice(0, limit) };
    }
    case "get_user_memory":
      return { memory: await getConfirmedMemory() };
    case "propose_action": {
      const parsed = parseProposedAction(args);
      if (!parsed.ok) {
        return {
          proposed: false,
          error: "invalid_action_payload",
          details: parsed.details,
        };
      }

      const action = await createPendingAction({
        action_type: parsed.data.action_type,
        label: parsed.data.label,
        payload: { ...parsed.data.payload },
        conversation_id: conversationId,
      });
      return {
        proposed: true,
        action_id: action.id,
        label: action.label,
        action_type: action.action_type,
        message:
          "Acción propuesta. El usuario debe confirmarla en la tarjeta de confirmación.",
      };
    }
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}

export async function getConfirmedMemory() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return fallbackGetConfirmedMemory();
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_memory")
    .select("*")
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("confirmed", true)
    .order("category");

  if (error) {
    if (isMissingTableError(error)) return fallbackGetConfirmedMemory();
    throw error;
  }
  return data ?? [];
}

export async function createPendingAction(input: {
  action_type: ActionType;
  label: string;
  payload: Record<string, unknown>;
  conversation_id?: string;
}): Promise<PendingAction> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return fallbackCreatePendingAction(input);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pending_actions")
    .insert({
      owner_key: AURO_OWNER_KEY,
      conversation_id: input.conversation_id ?? null,
      action_type: input.action_type,
      label: input.label,
      payload: input.payload,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return fallbackCreatePendingAction(input);
    }
    throw error;
  }
  return data as PendingAction;
}

export async function getPendingActions(): Promise<PendingAction[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return fallbackGetPendingActions();
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pending_actions")
    .select("*")
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return fallbackGetPendingActions();
    throw error;
  }
  return (data ?? []) as PendingAction[];
}