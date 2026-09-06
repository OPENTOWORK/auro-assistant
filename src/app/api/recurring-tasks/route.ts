import { NextResponse } from "next/server";
import { createRecurringTaskSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/config";
import { validateRecurringSchedule } from "@/lib/recurring-period";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ tasks: [], tableMissing: false });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recurring_tasks")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ tasks: [], tableMissing: true });
    }
    console.error("[api/recurring-tasks GET]", error);
    return NextResponse.json(
      { error: "Error al cargar tareas recurrentes" },
      { status: 500 }
    );
  }

  return NextResponse.json({ tasks: data ?? [], tableMissing: false });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createRecurringTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
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
      title,
      description: description ?? null,
      frequency,
      schedule_day,
      project_id: project_id ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          error: "La tabla recurring_tasks no existe. Ejecuta npm run db:migrate",
          tableMissing: true,
        },
        { status: 503 }
      );
    }
    console.error("[api/recurring-tasks POST]", error);
    return NextResponse.json(
      { error: "Error al crear la tarea recurrente" },
      { status: 500 }
    );
  }

  return NextResponse.json({ task: data }, { status: 201 });
}
