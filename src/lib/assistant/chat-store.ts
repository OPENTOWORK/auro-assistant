import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import { isSupabaseConfigured } from "@/lib/config";
import {
  fallbackGetOrCreateConversation,
  fallbackLoadMessages,
  fallbackSaveMessage,
} from "@/lib/assistant/fallback-store";
import type { ChatMessage } from "@/types/assistant";

export async function getOrCreateConversation(
  conversationId?: string
): Promise<string> {
  if (!isSupabaseConfigured()) {
    return fallbackGetOrCreateConversation(conversationId);
  }

  const admin = createAdminClient();

  if (conversationId) {
    const { data, error } = await admin
      .from("chat_conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id;
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
    throw error;
  }

  const { error: touchError } = await admin
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (touchError) {
    throw touchError;
  }

  return data as ChatMessage;
}
