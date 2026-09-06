import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  n8nTaskCreatedSchema,
  validateWebhookSecret,
} from "@/lib/validations";

export async function POST(request: Request) {
  if (!validateWebhookSecret(request, process.env.N8N_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = n8nTaskCreatedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tasks")
      .insert(parsed.data)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, task: data }, { status: 201 });
  } catch (err) {
    console.error("[webhook/task-created]", err);
    return NextResponse.json(
      { error: "Error al crear la tarea" },
      { status: 500 }
    );
  }
}
