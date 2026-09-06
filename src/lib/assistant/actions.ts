import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import {
  fallbackCancelAction,
  fallbackConfirmAction,
  fallbackGetPendingActions,
  fallbackUpsertMemory,
  isMissingTableError,
} from "@/lib/assistant/fallback-store";
import type { PendingAction } from "@/types/assistant";

async function upsertMemory(input: {
  category: string;
  memory_key: string;
  value: string;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    fallbackUpsertMemory(input);
    return;
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
    if (isMissingTableError(error)) {
      fallbackUpsertMemory(input);
      return;
    }
    throw error;
  }
}

export async function executePendingAction(
  action: PendingAction
): Promise<{ ok: boolean; message: string }> {
  const admin = createAdminClient();
  const payload = action.payload;

  switch (action.action_type) {
    case "create_task": {
      const { error } = await admin.from("tasks").insert({
        title: String(payload.title ?? "Nueva tarea"),
        description: payload.description ? String(payload.description) : null,
        priority: (payload.priority as string) ?? "medium",
        source: (payload.source as string) ?? "manual",
        status: "pending",
        project_id: payload.project_id ? String(payload.project_id) : null,
      });
      if (error) {
        if (isMissingTableError(error)) {
          return {
            ok: true,
            message:
              "Tarea registrada localmente. Ejecuta la migración SQL para persistirla en Supabase.",
          };
        }
        throw error;
      }
      return { ok: true, message: "Tarea creada correctamente." };
    }
    case "update_task_status": {
      const { error } = await admin
        .from("tasks")
        .update({ status: String(payload.status ?? "done") })
        .eq("id", String(payload.task_id));
      if (error) throw error;
      return { ok: true, message: "Estado de la tarea actualizado." };
    }
    case "create_calendar_event": {
      const { error } = await admin.from("calendar_events").insert({
        title: String(payload.title ?? "Evento"),
        description: payload.description ? String(payload.description) : null,
        start_at: String(payload.start_at),
        end_at: String(payload.end_at),
        all_day: Boolean(payload.all_day ?? false),
        calendar_name: String(payload.calendar_name ?? "Principal"),
        location: payload.location ? String(payload.location) : null,
      });
      if (error) {
        if (isMissingTableError(error)) {
          return {
            ok: true,
            message:
              "Evento preparado. Ejecuta la migración SQL del calendario para guardarlo.",
          };
        }
        throw error;
      }
      return { ok: true, message: "Evento creado en el calendario." };
    }
    case "prepare_email_reply": {
      return {
        ok: true,
        message: `Borrador preparado: ${String(payload.draft ?? payload.body ?? "")}`,
      };
    }
    case "set_project_focus": {
      await upsertMemory({
        category: "priorities",
        memory_key: "current_focus",
        value: String(payload.project_name ?? payload.project_id ?? ""),
      });
      return {
        ok: true,
        message: `Foco actualizado a ${payload.project_name ?? payload.project_id}.`,
      };
    }
    case "save_memory": {
      await upsertMemory({
        category: String(payload.category ?? "preferences"),
        memory_key: String(payload.key ?? "note"),
        value: String(payload.value ?? ""),
      });
      return { ok: true, message: "Memoria guardada." };
    }
    default:
      return { ok: false, message: `Acción no soportada: ${action.action_type}` };
  }
}

export async function confirmAction(actionId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const action = fallbackConfirmAction(actionId);
    const result = await executePendingAction(action);
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
        (a) => a.id === actionId
      );
      if (!fallbackAction) {
        throw new Error("Acción no encontrada o ya procesada");
      }
      const result = await executePendingAction(fallbackAction);
      fallbackConfirmAction(actionId);
      return result;
    }
    throw new Error("Acción no encontrada o ya procesada");
  }

  const result = await executePendingAction(action as PendingAction);

  const { error: updateError } = await admin
    .from("pending_actions")
    .update({
      status: "executed",
      executed_at: new Date().toISOString(),
    })
    .eq("id", actionId);

  if (updateError && isMissingTableError(updateError)) {
    fallbackConfirmAction(actionId);
  } else if (updateError) {
    throw updateError;
  }

  return result;
}

export async function cancelAction(actionId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
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
