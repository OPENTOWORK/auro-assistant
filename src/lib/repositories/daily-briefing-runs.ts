import { createAdminClient } from "@/lib/supabase/admin";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";
import type { DailyBriefing } from "@/lib/intelligence/daily-briefing-types";

const COLUMNS =
  "id, briefing_date, timezone, generated_at, payload, summary, created_at, updated_at";

export interface DailyBriefingRun {
  id: string;
  briefing_date: string;
  timezone: string;
  generated_at: string;
  payload: unknown;
  summary: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DailyBriefingRun): DailyBriefingRun {
  return {
    id: row.id,
    briefing_date: row.briefing_date,
    timezone: row.timezone,
    generated_at: row.generated_at,
    payload: row.payload,
    summary: row.summary,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getDailyBriefingRunByDate(
  briefingDate: string
): Promise<DailyBriefingRun | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("daily_briefing_runs")
    .select(COLUMNS)
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("briefing_date", briefingDate)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data as DailyBriefingRun) : null;
}

export async function insertDailyBriefingRun(input: {
  briefing: DailyBriefing;
  summary: string;
}): Promise<DailyBriefingRun> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("daily_briefing_runs")
    .insert({
      owner_key: AURO_OWNER_KEY,
      briefing_date: input.briefing.date,
      timezone: input.briefing.timezone,
      generated_at: input.briefing.generated_at,
      payload: input.briefing,
      summary: input.summary,
    })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return mapRow(data as DailyBriefingRun);
}
