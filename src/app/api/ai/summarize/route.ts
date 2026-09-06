import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import { aiSummarizeSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = aiSummarizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { text, context } = parsed.data;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente personal. Resume el texto de forma concisa en español, destacando lo más importante y cualquier acción requerida.",
        },
        {
          role: "user",
          content: context
            ? `Contexto: ${context}\n\nTexto a resumir:\n${text}`
            : text,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content ?? "";

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("[ai/summarize]", err);
    return NextResponse.json(
      { error: "Error al generar el resumen" },
      { status: 500 }
    );
  }
}
