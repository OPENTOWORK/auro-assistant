-- ============================================================
-- Auro Personal Assistant — Esquema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------

CREATE TYPE task_source AS ENUM (
  'gmail',
  'dralo',
  'youtube',
  'training',
  'invoice',
  'manual'
);

CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress',
  'waiting_approval',
  'done',
  'rejected'
);

CREATE TYPE approval_action_type AS ENUM (
  'send_email',
  'create_client',
  'update_database',
  'publish_content'
);

CREATE TYPE approval_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE project_type AS ENUM (
  'education',
  'recruitment',
  'ecommerce',
  'wellness',
  'youtube',
  'patent',
  'fitness',
  'brand'
);

CREATE TYPE project_status AS ENUM (
  'in_progress',
  'established',
  'active',
  'paused'
);

-- ------------------------------------------------------------
-- TABLA: projects
-- ------------------------------------------------------------

CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  type        project_type NOT NULL,
  status      project_status NOT NULL DEFAULT 'active',
  priority    INTEGER NOT NULL DEFAULT 99,
  icon        TEXT DEFAULT '📁',
  color       TEXT DEFAULT '#3b82f6',
  url         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: tasks
-- ------------------------------------------------------------

CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  description   TEXT,
  source        task_source NOT NULL DEFAULT 'manual',
  priority      task_priority NOT NULL DEFAULT 'medium',
  status        task_status NOT NULL DEFAULT 'pending',
  ai_summary    TEXT,
  suggested_action TEXT,
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: approvals
-- ------------------------------------------------------------

CREATE TABLE approvals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id          UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action_type      approval_action_type NOT NULL,
  proposed_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status           approval_status NOT NULL DEFAULT 'pending',
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: alerts (alertas urgentes del dashboard)
-- ------------------------------------------------------------

CREATE TABLE alerts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL,
  message    TEXT,
  severity   TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  source     TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: leads (leads nuevos)
-- ------------------------------------------------------------

CREATE TABLE leads (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  source     TEXT,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'lost')),
  notes      TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: automations (estado de automatizaciones n8n)
-- ------------------------------------------------------------

