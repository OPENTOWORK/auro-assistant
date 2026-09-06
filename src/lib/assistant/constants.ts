import type { FunctionTool } from "openai/resources/responses/responses";
import { ACTION_TYPES, type ActionType } from "@/lib/assistant/action-schemas";

export const ASSISTANT_TOOLS: FunctionTool[] = [
  {
    type: "function",
    name: "get_projects",
    description:
      "Lista los proyectos del usuario con objetivo, deadline, siguiente acción, bloqueo, última actividad y señales calculadas (stalled, overdue, days_since_activity).",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "get_tasks",
    description:
      "Lista tareas abiertas con deadline, planned_for, estimación, bloqueo, completed_at y señales calculadas (overdue, planned_today). Opcionalmente filtra por proyecto.",
    parameters: {
      type: "object",
      properties: {
        project_name: {
          type: "string",
          description: "Nombre parcial del proyecto, ej: Dralo",
        },
        limit: { type: "number", description: "Máximo de tareas a devolver" },
      },
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: "function",
    name: "get_calendar_events",
    description: "Próximos eventos del calendario de Google.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: "function",
    name: "get_important_emails",
    description: "Correos con estrella en Gmail, no procesados.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: "function",
    name: "get_leads",
    description: "Leads nuevos o recientes.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: "function",
    name: "get_user_memory",
    description:
      "Memoria confirmada del usuario: nombre, preferencias, proyectos prioritarios, rutinas e instrucciones.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "propose_action",
    description:
      "Propone una acción que requiere confirmación del usuario. NO ejecuta nada directamente.",
    parameters: {
      type: "object",
      properties: {
        action_type: {
          type: "string",
          enum: [...ACTION_TYPES],
          description:
            "Tipo de acción. Solo estos valores: create_task, update_task_status, create_calendar_event, prepare_email_reply, set_project_focus, save_memory.",
        },
        label: {
          type: "string",
          description: "Resumen corto en español de la acción propuesta",
        },
        payload: {
          type: "object",
          additionalProperties: false,
          description:
            "Datos de la acción. No incluir id, owner_key, status de creación, timestamps ni metadata. create_task: {title, description?, priority (low|medium|high|urgent), source (gmail|dralo|youtube|training|invoice|manual), project_id? UUID}. update_task_status: {task_id UUID, status (pending|in_progress|waiting_approval|done|rejected)}. create_calendar_event: {title, description?, start_at ISO, end_at ISO posterior a start_at, all_day?, calendar_name?, location?, project_id? UUID}. prepare_email_reply: {draft}. set_project_focus: {project_id? UUID, project_name?}. save_memory: {category (preferences|priorities|routines|instructions|identity|notes), key, value}.",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
            },
            source: {
              type: "string",
              enum: ["gmail", "dralo", "youtube", "training", "invoice", "manual"],
            },
            project_id: { type: "string" },
            task_id: { type: "string" },
            status: {
              type: "string",
              enum: ["pending", "in_progress", "waiting_approval", "done", "rejected"],
            },
            start_at: { type: "string" },
            end_at: { type: "string" },
            all_day: { type: "boolean" },
            calendar_name: { type: "string" },
            location: { type: "string" },
            draft: { type: "string" },
            project_name: { type: "string" },
            category: {
              type: "string",
              enum: [
                "preferences",
                "priorities",
                "routines",
                "instructions",
                "identity",
                "notes",
              ],
            },
            key: { type: "string" },
            value: { type: "string" },
          },
        },
      },
      required: ["action_type", "label", "payload"],
      additionalProperties: false,
    },
    strict: false,
  },
];

export const CHAT_SUGGESTIONS = [
  "¿Qué tengo hoy?",
  "Resume mis correos destacados",
  "¿Cómo va Dralo?",
  "Crea una tarea",
  "Prepara mi día",
] as const;

export const ACTION_LABELS: Record<ActionType, string> = {
  create_task: "Crear tarea",
  update_task_status: "Actualizar tarea",
  create_calendar_event: "Crear evento",
  prepare_email_reply: "Preparar respuesta de correo",
  set_project_focus: "Cambiar foco de proyecto",
  save_memory: "Guardar en memoria",
};
