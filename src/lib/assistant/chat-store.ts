import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import { isSupabaseConfigured } from "@/lib/config";
import {
  fallbackFindOwnedConversation,
  fallbackGetOrCreateConversation,
  fallbackLoadMessages,
  fallbackSaveMessage,
} from "@/lib/assistant/fallback-store";
import type { ChatMessage } from "@/types/assistant";
import type { SupabaseClient } from "@supabase/supabase-js";

export class ConversationNotFoundError extends Error {
  constructor() {
    super("Conversación no encontrada");
    this.name = "ConversationNotFoundError";
  }
}

async function findOwnedConversationId(
  admin: SupabaseClient,
  conversationId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("chat_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("owner_key", AURO_OWNER_KEY)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

async function requireOwnedConversation(
  conversationId: string,
  admin?: SupabaseClient
): Promise<string> {
  if (!isSupabaseConfigured()) {
    const owned = fallbackFindOwnedConversation(conversationId);
    if (!owned) throw new ConversationNotFoundError();
    return owned;
  }

  const client = admin ?? createAdminClient();
  const owned = await findOwnedConversationId(client, conversationId);
  if (!owned) throw new ConversationNotFoundError();
  return owned;
}

export async function getOrCreateConversation(
  conversationId?: string
): Promise<string> {
  if (!isSupabaseConfigured()) {
    if (conversationId) {
      return requireOwnedConversation(conversationId);
    }
    return fallbackGetOrCreateConversation();
  }

  const admin = createAdminClient();

  if (conversationId) {
    return requireOwnedConversation(conversationId, admin);
  }

  const { data, error } = await admin
    .from("chat_conversations")
    .insert({ owner_key: AURO_OWNER_KEY, title: "Conversación con Auro" })
    .select("id")
    .single();

  if (error) {
    throw error;
  }
  return data.id;
}

export async function loadMessages(
  conversationId: string,
  limit = 40
): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured()) {
    await requireOwnedConversation(conversationId);
    return fallbackLoadMessages(conversationId, limit);
  }

  const admin = createAdminClient();
  await requireOwnedConversation(conversationId, admin);

  const { data, error } = await admin
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }
  return (data ?? []) as ChatMessage[];
}

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  metadata: Record<string, unknown> = {}
) {
  if (!isSupabaseConfigured()) {
    await requireOwnedConversation(conversationId);
    return fallbackSaveMessage(conversationId, role, content, metadata);
  }

  const admin = createAdminClient();
  await requireOwnedConversation(conversationId, admin);

  const { data, error } = await admin
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  const { data: touched, error: touchError } = await admin
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("owner_key", AURO_OWNER_KEY)
    .select("id")
    .maybeSingle();

  if (touchError) {
    throw touchError;
  }
  if (!touched) {
    throw new ConversationNotFoundError();
  }

  return data as ChatMessage;
}
