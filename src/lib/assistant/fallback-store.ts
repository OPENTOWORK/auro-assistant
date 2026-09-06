import { randomUUID } from "crypto";
import type { ChatMessage, PendingAction } from "@/types/assistant";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";

export { isMissingTableError } from "@/lib/supabase/errors";

const conversations = new Map<string, { owner_key: string; title: string }>();
const messages = new Map<string, ChatMessage[]>();
const pendingActions = new Map<string, PendingAction>();
const userMemory = new Map<
  string,
  {
    id: string;
    owner_key: string;
    category: string;
    memory_key: string;
    value: string;
    confirmed: boolean;
    created_at: string;
    updated_at: string;
  }
>();

let defaultConversationId: string | null = null;

export function fallbackGetOrCreateConversation(
  conversationId?: string
): string {
  if (conversationId && conversations.has(conversationId)) {
    return conversationId;
  }

  if (defaultConversationId && conversations.has(defaultConversationId)) {
    return defaultConversationId;
  }

  const id = randomUUID();
  conversations.set(id, {
    owner_key: AURO_OWNER_KEY,
    title: "Conversación con Auro",
  });
  messages.set(id, []);
  defaultConversationId = id;
  return id;
}

export function fallbackLoadMessages(
  conversationId: string,
  limit = 40
): ChatMessage[] {
  const list = messages.get(conversationId) ?? [];
  return list.slice(-limit);
}

export function fallbackSaveMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  metadata: Record<string, unknown> = {}
): ChatMessage {
  if (!conversations.has(conversationId)) {
    conversations.set(conversationId, {
      owner_key: AURO_OWNER_KEY,
      title: "Conversación con Auro",
    });
    messages.set(conversationId, []);
  }

  const message: ChatMessage = {
    id: randomUUID(),
    conversation_id: conversationId,
    role,
    content,
    metadata,
    created_at: new Date().toISOString(),
  };

  const list = messages.get(conversationId) ?? [];
  list.push(message);
  messages.set(conversationId, list);
  return message;
}

export function fallbackCreatePendingAction(input: {
  action_type: PendingAction["action_type"];
  label: string;
  payload: Record<string, unknown>;
  conversation_id?: string;
}): PendingAction {
  const action: PendingAction = {
    id: randomUUID(),
    owner_key: AURO_OWNER_KEY,
    conversation_id: input.conversation_id ?? null,
    action_type: input.action_type,
    label: input.label,
    payload: input.payload,
    status: "pending",
    created_at: new Date().toISOString(),
    executed_at: null,
  };
  pendingActions.set(action.id, action);
  return action;
}

export function fallbackGetPendingActions(): PendingAction[] {
  return Array.from(pendingActions.values())
    .filter((a) => a.owner_key === AURO_OWNER_KEY && a.status === "pending")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export function fallbackGetConfirmedMemory() {
  return Array.from(userMemory.values()).filter(
    (m) => m.owner_key === AURO_OWNER_KEY && m.confirmed
  );
}

export function fallbackUpsertMemory(input: {
  category: string;
  memory_key: string;
  value: string;
}) {
  const key = `${AURO_OWNER_KEY}:${input.category}:${input.memory_key}`;
  const now = new Date().toISOString();
  userMemory.set(key, {
    id: randomUUID(),
    owner_key: AURO_OWNER_KEY,
    category: input.category,
    memory_key: input.memory_key,
    value: input.value,
    confirmed: true,
    created_at: now,
    updated_at: now,
  });
}

export function fallbackConfirmAction(actionId: string) {
  const action = pendingActions.get(actionId);
  if (!action || action.status !== "pending") {
    throw new Error("Acción no encontrada o ya procesada");
  }
  action.status = "executed";
  action.executed_at = new Date().toISOString();
  pendingActions.set(actionId, action);
  return action;
}

export function fallbackCancelAction(actionId: string) {
  const action = pendingActions.get(actionId);
  if (action && action.status === "pending") {
    action.status = "cancelled";
    pendingActions.set(actionId, action);
  }
}
