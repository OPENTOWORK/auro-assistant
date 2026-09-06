import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";

const COLUMNS = "id, subject, sender, snippet, received_at";
const DEFAULT_LIMIT = 5;
const MAX_PAYLOAD = 20;

export interface BriefingEmail {
  id: string;
  subject: string;
  sender: string;
  snippet: string | null;
  received_at: string;
}

export interface ImportantEmailSummary {
  items: BriefingEmail[];
  total: number;
}

export interface ListImportantEmailsOptions {
  limit?: number;
}

export async function getImportantEmailSummary(
  options: ListImportantEmailsOptions = {}
): Promise<ImportantEmailSummary> {
  const admin = createAdminClient();
  const requested = options.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, requested), MAX_PAYLOAD);

  const { data, error, count } = await admin
    .from("important_emails")
    .select(COLUMNS, { count: "exact" })
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("is_processed", false)
    .not("subject", "eq", "(Sin asunto)")
    .not("sender", "eq", "desconocido")
    .order("received_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return {
    items: (data ?? []) as BriefingEmail[],
    total: count ?? 0,
  };
}

export async function listImportantEmails(
  options: ListImportantEmailsOptions = {}
): Promise<BriefingEmail[]> {
  const summary = await getImportantEmailSummary(options);
  return summary.items;
}
