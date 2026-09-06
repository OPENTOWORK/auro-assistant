import { z } from "zod";
import {
  taskPrioritySchema,
  taskSourceSchema,
  taskStatusSchema,
} from "@/lib/validations";

export const ACTION_TYPES = [
  "create_task",
  "update_task_status",
  "create_calendar_event",
  "prepare_email_reply",
  "set_project_focus",
  "save_memory",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export const actionTypeSchema = z.enum(ACTION_TYPES);

const labelSchema = z
  .string()
  .trim()
  .min(1, "El resumen es obligatorio")
  .max(200, "El resumen es demasiado largo");

const optionalUuid = z.preprocess((value) => {
  if (value === "" || value === undefined) return null;
  return value;
}, z.string().uuid().nullable());

const optionalText = (max: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === "") return null;
    return value;
  }, z.string().trim().max(max).nullable());

function parseDateTime(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateTimeSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .refine((value) => parseDateTime(value) !== null, "Fecha/hora no válida");

export const MEMORY_CATEGORIES = [
  "preferences",
  "priorities",
  "routines",
  "instructions",
  "identity",
  "notes",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const createTaskPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: optionalText(2000),
    priority: taskPrioritySchema.default("medium"),
    source: taskSourceSchema.default("manual"),
    project_id: optionalUuid.optional(),
  })
  .strict();

export const updateTaskStatusPayloadSchema = z
  .object({
    task_id: z.string().uuid(),
    status: taskStatusSchema,
  })
  .strict();

export const createCalendarEventPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: optionalText(2000),
    start_at: dateTimeSchema,
    end_at: dateTimeSchema,
    all_day: z.boolean().optional().default(false),
    calendar_name: z.string().trim().min(1).max(80).optional().default("Principal"),
    location: optionalText(300),
    project_id: optionalUuid.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const start = parseDateTime(value.start_at);
    const end = parseDateTime(value.end_at);
    if (start && end && end.getTime() <= start.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_at"],
        message: "end_at debe ser posterior a start_at",
      });
    }
  });

export const prepareEmailReplyPayloadSchema = z
  .object({
    draft: z.string().trim().min(1).max(8000),
  })
  .strict();

export const setProjectFocusPayloadSchema = z
  .object({
    project_id: optionalUuid.optional(),
    project_name: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.project_id && !value.project_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["project_id"],
        message: "Se requiere project_id o project_name",
      });
    }
  });

export const saveMemoryPayloadSchema = z
  .object({
    category: z.enum(MEMORY_CATEGORIES),
    key: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9._-]+$/, "Clave de memoria no válida"),
    value: z.string().trim().min(1).max(2000),
  })
  .strict();

const proposeActionBase = {
  label: labelSchema,
};

export const proposeActionSchema = z.discriminatedUnion("action_type", [
  z
    .object({
      ...proposeActionBase,
      action_type: z.literal("create_task"),
      payload: createTaskPayloadSchema,
    })
    .strict(),
  z
    .object({
      ...proposeActionBase,
      action_type: z.literal("update_task_status"),
      payload: updateTaskStatusPayloadSchema,
    })
    .strict(),
  z
    .object({
      ...proposeActionBase,
      action_type: z.literal("create_calendar_event"),
      payload: createCalendarEventPayloadSchema,
    })
    .strict(),
  z
    .object({
      ...proposeActionBase,
      action_type: z.literal("prepare_email_reply"),
      payload: prepareEmailReplyPayloadSchema,
    })
    .strict(),
  z
    .object({
      ...proposeActionBase,
      action_type: z.literal("set_project_focus"),
      payload: setProjectFocusPayloadSchema,
    })
    .strict(),
  z
    .object({
      ...proposeActionBase,
      action_type: z.literal("save_memory"),
      payload: saveMemoryPayloadSchema,
    })
    .strict(),
]);

export type ProposedAction = z.infer<typeof proposeActionSchema>;
export type ActionPayload = ProposedAction["payload"];

export const chatMessageRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(10000),
    conversationId: z.string().uuid().optional(),
  })
  .strict();

export const conversationIdQuerySchema = z.string().uuid();

export const assistantActionDecisionSchema = z
  .object({
    actionId: z.string().uuid(),
    decision: z.enum(["confirm", "cancel"]),
  })
  .strict();

export interface ActionValidationIssue {
  path: string;
  message: string;
}

export function formatActionIssues(error: z.ZodError): ActionValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function parseProposedAction(input: unknown):
  | { ok: true; data: ProposedAction }
  | { ok: false; details: ActionValidationIssue[] } {
  const parsed = proposeActionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, details: formatActionIssues(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}
