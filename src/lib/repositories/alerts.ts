import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import type { Alert } from "@/types/database";

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
