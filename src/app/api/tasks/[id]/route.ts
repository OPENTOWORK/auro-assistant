import { NextResponse } from "next/server";
import { z } from "zod";
import { getTaskById, updateTask } from "@/lib/repositories/tasks";
import { updateTaskSchema } from "@/lib/validations";
import { isSupabaseConfigured } from "@/lib/config";
import { requireOwner } from "@/lib/auth/require-owner";

const idSchema = z.string().uuid();

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  const parsed = idSchema.safeParse(params.id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  try {
    const task = await getTaskById(parsed.data);
    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (error) {
    console.error("[api/tasks GET id]", error);
    return NextResponse.json({ error: "Error al cargar la tarea" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  const parsedId = idSchema.safeParse(params.id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const task = await updateTask(parsedId.data, parsed.data);
    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (error) {
    console.error("[api/tasks PATCH id]", error);
    return NextResponse.json({ error: "Error al actualizar la tarea" }, { status: 500 });
  }
}
