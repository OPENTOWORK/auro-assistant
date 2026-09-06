import { NextResponse } from "next/server";
import { createAlertSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/config";
import { requireOwner } from "@/lib/auth/require-owner";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ alerts: [], tableMissing: false });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("alerts")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ alerts: [], tableMissing: true });
    }
    console.error("[api/alerts GET]", error);
    return NextResponse.json({ error: "Error al cargar alertas" }, { status: 500 });
  }

  return NextResponse.json({ alerts: data ?? [], tableMissing: false });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const { title, message, severity, source, project_id } = parsed.data;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("alerts")
    .insert({
      title,
      message: message ?? null,
      severity,
      source: source ?? "manual",
      project_id: project_id ?? null,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: "La tabla alerts no existe en Supabase.", tableMissing: true },
        { status: 503 }
      );
    }
    console.error("[api/alerts POST]", error);
    return NextResponse.json({ error: "Error al crear la alerta" }, { status: 500 });
  }

  return NextResponse.json({ alert: data }, { status: 201 });
}
