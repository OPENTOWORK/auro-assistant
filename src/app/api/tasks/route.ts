import { NextResponse } from "next/server";
import { createTaskSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/config";
import { getLocalTasks } from "@/lib/local-tasks";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ tasks: getLocalTasks(), tableMissing: false });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ tasks: [], tableMissing: true });
    }
    console.error("[api/tasks GET]", error);
    return NextResponse.json({ error: "Error al cargar tareas" }, { status: 500 });
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

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  const { title, description, priority, source, project_id } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .insert({
      title,
      description: description ?? null,
      priority,
      source,
      status: "pending",
      project_id: project_id ?? null,
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          error: "La tabla tasks no existe. Ejecuta npm run db:migrate",
          tableMissing: true,
        },
        { status: 503 }
      );
    }
    console.error("[api/tasks POST]", error);
    return NextResponse.json({ error: "Error al crear la tarea" }, { status: 500 });
  }

  return NextResponse.json({ task: data }, { status: 201 });
}
