import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config";

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("alerts")
    .update({ is_read: true })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    console.error("[api/alerts PATCH]", error);
    return NextResponse.json({ error: "Error al actualizar la alerta" }, { status: 500 });
  }

  return NextResponse.json({ alert: data });
}
