export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  owner_key: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserMemory {
  id: string;
  owner_key: string;
  category: string;
  memory_key: string;
  value: string;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PendingAction {
  id: string;
  owner_key: string;
  conversation_id: string | null;
  action_type: string;
  label: string;
  payload: Record<string, unknown>;
  status: "pending" | "confirmed" | "cancelled" | "executed";
  created_at: string;
  executed_at: string | null;
}
