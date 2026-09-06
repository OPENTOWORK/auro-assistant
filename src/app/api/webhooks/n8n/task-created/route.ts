import { NextResponse } from "next/server";
import { createTask } from "@/lib/repositories/tasks";
import {
  n8nTaskCreatedSchema,
  validateWebhookSecret,
} from "@/lib/validations";
import { isSupabaseConfigured } from "@/lib/config";

export async function POST(request: Request) {
  if (!validateWebhookSecret(request, process.env.N8N_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

  const parsed = n8nTaskCreatedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  try {
    const task = await createTask(parsed.data);
    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (err) {
    console.error("[webhook/task-created]", err);
    return NextResponse.json(
      { error: "Error al crear la tarea" },
      { status: 500 }
    );
  }
}
