-- Tabla de tareas para Auro (compatible con Proyectos existente, sin FK a projects)

CREATE TABLE IF NOT EXISTS tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  source           TEXT NOT NULL DEFAULT 'manual'
                   CHECK (source IN ('gmail', 'dralo', 'youtube', 'training', 'invoice', 'manual')),
  priority         TEXT NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'in_progress', 'waiting_approval', 'done', 'rejected')),
  ai_summary       TEXT,
  suggested_action TEXT,
  project_id       TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

CREATE OR REPLACE FUNCTION tasks_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION tasks_set_updated_at();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_tasks" ON tasks;
CREATE POLICY "service_role_tasks" ON tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);
