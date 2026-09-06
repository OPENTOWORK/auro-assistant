import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config";
import { requireOwner } from "@/lib/auth/require-owner";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";

const ALERT_COLUMNS =
  "id, title, message, severity, is_read, source, project_id, created_at";

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("alerts")
    .update({ is_read: true })
    .eq("id", params.id)
    .eq("owner_key", AURO_OWNER_KEY)
    .select(ALERT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[api/alerts PATCH]", error);
    return NextResponse.json(
      { error: "Error al actualizar la alerta" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ alert: data });
}
