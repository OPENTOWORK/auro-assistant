import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/require-owner";
import { isSupabaseConfigured } from "@/lib/config";
import { getDailyDecision } from "@/lib/intelligence/daily-decision";
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
    const decision = await getDailyDecision(availableMinutes);
    return NextResponse.json({ decision });
  } catch (error) {
    console.error("[api/decision/today]", error);
    return NextResponse.json(
      { error: "Error al calcular la decisión del día" },
      { status: 500 }
    );
  }
}
