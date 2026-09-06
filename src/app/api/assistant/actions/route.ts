import { NextResponse } from "next/server";
import { confirmAction, cancelAction } from "@/lib/assistant/actions";
import { getPendingActions } from "@/lib/assistant/tools";
import { requireOwner } from "@/lib/auth/require-owner";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  try {
    const actions = await getPendingActions();
    return NextResponse.json({ actions });
  } catch {
    return NextResponse.json({ actions: [] });
  }
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  let body: { actionId?: string; decision?: "confirm" | "cancel" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { actionId, decision } = body;
  if (!actionId || !decision) {
    return NextResponse.json(
      { error: "actionId y decision son obligatorios" },
      { status: 400 }
    );
  }

  try {
    if (decision === "confirm") {
      const result = await confirmAction(actionId);
      return NextResponse.json(result);
    }
    await cancelAction(actionId);
    return NextResponse.json({ ok: true, message: "Acción cancelada." });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al procesar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
