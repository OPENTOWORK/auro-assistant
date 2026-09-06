import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import { isSupabaseConfigured } from "@/lib/config";
import {
  parseProposedAction,
  type ProposedAction,
} from "@/lib/assistant/action-schemas";
import {
  fallbackCancelAction,
  fallbackConfirmAction,
  fallbackGetPendingActions,
  fallbackUpsertMemory,
  isMissingTableError,
} from "@/lib/assistant/fallback-store";
import type { PendingAction } from "@/types/assistant";

function persistFailedMessage() {
  return "No se pudo persistir la acción.";
}

async function upsertMemory(input: {
  category: string;
  memory_key: string;
  value: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (!isSupabaseConfigured()) {
    fallbackUpsertMemory(input);
    return { ok: true };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("user_memory").upsert(
    {
      owner_key: AURO_OWNER_KEY,
      category: input.category,
      memory_key: input.memory_key,
      value: input.value,
      confirmed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_key,category,memory_key" }
  );

  if (error) {
    return { ok: false, message: persistFailedMessage() };
  }
  return { ok: true };
}

function validatedAction(action: PendingAction): ProposedAction | null {
  const parsed = parseProposedAction({
    action_type: action.action_type,
    label: action.label || action.action_type,
    payload: action.payload,
  });
  return parsed.ok ? parsed.data : null;
}

export async function executePendingAction(
  action: PendingAction
): Promise<{ ok: boolean; message: string }> {
  const parsed = validatedAction(action);
  if (!parsed) {
    return { ok: false, message: "Payload de acción inválido." };
  }

  switch (parsed.action_type) {
    case "create_task": {
      if (!isSupabaseConfigured()) {
        return { ok: false, message: persistFailedMessage() };
      }
      const admin = createAdminClient();
      const { error } = await admin.from("tasks").insert({
        title: parsed.payload.title,
        description: parsed.payload.description ?? null,
        priority: parsed.payload.priority,
        source: parsed.payload.source,
        status: "pending",
        owner_key: AURO_OWNER_KEY,
        project_id: parsed.payload.project_id ?? null,
      });
      if (error) {
        return { ok: false, message: persistFailedMessage() };
      }
      return { ok: true, message: "Tarea creada correctamente." };
    }
    case "update_task_status": {
      if (!isSupabaseConfigured()) {
        return { ok: false, message: persistFailedMessage() };
      }
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("tasks")
        .update({ status: parsed.payload.status })
        .eq("id", parsed.payload.task_id)
        .eq("owner_key", AURO_OWNER_KEY)
        .select("id")
        .maybeSingle();
      if (error) {
        return { ok: false, message: persistFailedMessage() };
      }
      if (!data) {
        return { ok: false, message: "Tarea no encontrada" };
      }
      return { ok: true, message: "Estado de la tarea actualizado." };
    }
    case "create_calendar_event": {
      if (!isSupabaseConfigured()) {
        return { ok: false, message: persistFailedMessage() };
      }
      const admin = createAdminClient();
      const { error } = await admin.from("calendar_events").insert({
        title: parsed.payload.title,
        description: parsed.payload.description ?? null,
        start_at: parsed.payload.start_at,
        end_at: parsed.payload.end_at,
        all_day: parsed.payload.all_day,
        calendar_name: parsed.payload.calendar_name,
        location: parsed.payload.location ?? null,
        project_id: parsed.payload.project_id ?? null,
        owner_key: AURO_OWNER_KEY,
      });
      if (error) {
        return { ok: false, message: persistFailedMessage() };
      }
      return { ok: true, message: "Evento creado en el calendario." };
    }
    case "prepare_email_reply": {
      return {
        ok: true,
        message: `Borrador preparado: ${parsed.payload.draft}`,
      };
    }
    case "set_project_focus": {
      const value =
        parsed.payload.project_name ?? parsed.payload.project_id ?? "";
      const saved = await upsertMemory({
        category: "priorities",
        memory_key: "current_focus",
        value,
      });
      if (!saved.ok) {
        return { ok: false, message: saved.message ?? persistFailedMessage() };
      }
      return {
        ok: true,
        message: `Foco actualizado a ${value}.`,
      };
    }
    case "save_memory": {
      const saved = await upsertMemory({
        category: parsed.payload.category,
        memory_key: parsed.payload.key,
        value: parsed.payload.value,
      });
      if (!saved.ok) {
        return { ok: false, message: saved.message ?? persistFailedMessage() };
      }
      return { ok: true, message: "Memoria guardada." };
    }
    default:
      return { ok: false, message: "Acción no soportada." };
  }
}

export async function confirmAction(actionId: string) {
  if (!isSupabaseConfigured()) {
    const action = fallbackGetPendingActions().find((item) => item.id === actionId);
    if (!action) {
      throw new Error("Acción no encontrada o ya procesada");
    }
    const result = await executePendingAction(action);
    if (result.ok) {
      fallbackConfirmAction(actionId);
    }
    return result;
  }

  const admin = createAdminClient();
  const { data: action, error } = await admin
    .from("pending_actions")
    .select("*")
    .eq("id", actionId)
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("status", "pending")
    .single();

  if (error || !action) {
    if (error && isMissingTableError(error)) {
      const fallbackAction = fallbackGetPendingActions().find(
        (item) => item.id === actionId
      );
      if (!fallbackAction) {
        throw new Error("Acción no encontrada o ya procesada");
      }
      const result = await executePendingAction(fallbackAction);
      if (result.ok) {
        fallbackConfirmAction(actionId);
      }
      return result;
    }
    throw new Error("Acción no encontrada o ya procesada");
  }

  const result = await executePendingAction(action as PendingAction);

  if (!result.ok) {
    return result;
  }

  const { error: updateError } = await admin
    .from("pending_actions")
    .update({
      status: "executed",
      executed_at: new Date().toISOString(),
    })
    .eq("id", actionId)
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("status", "pending");

  if (updateError) {
    return { ok: false, message: persistFailedMessage() };
  }

  return result;
}

export async function cancelAction(actionId: string) {
  if (!isSupabaseConfigured()) {
    fallbackCancelAction(actionId);
    return { ok: true };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("pending_actions")
    .update({ status: "cancelled" })
    .eq("id", actionId)
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("status", "pending");

  if (error) {
    if (isMissingTableError(error)) {
      fallbackCancelAction(actionId);
      return { ok: true };
    }
    throw error;
  }
  return { ok: true };
}
