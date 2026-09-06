import { NextResponse } from "next/server";
import { z } from "zod";
import { createTaskSchema } from "@/lib/validations";
import { createTask, listTasks } from "@/lib/repositories/tasks";
import { isSupabaseConfigured } from "@/lib/config";
import { requireOwner } from "@/lib/auth/require-owner";

const projectIdQuerySchema = z.string().uuid();

export async function GET(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawProjectId = searchParams.get("projectId");
  let projectId: string | undefined;

  if (rawProjectId) {
    const parsed = projectIdQuerySchema.safeParse(rawProjectId);
    if (!parsed.success) {
      return NextResponse.json({ error: "projectId inválido" }, { status: 400 });
    }
    projectId = parsed.data;
  }

  try {
    const tasks = await listTasks({ projectId });
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("[api/tasks GET]", error);
    return NextResponse.json({ error: "Error al cargar tareas" }, { status: 500 });
  }
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

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { title, description, priority, source, project_id } = parsed.data;

  try {
    const task = await createTask({
      title,
      description,
      priority,
      source,
      project_id,
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("[api/tasks POST]", error);
    return NextResponse.json({ error: "Error al crear la tarea" }, { status: 500 });
  }
}
