import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import type { Alert } from "@/types/database";

const COLUMNS =
  "id, title, message, severity, is_read, source, project_id, created_at";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const SEVERITY_RANK: Record<Alert["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export interface ListUnreadAlertsOptions {
  limit?: number;
}

export function sortUnreadAlerts(alerts: Alert[]): Alert[] {
  return alerts.slice().sort((a, b) => {
    const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severity !== 0) return severity;
    if (a.created_at !== b.created_at) {
      return a.created_at < b.created_at ? 1 : -1;
    }
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}

export async function listUnreadAlerts(
  options: ListUnreadAlertsOptions = {}
): Promise<Alert[]> {
  const admin = createAdminClient();
  const requested = options.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, requested), MAX_LIMIT);

  const { data, error } = await admin
    .from("alerts")
    .select(COLUMNS)
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return sortUnreadAlerts((data ?? []) as Alert[]);
}
