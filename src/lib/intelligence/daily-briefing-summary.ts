import { z } from "zod";
import type { DailyBriefing } from "@/lib/intelligence/daily-briefing-types";

const nonNegativeInt = z.number().int().min(0);

export const dailyBriefingAlertContextSchema = z
  .object({
    counts: z
      .object({
        critical_alerts: nonNegativeInt,
        overdue_tasks: nonNegativeInt,
        blocked_tasks: nonNegativeInt,
        waiting_tasks: nonNegativeInt,
        stalled_projects: nonNegativeInt,
        overdue_projects: nonNegativeInt,
        blocked_projects: nonNegativeInt,
      })
      .passthrough(),
  })
  .passthrough();

export type DailyBriefingAlertContext = z.infer<
  typeof dailyBriefingAlertContextSchema
>;

export type DailyBriefingAlertSeverity = "info" | "warning" | "critical";

export interface DailyBriefingSeverityInput {
  counts: {
    critical_alerts: number;
    overdue_tasks: number;
    blocked_tasks: number;
    waiting_tasks: number;
    stalled_projects: number;
    overdue_projects: number;
    blocked_projects: number;
  };
}

export class InvalidStoredBriefingPayloadError extends Error {
  constructor() {
    super("El snapshot del briefing diario no es válido");
    this.name = "InvalidStoredBriefingPayloadError";
  }
}

export function parseDailyBriefingAlertContext(
  payload: unknown
): DailyBriefingAlertContext {
  const parsed = dailyBriefingAlertContextSchema.safeParse(payload);
  if (!parsed.success) {
    throw new InvalidStoredBriefingPayloadError();
  }
  return parsed.data;
}

export function getDailyBriefingAlertSeverity(
  briefing: DailyBriefingSeverityInput
): DailyBriefingAlertSeverity {
  const counts = briefing.counts;
  if (counts.critical_alerts > 0) return "critical";
  if (
    counts.overdue_tasks > 0 ||
    counts.blocked_tasks > 0 ||
    counts.waiting_tasks > 0 ||
    counts.stalled_projects > 0 ||
    counts.overdue_projects > 0 ||
    counts.blocked_projects > 0
  ) {
    return "warning";
  }
  return "info";
}

function phrase(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinEs(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

function focusTitle(briefing: DailyBriefing): string | null {
  const fromPlan = briefing.focus_plan?.selected[0]?.task.title.trim();
  if (fromPlan) return fromPlan;
  const fromPriority = briefing.priorities[0]?.task.title.trim();
  return fromPriority || null;
}

export function buildDailyBriefingSummary(briefing: DailyBriefing): string {
  const counts = briefing.counts;
  const sentences: string[] = [];

  const focus = focusTitle(briefing);
  if (focus) {
    sentences.push(`Foco: ${focus}.`);
  }

  if (counts.today_events > 0) {
    sentences.push(
      `${phrase(counts.today_events, "evento de calendario", "eventos de calendario")}.`
    );
  }

  const attention: string[] = [];
  if (counts.overdue_tasks > 0) {
    attention.push(phrase(counts.overdue_tasks, "vencida", "vencidas"));
  }
  if (counts.blocked_tasks > 0) {
    attention.push(phrase(counts.blocked_tasks, "bloqueada", "bloqueadas"));
  }
  if (counts.waiting_tasks > 0) {
    attention.push(phrase(counts.waiting_tasks, "esperando", "esperando"));
  }
  if (counts.stalled_projects > 0) {
    attention.push(
      phrase(counts.stalled_projects, "proyecto estancado", "proyectos estancados")
    );
  }
  if (counts.overdue_projects > 0) {
    attention.push(
      phrase(counts.overdue_projects, "proyecto vencido", "proyectos vencidos")
    );
  }
  if (counts.blocked_projects > 0) {
    attention.push(
      phrase(counts.blocked_projects, "proyecto bloqueado", "proyectos bloqueados")
    );
  }

  const inbox: string[] = [];
  if (counts.important_emails > 0) {
    inbox.push(
      phrase(counts.important_emails, "correo importante", "correos importantes")
    );
  }
  if (counts.critical_alerts > 0) {
    inbox.push(
      phrase(counts.critical_alerts, "alerta crítica", "alertas críticas")
    );
  } else if (counts.unread_alerts > 0) {
    inbox.push(phrase(counts.unread_alerts, "alerta", "alertas"));
  }

  if (attention.length > 0) {
    sentences.push(`Atención: ${joinEs(attention)}.`);
  } else if (inbox.length === 0) {
    sentences.push("Sin incidencias.");
  }

  if (inbox.length > 0) {
    sentences.push(`Inbox: ${joinEs(inbox)}.`);
  }

  return sentences.join(" ");
}
