import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDashboardData } from "@/lib/api/dashboard-data";
import { listProjects } from "@/lib/repositories/projects";
import { listTasks } from "@/lib/repositories/tasks";
import {
  daysSinceActivity,
  isProjectOverdue,
  isProjectStalled,
  isTaskOverdue,
  isTaskPlannedToday,
} from "@/lib/intelligence/project-health";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import { isSupabaseConfigured } from "@/lib/config";
import {
  fallbackCreatePendingAction,
  fallbackGetConfirmedMemory,
  fallbackGetPendingActions,
} from "@/lib/assistant/fallback-store";
import type { ActionType, PendingAction } from "@/types/assistant";
import { parseProposedAction } from "@/lib/assistant/action-schemas";

export async function runAssistantTool(
  name: string,
  args: Record<string, unknown>,
  conversationId?: string
): Promise<unknown> {
  switch (name) {
    case "get_projects": {
      const projects = await listProjects();
      return {
        projects: projects.map((project) => ({
          id: project.id,
          slug: project.slug,
          name: project.name,
          description: project.description,
          type: project.type,
          status: project.status,
          priority: project.priority,
          objective: project.objective,
          deadline: project.deadline,
          next_action: project.next_action,
          blocked_reason: project.blocked_reason,
          last_activity_at: project.last_activity_at,
          stalled: isProjectStalled(project),
          overdue: isProjectOverdue(project),
          days_since_activity: daysSinceActivity(project),
        })),
      };
    }
    case "get_tasks": {
      let tasks = await listTasks({
        statuses: ["pending", "in_progress", "waiting_approval"],
      });
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
      return {
        tasks: tasks.slice(0, limit).map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          source: task.source,
          priority: task.priority,
          status: task.status,
          project_id: task.project_id,
          due_at: task.due_at,
          planned_for: task.planned_for,
          estimated_minutes: task.estimated_minutes,
          blocked_reason: task.blocked_reason,
          completed_at: task.completed_at,
          overdue: isTaskOverdue(task),
          planned_today: isTaskPlannedToday(task),
        })),
      };
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

      try {
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
      } catch (error) {
        console.error("[assistant/propose_action]", error);
        return {
          proposed: false,
          error: "persist_failed",
        };
      }
    }
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}

export async function getConfirmedMemory() {
  if (!isSupabaseConfigured()) {
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
  if (!isSupabaseConfigured()) {
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
    throw error;
  }
  return data as PendingAction;
}

export async function getPendingActions(): Promise<PendingAction[]> {
  if (!isSupabaseConfigured()) {
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
    throw error;
  }
  return (data ?? []) as PendingAction[];
}
