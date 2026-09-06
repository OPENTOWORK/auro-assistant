import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import {
  fallbackGetOrCreateConversation,
  fallbackLoadMessages,
  fallbackSaveMessage,
  isMissingTableError,
} from "@/lib/assistant/fallback-store";
import type { ChatMessage } from "@/types/assistant";

export async function getOrCreateConversation(
  conversationId?: string
): Promise<string> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return fallbackGetOrCreateConversation(conversationId);
  }

  const admin = createAdminClient();

  if (conversationId) {
    const { data, error } = await admin
      .from("chat_conversations")
      .select("id")
      .eq("id", conversationId)
      .single();
    if (data?.id) return data.id;
    if (error && !isMissingTableError(error)) throw error;
  }

  const { data, error } = await admin
    .from("chat_conversations")
    .insert({ owner_key: AURO_OWNER_KEY, title: "Conversación con Auro" })
    .select("id")
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return fallbackGetOrCreateConversation(conversationId);
    }
    throw error;
  }
  return data.id;
}

export async function loadMessages(
  conversationId: string,
  limit = 40
): Promise<ChatMessage[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return fallbackLoadMessages(conversationId, limit);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) {
      return fallbackLoadMessages(conversationId, limit);
    }
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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return fallbackSaveMessage(conversationId, role, content, metadata);
  }

  const admin = createAdminClient();
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
    if (isMissingTableError(error)) {
      return fallbackSaveMessage(conversationId, role, content, metadata);
    }
    throw error;
  }

  await admin
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data as ChatMessage;
}
