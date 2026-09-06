-- Gmail y Google Calendar → tablas para Auro (sin datos de ejemplo)

CREATE TABLE IF NOT EXISTS important_emails (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject      TEXT NOT NULL,
  sender       TEXT NOT NULL,
  snippet      TEXT,
  gmail_id     TEXT UNIQUE,
  is_processed BOOLEAN NOT NULL DEFAULT FALSE,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_important_emails_processed
  ON important_emails(is_processed, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_important_emails_gmail_id
  ON important_emails(gmail_id);

ALTER TABLE important_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_important_emails" ON important_emails;
CREATE POLICY "service_role_important_emails"
  ON important_emails FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  all_day         BOOLEAN NOT NULL DEFAULT FALSE,
  calendar_name   TEXT NOT NULL DEFAULT 'Principal',
  location        TEXT,
  html_link       TEXT,
  google_event_id TEXT UNIQUE,
  project_id      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start
  ON calendar_events(start_at);

CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id
  ON calendar_events(google_event_id);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_calendar_events" ON calendar_events;
CREATE POLICY "service_role_calendar_events"
  ON calendar_events FOR ALL USING (true) WITH CHECK (true);
