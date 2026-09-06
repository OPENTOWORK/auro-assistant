-- Auro Assistant: chat, memoria y acciones pendientes

CREATE TABLE IF NOT EXISTS chat_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key   TEXT NOT NULL DEFAULT 'default',
  title       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content           TEXT NOT NULL,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS user_memory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key   TEXT NOT NULL DEFAULT 'default',
  category    TEXT NOT NULL,
  memory_key  TEXT NOT NULL,
  value       TEXT NOT NULL,
  confirmed   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_key, category, memory_key)
);

CREATE TABLE IF NOT EXISTS pending_actions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key         TEXT NOT NULL DEFAULT 'default',
  conversation_id   UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  action_type       TEXT NOT NULL,
  label             TEXT NOT NULL,
  payload           JSONB NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'executed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_actions_owner_status
  ON pending_actions(owner_key, status);
