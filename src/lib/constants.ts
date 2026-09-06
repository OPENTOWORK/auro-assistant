import type {
  ApprovalActionType,
  ProjectStatus,
  ProjectType,
  RecurringFrequency,
  TaskPriority,
  TaskSource,
  TaskStatus,
} from "@/types/database";

export const TASK_SOURCE_LABELS: Record<TaskSource, string> = {
  gmail: "Gmail",
  dralo: "Dralo",
  youtube: "YouTube",
  training: "Formación",
  invoice: "Factura",
  manual: "Manual",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  waiting_approval: "Esperando aprobación",
  done: "Completada",
  rejected: "Rechazada",
};

export const APPROVAL_ACTION_LABELS: Record<ApprovalActionType, string> = {
  send_email: "Enviar email",
  create_client: "Crear cliente",
  update_database: "Actualizar base de datos",
  publish_content: "Publicar contenido",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-slate-500/15 text-slate-600 border-slate-500/25 dark:text-slate-300",
  medium: "bg-blue-500/15 text-blue-700 border-blue-500/25 dark:text-blue-300",
  high: "bg-amber-500/15 text-amber-700 border-amber-500/25 dark:text-amber-300",
  urgent: "bg-red-500/15 text-red-700 border-red-500/25 dark:text-red-300",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  waiting_approval: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  education: "Educación",
  recruitment: "Selección de personal",
  ecommerce: "E-commerce / Fabricación",
  wellness: "Bienestar",
  youtube: "YouTube",
  patent: "Patente / I+D",
  fitness: "Fitness",
  brand: "Marca / Proyecto",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  in_progress: "En proceso",
  established: "Asentada",
  active: "Activa",
  paused: "En pausa",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  in_progress: "bg-blue-500/15 text-blue-700 border-blue-500/25 dark:text-blue-300",
  established: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
  active: "bg-amber-500/15 text-amber-700 border-amber-500/25 dark:text-amber-300",
  paused: "bg-slate-500/15 text-slate-600 border-slate-500/25 dark:text-slate-400",
};

export const RECURRING_FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
};

export const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export const TASK_KIND_LABELS = {
  alert: "Alerta urgente",
  priority: "Prioritaria",
  weekly: "Semanal",
  monthly: "Mensual",
} as const;

export type TaskKind = keyof typeof TASK_KIND_LABELS;
