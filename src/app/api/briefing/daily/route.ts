import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/require-owner";
import { isSupabaseConfigured } from "@/lib/config";
import { getDailyBriefing } from "@/lib/intelligence/daily-briefing";
import { availableMinutesSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawMinutes = searchParams.get("availableMinutes");
  let availableMinutes: number | undefined;

  if (rawMinutes !== null && rawMinutes !== "") {
    const parsed = availableMinutesSchema.safeParse(rawMinutes);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    availableMinutes = parsed.data;
  }

  try {
    const briefing = await getDailyBriefing(availableMinutes);
    return NextResponse.json({ briefing });
  } catch (error) {
    console.error("[api/briefing/daily]", error);
    return NextResponse.json(
      { error: "Error al calcular el briefing del día" },
      { status: 500 }
    );
  }
}
