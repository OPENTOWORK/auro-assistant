import type { FunctionTool } from "openai/resources/responses/responses";

export const ASSISTANT_TOOLS: FunctionTool[] = [
  {
    type: "function",
    name: "get_projects",
    description:
      "Lista los proyectos del usuario con prioridad, estado y descripción.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "get_tasks",
    description:
      "Lista tareas pendientes, en progreso o esperando aprobación. Opcionalmente filtra por proyecto.",
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
          enum: [
            "create_task",
            "update_task_status",
            "create_calendar_event",
            "prepare_email_reply",
            "set_project_focus",
            "save_memory",
          ],
        },
        label: {
          type: "string",
          description: "Resumen corto en español de la acción propuesta",
        },
        payload: {
          type: "object",
          description: "Datos necesarios para ejecutar la acción",
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

export const ACTION_LABELS: Record<string, string> = {
  create_task: "Crear tarea",
  update_task_status: "Actualizar tarea",
  create_calendar_event: "Crear evento",
  prepare_email_reply: "Preparar respuesta de correo",
  set_project_focus: "Cambiar foco de proyecto",
  save_memory: "Guardar en memoria",
};
