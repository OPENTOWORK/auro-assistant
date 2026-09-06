import { z } from "zod";
import { isValidDateOnly } from "@/lib/intelligence/dates";

export const taskSourceSchema = z.enum([
  "gmail",
  "dralo",
  "youtube",
  "training",
  "invoice",
  "manual",
]);

export const taskPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

export const taskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "waiting_approval",
  "done",
  "rejected",
]);

export const projectTypeSchema = z.enum([
  "education",
  "recruitment",
  "ecommerce",
  "wellness",
  "youtube",
  "patent",
  "fitness",
  "brand",
]);

export const projectStatusSchema = z.enum([
  "in_progress",
  "established",
  "active",
  "paused",
]);

const emptyToNull = (value: unknown) => {
  if (value === "" || value === undefined) return null;
  return value;
};

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable());

const optionalDateOnly = z.preprocess(
  emptyToNull,
  z
    .string()
    .refine((value) => isValidDateOnly(value), "Fecha no válida")
    .nullable()
);

const optionalDateTime = z.preprocess(emptyToNull, z.string().refine((value) => {
  if (value === null) return true;
  return !Number.isNaN(new Date(value).getTime());
}, "Fecha/hora no válida").nullable());

const optionalMinutes = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().int().min(1).max(1440).nullable());

export const projectFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    description: z.string().optional().nullable(),
    type: projectTypeSchema,
    status: projectStatusSchema,
    priority: z.number().int().min(1),
    icon: z.string().min(1).default("folder"),
    color: z.string().min(1).default("#3b82f6"),
    slug: z.string().optional(),
    objective: optionalText(2000).optional(),
    deadline: optionalDateOnly.optional(),
    next_action: optionalText(1000).optional(),
    blocked_reason: optionalText(2000).optional(),
  })
  .strict();

const optionalUuid = z.preprocess((value) => {
  if (value === "" || value === undefined) return null;
  return value;
}, z.string().uuid().nullable());

export const createTaskSchema = z
  .object({
    title: z.string().min(1, "El título es obligatorio"),
    description: z.string().optional().nullable(),
    project_id: optionalUuid.optional(),
    project_slug: z.string().optional().nullable(),
    priority: taskPrioritySchema.default("medium"),
    source: taskSourceSchema.default("manual"),
    due_at: optionalDateTime.optional(),
    planned_for: optionalDateOnly.optional(),
    estimated_minutes: optionalMinutes.optional(),
    blocked_reason: optionalText(2000).optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: optionalText(2000).optional(),
    priority: taskPrioritySchema.optional(),
    project_id: optionalUuid.optional(),
    due_at: optionalDateTime.optional(),
    planned_for: optionalDateOnly.optional(),
    estimated_minutes: optionalMinutes.optional(),
    blocked_reason: optionalText(2000).optional(),
  })
  .strict();

export const updateTaskStatusBodySchema = z
  .object({
    status: taskStatusSchema,
  })
  .strict();

export const availableMinutesSchema = z.coerce
  .number()
  .int()
  .min(15)
  .max(720);

export const alertSeveritySchema = z.enum(["info", "warning", "critical"]);

export const createAlertSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  message: z.string().optional().nullable(),
  severity: alertSeveritySchema.default("warning"),
  source: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
});

export const createRecurringTaskSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional().nullable(),
  frequency: z.enum(["weekly", "monthly"]),
  schedule_day: z.number().int().min(0).max(31),
  project_id: z.string().optional().nullable(),
});

export const updateRecurringTaskSchema = createRecurringTaskSchema;

export const setRecurringCompletionSchema = z.object({
  recurring_task_id: z.string().uuid(),
  frequency: z.enum(["weekly", "monthly"]),
  completed: z.boolean(),
});

export const n8nTaskCreatedSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  source: taskSourceSchema.default("manual"),
  priority: taskPrioritySchema.default("medium"),
  status: taskStatusSchema.default("pending"),
  ai_summary: z.string().optional(),
  suggested_action: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  project_id: z.string().uuid().optional().nullable(),
});

export const n8nApprovalResultSchema = z.object({
  approval_id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  reviewed_payload: z.record(z.unknown()).optional(),
});

export const aiSummarizeSchema = z.object({
  text: z.string().min(1),
  context: z.string().optional(),
});

export const aiSuggestActionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  source: taskSourceSchema.optional(),
  ai_summary: z.string().optional(),
  project_name: z.string().optional(),
});

export function validateWebhookSecret(
  request: Request,
  secret: string | undefined
): boolean {
  if (!secret) return false;
  const header = request.headers.get("x-webhook-secret");
  return header === secret;
}
