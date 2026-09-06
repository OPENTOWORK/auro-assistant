import { NextResponse } from "next/server";
import { createAlertSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config";
import { requireOwner } from "@/lib/auth/require-owner";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";

const ALERT_COLUMNS =
  "id, title, message, severity, is_read, source, project_id, created_at";

export async function GET() {
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
    .select(ALERT_COLUMNS)
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[api/alerts GET]", error);
    return NextResponse.json({ error: "Error al cargar alertas" }, { status: 500 });
  }

  return NextResponse.json({ alerts: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { title, message, severity, source, project_id } = parsed.data;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("alerts")
    .insert({
      owner_key: AURO_OWNER_KEY,
      title,
      message: message ?? null,
      severity,
      source: source ?? "manual",
      project_id: project_id ?? null,
      is_read: false,
    })
    .select(ALERT_COLUMNS)
    .single();

  if (error) {
    console.error("[api/alerts POST]", error);
    return NextResponse.json({ error: "Error al crear la alerta" }, { status: 500 });
  }

  return NextResponse.json({ alert: data }, { status: 201 });
}
