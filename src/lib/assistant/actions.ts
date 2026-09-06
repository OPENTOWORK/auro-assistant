import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import { isSupabaseConfigured } from "@/lib/config";
import {
  parseProposedAction,
  type ProposedAction,
} from "@/lib/assistant/action-schemas";
import {
  fallbackCancelAction,
  fallbackClaimAction,
  fallbackMarkExecuted,
  fallbackReleaseClaim,
  fallbackUpsertMemory,
} from "@/lib/assistant/fallback-store";
import { createTask, updateTaskStatus } from "@/lib/repositories/tasks";
import type { PendingAction } from "@/types/assistant";

export class ActionConflictError extends Error {
  constructor(message = "Acción no encontrada o ya procesada") {
    super(message);
    this.name = "ActionConflictError";
  }
}

export type ActionResult = {
  ok: boolean;
  message: string;
  finalized?: boolean;
};

function persistFailedMessage() {
  return "No se pudo persistir la acción.";
}

function executedButNotFinalizedMessage(sideEffectMessage: string) {
  return `${sideEffectMessage} El estado interno no se pudo cerrar. No confirmes esta acción otra vez.`;
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
): Promise<ActionResult> {
  const parsed = validatedAction(action);
  if (!parsed) {
    return { ok: false, message: "Payload de acción inválido." };
  }

  switch (parsed.action_type) {
    case "create_task": {
      if (!isSupabaseConfigured()) {
        return { ok: false, message: persistFailedMessage() };
      }
      try {
        await createTask({
          title: parsed.payload.title,
          description: parsed.payload.description ?? null,
          priority: parsed.payload.priority,
          source: parsed.payload.source,
          status: "pending",
          project_id: parsed.payload.project_id ?? null,
        });
      } catch {
        return { ok: false, message: persistFailedMessage() };
      }
      return { ok: true, message: "Tarea creada correctamente." };
    }
    case "update_task_status": {
      if (!isSupabaseConfigured()) {
        return { ok: false, message: persistFailedMessage() };
      }
      try {
        const updated = await updateTaskStatus(
          parsed.payload.task_id,
          parsed.payload.status
        );
        if (!updated) {
          return { ok: false, message: "Tarea no encontrada" };
        }
      } catch {
        return { ok: false, message: persistFailedMessage() };
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

async function confirmActionLocal(actionId: string): Promise<ActionResult> {
  const claimed = fallbackClaimAction(actionId);
  if (!claimed) {
    throw new ActionConflictError();
  }

  const result = await executePendingAction(claimed);
  if (!result.ok) {
    fallbackReleaseClaim(actionId);
    return result;
  }

  const finalized = fallbackMarkExecuted(actionId);
  if (!finalized) {
    return {
      ok: true,
      finalized: false,
      message: executedButNotFinalizedMessage(result.message),
    };
  }

  return { ...result, finalized: true };
}

/**
 * Confirmación atómica:
 * pending → confirmed (claim; solo un request gana)
 * → side effect
 * → confirmed → executed
 *
 * Si el side effect falla ANTES de aplicarse: se intenta confirmed → pending.
 * Si el side effect ya ocurrió y falla el cierre a executed: se deja confirmed.
 * No se revierte a pending (evitaría un segundo side effect) y getPendingActions()
 * solo lista status=pending, así que no reaparece como confirmable.
 */
export async function confirmAction(actionId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return confirmActionLocal(actionId);
  }

  const admin = createAdminClient();
  const { data: claimed, error: claimError } = await admin
    .from("pending_actions")
    .update({ status: "confirmed" })
    .eq("id", actionId)
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (claimError) {
    console.error("[assistant/confirmAction claim]", claimError);
    throw new Error(persistFailedMessage());
  }

  if (!claimed) {
    throw new ActionConflictError();
  }

  const result = await executePendingAction(claimed as PendingAction);

  if (!result.ok) {
    const { error: releaseError } = await admin
      .from("pending_actions")
      .update({ status: "pending" })
      .eq("id", actionId)
      .eq("owner_key", AURO_OWNER_KEY)
      .eq("status", "confirmed");

    if (releaseError) {
      console.error("[assistant/confirmAction release]", releaseError);
    }
    return result;
  }

  const { data: finalizedRow, error: finalizeError } = await admin
    .from("pending_actions")
    .update({
      status: "executed",
      executed_at: new Date().toISOString(),
    })
    .eq("id", actionId)
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();

  if (finalizeError || !finalizedRow) {
    console.error("[assistant/confirmAction finalize]", finalizeError);
    return {
      ok: true,
      finalized: false,
      message: executedButNotFinalizedMessage(result.message),
    };
  }

  return { ...result, finalized: true };
}

export async function cancelAction(actionId: string) {
  if (!isSupabaseConfigured()) {
    if (!fallbackCancelAction(actionId)) {
      throw new ActionConflictError();
    }
    return { ok: true };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pending_actions")
    .update({ status: "cancelled" })
    .eq("id", actionId)
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[assistant/cancelAction]", error);
    throw new Error(persistFailedMessage());
  }

  if (!data) {
    throw new ActionConflictError();
  }

  return { ok: true };
}