CREATE TABLE automations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  workflow_id   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at   TIMESTAMPTZ,
  last_status   TEXT DEFAULT 'unknown' CHECK (last_status IN ('success', 'error', 'running', 'unknown')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: important_emails (emails importantes pendientes)
-- ------------------------------------------------------------

CREATE TABLE important_emails (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject      TEXT NOT NULL,
  sender       TEXT NOT NULL,
  snippet      TEXT,
  gmail_id     TEXT UNIQUE,
  is_processed BOOLEAN NOT NULL DEFAULT FALSE,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLA: calendar_events (eventos de Google Calendar)
-- ------------------------------------------------------------

CREATE TABLE calendar_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  all_day         BOOLEAN NOT NULL DEFAULT FALSE,
  calendar_name   TEXT NOT NULL DEFAULT 'Principal',
  location        TEXT,
  html_link       TEXT,
  google_event_id TEXT UNIQUE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TRIGGER: updated_at automático en tasks
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- ÍNDICES
-- ------------------------------------------------------------

CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_slug ON projects(slug);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_source ON tasks(source);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

CREATE INDEX idx_approvals_task_id ON approvals(task_id);
CREATE INDEX idx_approvals_status ON approvals(status);

CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_important_emails_processed ON important_emails(is_processed);
CREATE INDEX idx_calendar_events_start ON calendar_events(start_at);
CREATE INDEX idx_calendar_events_project ON calendar_events(project_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- Solo usuarios autenticados pueden acceder
-- ------------------------------------------------------------

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE important_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Políticas: usuarios autenticados tienen acceso completo
CREATE POLICY "auth_users_all_projects" ON projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_users_all_tasks" ON tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_users_all_approvals" ON approvals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_users_all_alerts" ON alerts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_users_all_leads" ON leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_users_all_automations" ON automations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_users_all_emails" ON important_emails
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_users_all_calendar" ON calendar_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- DATOS DE EJEMPLO (opcional — descomentar para probar)
-- ------------------------------------------------------------

INSERT INTO projects (slug, name, description, type, status, priority, icon, color) VALUES
  ('dralo',                  'Dralo',                  'Web de inglés',                              'education',   'in_progress', 1, '🇬🇧', '#3b82f6'),
  ('open-to-work',           'Open To Work',           'ETT ya asentada',                            'recruitment', 'established', 2, '💼', '#10b981'),
  ('agarrame-las-pokebolas', 'Agárrame las Pokebolas', 'Empresa de impresión en 3D',                 'ecommerce',   'active',      3, '🖨️', '#f59e0b'),
  ('estoicoycalistenico',    'Estoicoycalistenico',    'Proyecto en pausa — retomar en el futuro',   'wellness',    'paused',      4, '🧘', '#8b5cf6'),
  ('cuento-que-fue',         'Cuento Que Fue',         'Canal de YouTube',                                      'youtube',     'active',      5, '📺', '#ef4444'),
  ('trabaja-la-mente',       'Trabaja la Mente',       'Canal de YouTube',                                      'youtube',     'active',      6, '🧠', '#ec4899'),
  ('tap-up',                 'Tap-up',                 'Patente que quiero desarrollar',                        'patent',      'in_progress', 7, '💡', '#06b6d4'),
  ('tufitmentor360',         'TuFitMentor360',         'Empresa de entrenamientos personales a domicilio',      'fitness',     'in_progress', 8, '💪', '#f97316'),
  ('hype',                   'Hype',                   'Proyecto Hype',                                         'brand',       'in_progress', 9, '🔥', '#a855f7');

/*
INSERT INTO tasks (title, description, source, priority, status, ai_summary, suggested_action) VALUES
  ('Responder email de cliente VIP', 'El cliente pregunta por presupuesto de proyecto web', 'gmail', 'urgent', 'waiting_approval', 'Cliente VIP solicita presupuesto urgente para proyecto e-commerce.', 'Enviar propuesta con rango 3.000-5.000€'),
  ('Revisar factura pendiente', 'Factura #2024-089 de proveedor hosting', 'invoice', 'high', 'pending', 'Factura de hosting por 89€ pendiente de pago.', 'Aprobar pago y registrar en contabilidad'),
  ('Lead nuevo desde WhatsApp', 'Interesado en formación de IA', 'dralo', 'medium', 'pending', 'Lead interesado en curso de IA para empresas.', 'Enviar información del curso y agendar llamada'),
  ('Video de YouTube para revisar', 'Tutorial sobre automatización con n8n', 'youtube', 'low', 'pending', 'Video relevante sobre integración n8n + OpenAI.', 'Guardar en biblioteca de referencias');

INSERT INTO approvals (task_id, action_type, proposed_payload, status)
  SELECT id, 'send_email', '{"to": "cliente@empresa.com", "subject": "Presupuesto proyecto web", "body": "Estimado cliente..."}'::jsonb, 'pending'
  FROM tasks WHERE title = 'Responder email de cliente VIP';

INSERT INTO alerts (title, message, severity, source) VALUES
  ('Factura vence hoy', 'La factura #2024-089 del hosting vence hoy', 'critical', 'invoice'),
  ('Workflow n8n falló', 'El workflow Gmail→IA falló a las 08:30', 'warning', 'n8n');

INSERT INTO leads (name, email, phone, source) VALUES
  ('María García', 'maria@empresa.com', '+34600123456', 'whatsapp'),
  ('Carlos Ruiz', 'carlos@startup.io', NULL, 'gmail');

INSERT INTO automations (name, description, workflow_id, is_active, last_status) VALUES
  ('Gmail → IA → Tareas', 'Procesa emails importantes y genera tareas', 'wf_gmail_ai', true, 'success'),
  ('WhatsApp → Leads', 'Captura leads desde WhatsApp Business', 'wf_wa_leads', true, 'success'),
  ('Facturas → Recordatorio', 'Alerta de facturas pendientes', 'wf_invoice_alert', true, 'error');

INSERT INTO important_emails (subject, sender, snippet) VALUES
  ('RE: Propuesta proyecto Q2', 'cliente.vip@empresa.com', 'Necesitamos la propuesta antes del viernes...'),
  ('Factura hosting marzo', 'facturas@hosting.com', 'Adjuntamos factura correspondiente al mes de marzo...');
*/
