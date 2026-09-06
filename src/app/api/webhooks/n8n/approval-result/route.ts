import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  n8nApprovalResultSchema,
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

  const parsed = n8nApprovalResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { approval_id, status } = parsed.data;

  try {
    const supabase = createAdminClient();

    const { data: approval, error: approvalError } = await supabase
      .from("approvals")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", approval_id)
      .select("task_id")
      .single();

    if (approvalError) throw approvalError;

    const taskStatus = status === "approved" ? "in_progress" : "rejected";
    await supabase
      .from("tasks")
      .update({ status: taskStatus })
      .eq("id", approval.task_id);

    return NextResponse.json({ success: true, approval_id, status });
  } catch (err) {
    console.error("[webhook/approval-result]", err);
    return NextResponse.json(
      { error: "Error al procesar el resultado" },
      { status: 500 }
    );
  }
}
