-- ============================================================
-- AURO — Harden project intelligence functions
-- ============================================================
-- Esta migración REFLEJA un cambio YA aplicado en el remoto
-- de Supabase (versión 20260906132406,
-- nombre harden_project_intelligence_functions).
--
-- Corrige el advisor function_search_path_mutable fijando
-- search_path vacío en las tres funciones nuevas de
-- project_intelligence. La lógica funcional no cambia:
-- los cuerpos ya usan identificadores calificados public.*.
--
-- No toca auro_set_updated_at, auro_slugify ni
-- tasks_set_updated_at (warnings anteriores, fase propia).
-- ============================================================

ALTER FUNCTION public.auro_sync_task_completed_at()
  SET search_path = '';

ALTER FUNCTION public.auro_projects_set_last_activity()
  SET search_path = '';

ALTER FUNCTION public.auro_touch_project_last_activity_from_task()
  SET search_path = '';
