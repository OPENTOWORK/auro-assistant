-- ============================================================
-- AURO — Project intelligence (aditivo)
-- ============================================================
-- Extiende projects y tasks para que el motor pueda razonar
-- sobre objetivo, plazos, siguiente paso, bloqueos y actividad.
--
-- Independiente del historial remoto (puede estar vacío).
-- Idempotente: ADD COLUMN IF NOT EXISTS, DROP TRIGGER IF EXISTS,
-- CREATE OR REPLACE FUNCTION, CREATE INDEX IF NOT EXISTS.
-- No recrea tablas. No borra columnas ni datos.
-- No toca owner_key, RLS, approvals ni tablas legacy.
-- ============================================================

-- ------------------------------------------------------------
-- projects: columnas nuevas
-- ------------------------------------------------------------

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS objective TEXT;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deadline DATE;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS next_action TEXT;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Filas existentes: updated_at → created_at → now().
-- Si la columna acaba de crearse con NULL, esto las rellena.
UPDATE public.projects
   SET last_activity_at = COALESCE(last_activity_at, updated_at, created_at, now())
 WHERE last_activity_at IS NULL;

ALTER TABLE public.projects
  ALTER COLUMN last_activity_at SET DEFAULT now();

ALTER TABLE public.projects
  ALTER COLUMN last_activity_at SET NOT NULL;

COMMENT ON COLUMN public.projects.objective IS
  'Resultado concreto que se quiere conseguir con el proyecto.';

COMMENT ON COLUMN public.projects.deadline IS
  'Fecha objetivo del proyecto.';

COMMENT ON COLUMN public.projects.next_action IS
  'Siguiente acción concreta que desbloquea o hace avanzar el proyecto.';

COMMENT ON COLUMN public.projects.blocked_reason IS
  'Motivo actual por el que el proyecto no puede avanzar. NULL si no hay bloqueo explícito.';

COMMENT ON COLUMN public.projects.last_activity_at IS
  'Último momento de actividad conocida del proyecto (edición propia o de sus tareas).';

-- ------------------------------------------------------------
-- tasks: columnas nuevas
-- ------------------------------------------------------------

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS planned_for DATE;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_estimated_minutes_valid;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_estimated_minutes_valid
  CHECK (
    estimated_minutes IS NULL
    OR (estimated_minutes >= 1 AND estimated_minutes <= 1440)
  );

COMMENT ON COLUMN public.tasks.due_at IS
  'Deadline real de la tarea.';

COMMENT ON COLUMN public.tasks.planned_for IS
  'Día en que se pretende trabajar en la tarea. No representa una hora concreta.';

COMMENT ON COLUMN public.tasks.estimated_minutes IS
  'Minutos aproximados que requiere la tarea (1–1440).';

COMMENT ON COLUMN public.tasks.blocked_reason IS
  'Motivo concreto que impide continuar la tarea. NULL si no hay bloqueo explícito.';

COMMENT ON COLUMN public.tasks.completed_at IS
  'Momento real en que la tarea se completó.';

-- ------------------------------------------------------------
-- completed_at automático
-- ------------------------------------------------------------
-- done + completed_at NULL → now()
-- deja de estar done → completed_at NULL
-- insert done con completed_at explícito → se preserva

CREATE OR REPLACE FUNCTION public.auro_sync_task_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'done' THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auro_sync_task_completed_at ON public.tasks;
CREATE TRIGGER auro_sync_task_completed_at
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.auro_sync_task_completed_at();

-- ------------------------------------------------------------
-- last_activity_at del proyecto
-- ------------------------------------------------------------
-- A) Cualquier UPDATE del proyecto toca last_activity_at.
--    BEFORE UPDATE: no dispara otro UPDATE, no hay recursión.

CREATE OR REPLACE FUNCTION public.auro_projects_set_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_activity_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auro_projects_set_last_activity ON public.projects;
CREATE TRIGGER auro_projects_set_last_activity
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auro_projects_set_last_activity();

-- B) Crear / cambiar / reasignar / borrar una tarea toca el proyecto
--    dueño (mismo id y owner_key). Si cambia project_id, toca ambos.

CREATE OR REPLACE FUNCTION public.auro_touch_project_last_activity_from_task()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.project_id IS NOT NULL THEN
      UPDATE public.projects
         SET last_activity_at = now()
       WHERE id = OLD.project_id
         AND owner_key = OLD.owner_key;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.project_id IS NOT NULL THEN
      UPDATE public.projects
         SET last_activity_at = now()
       WHERE id = NEW.project_id
         AND owner_key = NEW.owner_key;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    IF OLD.project_id IS NOT NULL THEN
      UPDATE public.projects
         SET last_activity_at = now()
       WHERE id = OLD.project_id
         AND owner_key = OLD.owner_key;
    END IF;
    IF NEW.project_id IS NOT NULL THEN
      UPDATE public.projects
         SET last_activity_at = now()
       WHERE id = NEW.project_id
         AND owner_key = NEW.owner_key;
    END IF;
  ELSIF NEW.project_id IS NOT NULL THEN
    UPDATE public.projects
       SET last_activity_at = now()
     WHERE id = NEW.project_id
       AND owner_key = NEW.owner_key;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auro_tasks_touch_project_activity ON public.tasks;
CREATE TRIGGER auro_tasks_touch_project_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.auro_touch_project_last_activity_from_task();

-- ------------------------------------------------------------
-- Índices para consultas del motor
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_projects_owner_status_last_activity
  ON public.projects (owner_key, status, last_activity_at);

CREATE INDEX IF NOT EXISTS idx_projects_owner_deadline
  ON public.projects (owner_key, deadline)
  WHERE deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_owner_status_planned_for
  ON public.tasks (owner_key, status, planned_for);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_due_at
  ON public.tasks (owner_key, due_at)
  WHERE due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_owner_project_status
  ON public.tasks (owner_key, project_id, status);
