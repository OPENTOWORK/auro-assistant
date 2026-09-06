import { NextResponse } from "next/server";
import { setRecurringCompletionSchema } from "@/lib/validations";
import {
  listCurrentCompletions,
  setCompletion,
} from "@/lib/repositories/recurring-completions";
import { isMissingTableError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/config";
import { requireOwner } from "@/lib/auth/require-owner";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ completions: [], tableMissing: false });
  }

  try {
    const completions = await listCurrentCompletions();
    return NextResponse.json({ completions, tableMissing: false });
  } catch (error) {
    if (isMissingTableError(error as { code?: string; message?: string })) {
      return NextResponse.json({ completions: [], tableMissing: true });
    }
    console.error("[api/recurring-tasks/completions GET]", error);
    return NextResponse.json(
      { error: "Error al cargar las completiones" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = setRecurringCompletionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { recurring_task_id, frequency, completed } = parsed.data;

  try {
    const result = await setCompletion(recurring_task_id, frequency, completed);
    return NextResponse.json(result);
  } catch (error) {
    if (isMissingTableError(error as { code?: string; message?: string })) {
      return NextResponse.json(
        {
          error:
            "La tabla recurring_completions no existe. Ejecuta npm run db:migrate",
          tableMissing: true,
        },
        { status: 503 }
      );
    }
    console.error("[api/recurring-tasks/completions POST]", error);
    return NextResponse.json(
      { error: "Error al guardar la completión" },
      { status: 500 }
    );
  }
}
