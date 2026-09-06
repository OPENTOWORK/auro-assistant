import { NextResponse } from "next/server";
import { createRecurringTaskSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config";
import { validateRecurringSchedule } from "@/lib/recurring-period";
import { requireOwner } from "@/lib/auth/require-owner";
import { AURO_OWNER_KEY } from "@/lib/assistant/owner";

export const dynamic = "force-dynamic";

const RECURRING_COLUMNS =
  "id, title, description, frequency, schedule_day, project_id, is_active, created_at";

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
    .from("recurring_tasks")
    .select(RECURRING_COLUMNS)
    .eq("owner_key", AURO_OWNER_KEY)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[api/recurring-tasks GET]", error);
    return NextResponse.json(
      { error: "Error al cargar tareas recurrentes" },
      { status: 500 }
    );
  }

  return NextResponse.json({ tasks: data ?? [] });
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

  const parsed = createRecurringTaskSchema.safeParse(body);
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
    .insert({
      owner_key: AURO_OWNER_KEY,
      title,
      description: description ?? null,
      frequency,
      schedule_day,
      project_id: project_id ?? null,
      is_active: true,
    })
    .select(RECURRING_COLUMNS)
    .single();

  if (error) {
    console.error("[api/recurring-tasks POST]", error);
    return NextResponse.json(
      { error: "Error al crear la tarea recurrente" },
      { status: 500 }
    );
  }

  return NextResponse.json({ task: data }, { status: 201 });
}
