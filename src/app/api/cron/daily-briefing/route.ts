import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/auth/cron-auth";
import { isSupabaseConfigured } from "@/lib/config";
import { runProactiveDailyBriefing } from "@/lib/intelligence/proactive-daily-briefing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    if (auth.reason === "missing_config") {
      return NextResponse.json(
        { error: "Cron no configurado" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  try {
    const result = await runProactiveDailyBriefing();
    return NextResponse.json({
      ok: true,
      status: result.status,
      briefing_date: result.briefing_date,
      run_id: result.run_id,
      alert_id: result.alert_id,
      alert_created: result.alert_created,
    });
  } catch (error) {
    console.error("[api/cron/daily-briefing]", error);
    return NextResponse.json(
      { error: "Error al generar el briefing diario" },
      { status: 500 }
    );
  }
}
