import { NextResponse } from "next/server";
import { fetchDashboardData } from "@/lib/api/dashboard-data";
import { requireOwner } from "@/lib/auth/require-owner";
import { isSupabaseConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  try {
    const data = await fetchDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/dashboard]", error);
    return NextResponse.json(
      { error: "Error al cargar el dashboard" },
      { status: 500 }
    );
  }
}
