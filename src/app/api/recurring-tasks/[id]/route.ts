import { NextResponse } from "next/server";
import { updateRecurringTaskSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/config";
import { validateRecurringSchedule } from "@/lib/recurring-period";
import { requireOwner } from "@/lib/auth/require-owner";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateRecurringTaskSchema.safeParse(body);
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
    .update({
      title,
      description: description ?? null,
      frequency,
      schedule_day,
      project_id: project_id ?? null,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: "La tabla recurring_tasks no existe.", tableMissing: true },
        { status: 503 }
      );
    }
    console.error("[api/recurring-tasks PATCH]", error);
    return NextResponse.json(
      { error: "Error al actualizar la tarea recurrente" },
      { status: 500 }
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
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("recurring_tasks")
    .delete()
    .eq("id", params.id);

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: "La tabla recurring_tasks no existe.", tableMissing: true },
        { status: 503 }
      );
    }
    console.error("[api/recurring-tasks DELETE]", error);
    return NextResponse.json(
      { error: "Error al eliminar la tarea recurrente" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
