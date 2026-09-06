-- ============================================================
-- AURO — Esquema núcleo consolidado
-- ============================================================
-- Migración del esquema heredado al esquema canónico. Idempotente:
-- se puede reaplicar sin efectos secundarios.
--
-- Decisiones de diseño:
--
-- 1. `projects` es la tabla canónica de proyectos. Antes se usaba `Proyectos`,
--    creada a mano con solo (id, name, description); el resto de metadatos
--    (slug, type, status, priority, icon, color) no se persistía y se
--    adivinaba en runtime por coincidencia difusa de nombres contra una
--    constante del código. Los proyectos se copian PRESERVANDO SU UUID, de
--    modo que las referencias existentes siguen siendo válidas.
--
-- 2. `Proyectos` NO se borra. Queda como red de seguridad hasta confirmar
--    que todo funciona. Eliminarla es un paso manual posterior.
--
-- 3. `project_id` pasa de TEXT a UUID con clave foránea real. Los valores que
--    no sean UUID válidos o que apunten a un proyecto inexistente se ponen a
--    NULL antes de convertir, para que la conversión no pueda fallar.
--
-- 4. `owner_key` se añade a todas las tablas para permitir multiusuario en el
--    futuro sin una migración masiva. Hoy NO se filtra por él en las tablas
--    de dominio: el sistema es de un solo usuario.
--
-- 5. `recurring_completions` persiste las completiones de tareas recurrentes,
--    que antes vivían solo en localStorage. Es requisito del Decision Engine
--    y del Memory Engine: los patrones se aprenden de estos datos.
--
-- 6. Seguridad: se eliminan las políticas `USING (true)` y los permisos de
--    los roles `anon` y `authenticated`. Todo el acceso de la aplicación es
--    server-side con service role. La clave anon viaja al navegador, así que
--    darle permisos de lectura y escritura sobre todo era un agujero real.
-- ============================================================

-- ------------------------------------------------------------
-- Utilidades
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION auro_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auro_slugify(input TEXT)
RETURNS TEXT AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(translate(
      coalesce(input, ''),
      'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
      'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
    )),
    '[^a-z0-9]+', '-', 'g'
  ));
$$ LANGUAGE sql IMMUTABLE;

-- ------------------------------------------------------------
-- projects (canónica)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key   TEXT NOT NULL DEFAULT 'default',
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL DEFAULT 'brand'
              CHECK (type IN ('education', 'recruitment', 'ecommerce',
                              'wellness', 'youtube', 'patent', 'fitness',
                              'brand')),
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('in_progress', 'established', 'active',
                                'paused')),
  priority    INTEGER NOT NULL DEFAULT 99,
  icon        TEXT NOT NULL DEFAULT 'folder',
  color       TEXT NOT NULL DEFAULT '#3b82f6',
  url         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT projects_owner_slug_unique UNIQUE (owner_key, slug)
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_priority
  ON projects(owner_key, priority);

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION auro_set_updated_at();

