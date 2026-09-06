import { NextResponse } from "next/server";
import { z } from "zod";
import { updateTaskStatus } from "@/lib/repositories/tasks";
import { updateTaskStatusBodySchema } from "@/lib/validations";
import { isSupabaseConfigured } from "@/lib/config";
import { requireOwner } from "@/lib/auth/require-owner";

const idSchema = z.string().uuid();

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

  const parsed = updateTaskStatusBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const task = await updateTaskStatus(parsedId.data, parsed.data.status);
    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (error) {
    console.error("[api/tasks PATCH status]", error);
    return NextResponse.json(
      { error: "Error al actualizar el estado" },
      { status: 500 }
    );
  }
}
