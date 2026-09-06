import { NextResponse } from "next/server";
import {
  ActionConflictError,
  cancelAction,
  confirmAction,
} from "@/lib/assistant/actions";
import { getPendingActions } from "@/lib/assistant/tools";
import { requireOwner } from "@/lib/auth/require-owner";
import { assistantActionDecisionSchema } from "@/lib/assistant/action-schemas";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  try {
    const actions = await getPendingActions();
    return NextResponse.json({ actions });
  } catch (error) {
    console.error("[api/assistant/actions GET]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las acciones" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = assistantActionDecisionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { actionId, decision } = parsed.data;

  try {
    if (decision === "confirm") {
      const result = await confirmAction(actionId);
      return NextResponse.json(result);
    }
    await cancelAction(actionId);
    return NextResponse.json({ ok: true, message: "Acción cancelada." });
  } catch (error) {
    if (error instanceof ActionConflictError) {
      return NextResponse.json(
        { error: "Acción no encontrada o ya procesada" },
        { status: 409 }
      );
    }
    console.error("[api/assistant/actions POST]", error);
    return NextResponse.json(
      { error: "No se pudo procesar la acción" },
      { status: 500 }
    );
  }
}
