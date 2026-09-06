import { dateOnlyInTimeZone, getAuroTimezone } from "@/lib/intelligence/dates";
import { getDailyBriefing } from "@/lib/intelligence/daily-briefing";
import {
  buildDailyBriefingSummary,
  getDailyBriefingAlertSeverity,
  parseDailyBriefingAlertContext,
} from "@/lib/intelligence/daily-briefing-summary";
import { ensureDailyBriefingAlert } from "@/lib/repositories/alerts";
import {
  getDailyBriefingRunByDate,
  insertDailyBriefingRun,
  type DailyBriefingRun,
} from "@/lib/repositories/daily-briefing-runs";
import { isUniqueViolation, type PostgresErrorLike } from "@/lib/supabase/errors";

export type ProactiveDailyBriefingStatus = "created" | "already_generated";

export interface ProactiveDailyBriefingResult {
  status: ProactiveDailyBriefingStatus;
  briefing_date: string;
  run_id: string;
  alert_id: string;
  alert_created: boolean;
}

function isPostgresErrorLike(error: unknown): error is PostgresErrorLike {
  return typeof error === "object" && error !== null;
}

async function ensureAlertForRun(run: DailyBriefingRun) {
  const context = parseDailyBriefingAlertContext(run.payload);
  return ensureDailyBriefingAlert({
    run,
    severity: getDailyBriefingAlertSeverity(context),
  });
}

export async function runProactiveDailyBriefing(
  now = new Date()
): Promise<ProactiveDailyBriefingResult> {
  const timezone = getAuroTimezone();
  const briefingDate = dateOnlyInTimeZone(now, timezone);

  const existing = await getDailyBriefingRunByDate(briefingDate);
  if (existing) {
    const alert = await ensureAlertForRun(existing);
    return {
      status: "already_generated",
      briefing_date: existing.briefing_date,
      run_id: existing.id,
      alert_id: alert.alert.id,
      alert_created: alert.created,
    };
  }

  const briefing = await getDailyBriefing(undefined, now);
  if (briefing.date !== briefingDate || briefing.timezone !== timezone) {
    throw new Error("Daily briefing date or timezone mismatch");
  }

  const summary = buildDailyBriefingSummary(briefing);
  let run: DailyBriefingRun;
  let status: ProactiveDailyBriefingStatus = "created";

  try {
    run = await insertDailyBriefingRun({ briefing, summary });
  } catch (error) {
    if (!isPostgresErrorLike(error) || !isUniqueViolation(error)) {
      throw error;
    }
    const winner = await getDailyBriefingRunByDate(briefingDate);
    if (!winner) {
      throw new Error("Daily briefing run conflict but existing run not found");
    }
    run = winner;
    status = "already_generated";
  }

  const alert =
    status === "created"
      ? await ensureDailyBriefingAlert({
          run,
          severity: getDailyBriefingAlertSeverity(briefing),
        })
      : await ensureAlertForRun(run);

  return {
    status,
    briefing_date: run.briefing_date,
    run_id: run.id,
    alert_id: alert.alert.id,
    alert_created: alert.created,
  };
}