-- Copia desde `Proyectos` preservando el UUID. Los metadatos se asignan por
-- id explícito: ya no hay coincidencia difusa de nombres. Un proyecto nuevo
-- que no esté en el mapa recibe valores por defecto razonables.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'Proyectos'
  ) THEN
    INSERT INTO projects (id, slug, name, description, type, status,
                          priority, icon, color, created_at)
    SELECT p.id,
           COALESCE(m.slug, auro_slugify(p.name)),
           p.name,
           COALESCE(NULLIF(btrim(COALESCE(p.description, '')), ''), m.description),
           COALESCE(m.type, 'brand'),
           COALESCE(m.status, 'active'),
           COALESCE(m.priority, 99),
           COALESCE(m.icon, 'folder'),
           COALESCE(m.color, '#3b82f6'),
           p.created_at
      FROM "Proyectos" p
      LEFT JOIN (VALUES
        ('8c624ea8-81ed-4e40-b9ad-c54653a85587'::uuid, 'dralo',
         'Web de inglés', 'education', 'in_progress', 1, 'languages', '#3b82f6'),
        ('517c7f58-3b33-42ab-9750-73db501da6f4'::uuid, 'open-to-work',
         'ETT ya asentada', 'recruitment', 'established', 2, 'briefcase', '#10b981'),
        ('cfd20a1a-3126-418c-8e25-09188ab43ca6'::uuid, 'agarrame-las-pokebolas',
         'Empresa de impresión en 3D', 'ecommerce', 'active', 3, 'printer', '#f59e0b'),
        ('50842b52-a1ac-44cb-8681-678a44069e2c'::uuid, 'estoicoycalistenico',
         'Proyecto en pausa — retomar en el futuro', 'wellness', 'paused', 4, 'heart', '#8b5cf6'),
        ('77678e4c-433e-43d8-afd8-6719823c6076'::uuid, 'cuento-que-fue',
         'Canal de YouTube de historias y anécdotas', 'youtube', 'active', 5, 'tv', '#ef4444'),
        ('6f95920f-846b-4045-9859-1770c5b7c54b'::uuid, 'trabaja-la-mente',
         'Canal de YouTube sobre mente, hábitos y productividad', 'youtube', 'active', 6, 'brain', '#ec4899'),
        ('1c0881fd-c84b-42ae-8d31-78d092b86555'::uuid, 'tap-up',
         'Patente que quiero desarrollar', 'patent', 'in_progress', 7, 'lightbulb', '#06b6d4'),
        ('4c0f0635-a488-489c-96de-86d3083b4a22'::uuid, 'tufitmentor360',
         'App de fitness y mentoría', 'fitness', 'active', 8, 'dumbbell', '#84cc16'),
        ('3772fd44-fe54-48d9-9af0-eec7ed6170f3'::uuid, 'hype',
         'Marca personal y contenido', 'brand', 'active', 9, 'flame', '#f97316'),
        ('6035ef9e-8531-4cf8-a7ed-01f915f23477'::uuid, 'auro',
         'Sistema operativo personal', 'brand', 'in_progress', 10, 'sparkles', '#a855f7')
      ) AS m(id, slug, description, type, status, priority, icon, color)
        ON m.id = p.id
     ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ------------------------------------------------------------
