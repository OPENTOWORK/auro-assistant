-- ============================================================
-- AURO — Proactive daily briefing runs (aditivo)
-- ============================================================
-- Persiste UNA ejecución de Daily Briefing por owner y día
-- lógico (AURO_TIMEZONE). No duplica tareas, proyectos ni
-- scores como columnas. El snapshot JSONB es auditoría e
-- idempotencia; Supabase sigue siendo la fuente de verdad.
--
-- Idempotente: CREATE TABLE IF NOT EXISTS, DO + pg_constraint,
-- CREATE UNIQUE INDEX IF NOT EXISTS, CREATE OR REPLACE
-- FUNCTION, DROP TRIGGER IF EXISTS, CREATE INDEX IF NOT
-- EXISTS, COMMENT.
--
-- Concurrencia (FASE 1D.2): dos INSERT del mismo
-- (owner_key, briefing_date) → una fila; la otra recibe
-- unique violation y se interpreta como "briefing ya
-- generado", no como error fatal.
--
-- RLS enabled. Browser policies: ninguna.
-- Acceso de primera versión: service role server-side.
-- No grants a anon ni authenticated.
--
-- No toca alerts, automation_logs, approvals, gmail_messages
-- ni tablas legacy. No añade columnas de delivery ni LLM.
-- ============================================================

-- ------------------------------------------------------------
-- Tabla
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.daily_briefing_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key     TEXT NOT NULL,
  briefing_date DATE NOT NULL,
  timezone      TEXT NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL,
  payload       JSONB NOT NULL,
  summary       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Unique (owner_key, briefing_date)
-- ------------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS no añade el constraint si la
-- tabla ya existía sin él. El índice UNIQUE es la garantía
-- de idempotencia concurrente; el DO alinea el constraint
-- nombrado sin DROP (no abre ventana sin protección).

CREATE UNIQUE INDEX IF NOT EXISTS daily_briefing_runs_owner_date_key
  ON public.daily_briefing_runs (owner_key, briefing_date);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'daily_briefing_runs_owner_date_key'
       AND conrelid = 'public.daily_briefing_runs'::regclass
  ) THEN
    ALTER TABLE public.daily_briefing_runs
      ADD CONSTRAINT daily_briefing_runs_owner_date_key
      UNIQUE USING INDEX daily_briefing_runs_owner_date_key;
  END IF;
END
$$;

-- ------------------------------------------------------------
-- CHECK: payload es un objeto JSON
-- ------------------------------------------------------------
-- El contrato DailyBriefing lo valida TypeScript.
-- No se impone un JSON schema gigante en PostgreSQL.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'daily_briefing_runs_payload_object'
       AND conrelid = 'public.daily_briefing_runs'::regclass
  ) THEN
    ALTER TABLE public.daily_briefing_runs
      ADD CONSTRAINT daily_briefing_runs_payload_object
      CHECK (pg_catalog.jsonb_typeof(payload) = 'object');
  END IF;
END
$$;

-- ------------------------------------------------------------
-- updated_at: función específica y search_path seguro
-- ------------------------------------------------------------
-- No se reutiliza auro_set_updated_at(): esa función
-- existente no fija search_path y no se modifica en esta fase.

CREATE OR REPLACE FUNCTION public.auro_daily_briefing_runs_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_briefing_runs_set_updated_at
  ON public.daily_briefing_runs;

CREATE TRIGGER daily_briefing_runs_set_updated_at
  BEFORE UPDATE ON public.daily_briefing_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.auro_daily_briefing_runs_set_updated_at();

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------
-- El UNIQUE (owner_key, briefing_date) ya cubre:
--   WHERE owner_key = $1 AND briefing_date = $2
--   WHERE owner_key = $1 ORDER BY briefing_date DESC LIMIT 1
-- PostgreSQL puede recorrer el btree en ambos sentidos;
-- no hace falta un segundo índice (owner_key, briefing_date DESC).
-- generated_at extra es inútil: hay como máximo una fila por día.
-- No se crea índice redundante.

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
-- RLS enabled. Browser policies: ninguna.
-- service_role bypassa RLS; anon/authenticated no tienen
-- policy ni grants.

ALTER TABLE public.daily_briefing_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.daily_briefing_runs FROM anon, authenticated;
GRANT ALL ON TABLE public.daily_briefing_runs TO service_role;

-- ------------------------------------------------------------
-- Comments
-- ------------------------------------------------------------

COMMENT ON TABLE public.daily_briefing_runs IS
  'Ejecuciones del Daily Briefing proactivo. Una fila por owner y día lógico (AURO_TIMEZONE). Snapshot auditable para idempotencia, historial y delivery futuro. RLS enabled; browser policies: ninguna. Acceso: service role server-side.';

COMMENT ON COLUMN public.daily_briefing_runs.briefing_date IS
  'Día lógico del briefing según AURO_TIMEZONE (DATE, no timestamp). Ejemplo: 2026-09-07. Junto con owner_key garantiza un único briefing diario.';

COMMENT ON COLUMN public.daily_briefing_runs.timezone IS
  'Zona IANA usada al generar el briefing. Ejemplo: Europe/Madrid. La aplicación valida/fallback con getAuroTimezone(); PostgreSQL no valida el catálogo IANA.';

COMMENT ON COLUMN public.daily_briefing_runs.generated_at IS
  'Instante exacto (TIMESTAMPTZ) usado por el Daily Briefing al construir el snapshot.';

COMMENT ON COLUMN public.daily_briefing_runs.payload IS
  'Snapshot JSONB del objeto DailyBriefing. Debe ser un objeto (jsonb_typeof = object). El contrato completo lo valida TypeScript.';

COMMENT ON COLUMN public.daily_briefing_runs.summary IS
  'Texto determinista corto para alerta interna. No lo genera OpenAI. Sin CHECK de longitud artificial.';
