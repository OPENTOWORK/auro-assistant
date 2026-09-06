import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import { isUniqueViolation } from "@/lib/supabase/errors";
import type { DailyBriefingRun } from "@/lib/repositories/daily-briefing-runs";
import type { Alert } from "@/types/database";

export const DAILY_BRIEFING_ALERT_SOURCE = "daily_briefing";

const COLUMNS =
  "id, title, message, severity, is_read, source, project_id, created_at";
const DEFAULT_LIMIT = 10;
const MAX_PAYLOAD = 50;

export interface ListUnreadAlertsOptions {
  limit?: number;
}

export interface UnreadAlertSummary {
  items: Alert[];
  total: number;
  critical: number;
  warning: number;
  info: number;
}

export interface AlertSeverityPage {
  items: Alert[];
  total: number;
}

export function composeUnreadAlertSummary(
  pages: {
    critical: AlertSeverityPage;
    warning: AlertSeverityPage;
    info: AlertSeverityPage;
  },
  limit: number
): UnreadAlertSummary {
  return {
    items: [
      ...pages.critical.items,
      ...pages.warning.items,
      ...pages.info.items,
    ].slice(0, limit),
    total: pages.critical.total + pages.warning.total + pages.info.total,
    critical: pages.critical.total,
    warning: pages.warning.total,
    info: pages.info.total,
  };
}

async function fetchUnreadBySeverity(
  severity: Alert["severity"],
  limit: number
): Promise<AlertSeverityPage> {
  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from("alerts")
    .select(COLUMNS, { count: "exact" })
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("is_read", false)
    .eq("severity", severity)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return {
    items: (data ?? []) as Alert[],
    total: count ?? 0,
  };
}

export async function getUnreadAlertSummary(
  options: ListUnreadAlertsOptions = {}
): Promise<UnreadAlertSummary> {
  const requested = options.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, requested), MAX_PAYLOAD);

  const [critical, warning, info] = await Promise.all([
    fetchUnreadBySeverity("critical", limit),
    fetchUnreadBySeverity("warning", limit),
    fetchUnreadBySeverity("info", limit),
  ]);

  return composeUnreadAlertSummary({ critical, warning, info }, limit);
}

export async function listUnreadAlerts(
  options: ListUnreadAlertsOptions = {}
): Promise<Alert[]> {
  const summary = await getUnreadAlertSummary(options);
  return summary.items;
}

export interface EnsureDailyBriefingAlertResult {
  alert: Alert;
  created: boolean;
}

export class DailyBriefingAlertCollisionError extends Error {
  constructor() {
    super("La alerta existente no coincide con el briefing diario");
    this.name = "DailyBriefingAlertCollisionError";
  }
}

export function matchesDailyBriefingAlert(
  existing: Pick<
    Alert,
    "source" | "title" | "message" | "severity" | "project_id"
  >,
  expected: {
    title: string;
    message: string;
    severity: Alert["severity"];
  }
): boolean {
  return (
    existing.source === DAILY_BRIEFING_ALERT_SOURCE &&
    existing.title === expected.title &&
    existing.message === expected.message &&
    existing.severity === expected.severity &&
    existing.project_id === null
  );
}

export async function ensureDailyBriefingAlert(input: {
  run: Pick<DailyBriefingRun, "id" | "briefing_date" | "summary">;
  severity: Alert["severity"];
}): Promise<EnsureDailyBriefingAlertResult> {
  const expectedTitle = `Briefing diario · ${input.run.briefing_date}`;
  const expectedMessage = input.run.summary;
  const expectedSeverity = input.severity;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("alerts")
    .insert({
      id: input.run.id,
      owner_key: AURO_OWNER_KEY,
      title: expectedTitle,
      message: expectedMessage,
      severity: expectedSeverity,
      source: DAILY_BRIEFING_ALERT_SOURCE,
      project_id: null,
      is_read: false,
    })
    .select(COLUMNS)
    .single();

  if (!error && data) {
    return { alert: data as Alert, created: true };
  }

  if (!isUniqueViolation(error)) {
    throw error;
  }

  const { data: existing, error: fetchError } = await admin
    .from("alerts")
    .select(COLUMNS)
    .eq("id", input.run.id)
    .eq("owner_key", AURO_OWNER_KEY)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) {
    throw new Error("Alert unique violation but existing alert not found");
  }

  if (
    !matchesDailyBriefingAlert(existing as Alert, {
      title: expectedTitle,
      message: expectedMessage,
      severity: expectedSeverity,
    })
  ) {
    throw new DailyBriefingAlertCollisionError();
  }

  return { alert: existing as Alert, created: false };
}