-- Tablas heredadas: añadir owner_key y convertir project_id a UUID + FK
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  source           TEXT NOT NULL DEFAULT 'manual',
  priority         TEXT NOT NULL DEFAULT 'medium',
  status           TEXT NOT NULL DEFAULT 'pending',
  ai_summary       TEXT,
  suggested_action TEXT,
  project_id       UUID,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  message    TEXT,
  severity   TEXT NOT NULL DEFAULT 'info',
  is_read    BOOLEAN NOT NULL DEFAULT false,
  source     TEXT,
  project_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recurring_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  frequency    TEXT NOT NULL,
  schedule_day INTEGER NOT NULL DEFAULT 1,
  project_id   UUID,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  all_day         BOOLEAN NOT NULL DEFAULT false,
  calendar_name   TEXT NOT NULL DEFAULT 'Principal',
  location        TEXT,
  html_link       TEXT,
  google_event_id TEXT UNIQUE,
  project_id      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS important_emails (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject      TEXT NOT NULL,
  sender       TEXT NOT NULL,
  snippet      TEXT,
  gmail_id     TEXT UNIQUE,
  is_processed BOOLEAN NOT NULL DEFAULT false,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE
  t TEXT;
  coltype TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tasks', 'alerts', 'recurring_tasks', 'calendar_events', 'important_emails'
  ])
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS owner_key TEXT NOT NULL DEFAULT ''default''', t);
  END LOOP;

  -- project_id: limpiar valores inválidos, convertir a UUID y añadir la FK.
  FOR t IN SELECT unnest(ARRAY[
    'tasks', 'alerts', 'recurring_tasks', 'calendar_events'
  ])
  LOOP
    SELECT data_type INTO coltype
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = t
       AND column_name = 'project_id';

    IF coltype = 'text' THEN
      EXECUTE format(
        'UPDATE %I SET project_id = NULL
          WHERE project_id IS NOT NULL
            AND project_id !~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''', t);
      EXECUTE format(
        'UPDATE %I SET project_id = NULL
          WHERE project_id IS NOT NULL
            AND project_id::uuid NOT IN (SELECT id FROM projects)', t);
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN project_id TYPE UUID USING project_id::uuid', t);
    ELSE
      EXECUTE format(
        'UPDATE %I SET project_id = NULL
          WHERE project_id IS NOT NULL
            AND project_id NOT IN (SELECT id FROM projects)', t);
    END IF;

    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
                   t, t || '_project_id_fkey');
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (project_id)
        REFERENCES projects(id) ON DELETE SET NULL', t, t || '_project_id_fkey');
  END LOOP;
END $$;

-- Columnas y restricciones que faltaban en el esquema heredado.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE recurring_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION auro_set_updated_at();

DROP TRIGGER IF EXISTS recurring_tasks_updated_at ON recurring_tasks;
CREATE TRIGGER recurring_tasks_updated_at
  BEFORE UPDATE ON recurring_tasks
  FOR EACH ROW EXECUTE FUNCTION auro_set_updated_at();

-- schedule_day: 0-6 (domingo=0) para semanales; 1-31 para mensuales,
-- donde 31 significa "último día del mes".
ALTER TABLE recurring_tasks DROP CONSTRAINT IF EXISTS recurring_tasks_schedule_day_valid;
ALTER TABLE recurring_tasks ADD CONSTRAINT recurring_tasks_schedule_day_valid CHECK (
  (frequency = 'weekly'  AND schedule_day BETWEEN 0 AND 6) OR
  (frequency = 'monthly' AND schedule_day BETWEEN 1 AND 31)
);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_status_created
  ON tasks(owner_key, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_alerts_owner_unread
  ON alerts(owner_key, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_owner_active
  ON recurring_tasks(owner_key, is_active);
CREATE INDEX IF NOT EXISTS idx_calendar_events_owner_end
  ON calendar_events(owner_key, end_at);
CREATE INDEX IF NOT EXISTS idx_important_emails_owner_pending
  ON important_emails(owner_key, is_processed, received_at DESC);

-- ------------------------------------------------------------
-- recurring_completions (nueva)
-- ------------------------------------------------------------
-- period_key identifica el periodo completado, no la fecha exacta:
--   semanales -> '2026-W31' (semana ISO)
--   mensuales -> '2026-08'
-- La unicidad por (tarea, periodo) hace la escritura idempotente.

CREATE TABLE IF NOT EXISTS recurring_completions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key         TEXT NOT NULL DEFAULT 'default',
  recurring_task_id UUID NOT NULL REFERENCES recurring_tasks(id) ON DELETE CASCADE,
  period_key        TEXT NOT NULL,
  completed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recurring_completions_unique UNIQUE (recurring_task_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_recurring_completions_period
  ON recurring_completions(owner_key, period_key);

-- ------------------------------------------------------------
-- leads
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key  TEXT NOT NULL DEFAULT 'default',
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  source     TEXT,
  status     TEXT NOT NULL DEFAULT 'new'
             CHECK (status IN ('new', 'contacted', 'qualified', 'lost')),
  notes      TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_owner_status
  ON leads(owner_key, status, created_at DESC);

-- ------------------------------------------------------------
-- approvals (usada por el webhook de n8n)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS approvals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action_type      TEXT NOT NULL,
  proposed_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status           TEXT NOT NULL DEFAULT 'pending',
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE approvals ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_approvals_task ON approvals(task_id);

-- ------------------------------------------------------------
-- Asistente: conversaciones, mensajes, memoria y acciones
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key  TEXT NOT NULL DEFAULT 'default',
  title      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_owner
  ON chat_conversations(owner_key, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS user_memory (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key  TEXT NOT NULL DEFAULT 'default',
  category   TEXT NOT NULL,
  memory_key TEXT NOT NULL,
  value      TEXT NOT NULL,
  confirmed  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_memory_unique UNIQUE (owner_key, category, memory_key)
);

CREATE TABLE IF NOT EXISTS pending_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key       TEXT NOT NULL DEFAULT 'default',
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  action_type     TEXT NOT NULL,
  label           TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'cancelled',
                                    'executed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_actions_owner_status
  ON pending_actions(owner_key, status, created_at DESC);

-- ------------------------------------------------------------
-- Seguridad
-- ------------------------------------------------------------
-- RLS activado y políticas permisivas eliminadas. El service role ignora RLS,
-- así que la aplicación sigue funcionando; anon y authenticated pierden el
-- acceso directo que tenían.

DO $$
DECLARE
  t TEXT;
  pol RECORD;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'projects', 'tasks', 'alerts', 'recurring_tasks',
    'recurring_completions', 'calendar_events', 'important_emails',
    'leads', 'approvals', 'chat_conversations', 'chat_messages',
    'user_memory', 'pending_actions'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
    END LOOP;

    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE %I TO service_role', t);
  END LOOP;
END $$;
