import { NextResponse } from "next/server";
import { updateRecurringTaskSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config";
import { validateRecurringSchedule } from "@/lib/recurring-period";
import { requireOwner } from "@/lib/auth/require-owner";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";

const RECURRING_COLUMNS =
  "id, title, description, frequency, schedule_day, project_id, is_active, created_at";

export async function PATCH(
  request: Request,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateRecurringTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { title, description, frequency, schedule_day, project_id } = parsed.data;
  const scheduleError = validateRecurringSchedule(frequency, schedule_day);
  if (scheduleError) {
    return NextResponse.json({ error: scheduleError }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recurring_tasks")
    .update({
      title,
      description: description ?? null,
      frequency,
      schedule_day,
      project_id: project_id ?? null,
    })
    .eq("id", params.id)
    .eq("owner_key", AURO_OWNER_KEY)
    .select(RECURRING_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[api/recurring-tasks PATCH]", error);
    return NextResponse.json(
      { error: "Error al actualizar la tarea recurrente" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Tarea recurrente no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ task: data });
}

export async function DELETE(
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
    .from("recurring_tasks")
    .delete()
    .eq("id", params.id)
    .eq("owner_key", AURO_OWNER_KEY)
    .select("id");

  if (error) {
    console.error("[api/recurring-tasks DELETE]", error);
    return NextResponse.json(
      { error: "Error al eliminar la tarea recurrente" },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Tarea recurrente no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
