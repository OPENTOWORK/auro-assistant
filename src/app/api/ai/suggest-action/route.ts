import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { aiSuggestActionSchema } from "@/lib/validations";
import { requireOwner } from "@/lib/auth/require-owner";

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = aiSuggestActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, source, ai_summary, project_name } = parsed.data;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres Auro, el asistente personal de Charly. Sus proyectos prioritarios son: Dralo (inglés), Open To Work (ETT), Agárrame las Pokebolas (3D), Estoicoycalistenico, Cuento Que Fue y Trabaja la Mente (YouTube), Tap-up (patente) y TuFitMentor360 (fitness). Sugiere la acción más concreta y útil. Responde en una sola frase en español.",
        },
        {
          role: "user",
          content: `Proyecto: ${project_name ?? "N/A"}\nTarea: ${title}\nDescripción: ${description ?? "N/A"}\nOrigen: ${source ?? "manual"}\nResumen IA: ${ai_summary ?? "N/A"}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.4,
    });

    const suggested_action = completion.choices[0]?.message?.content ?? "";

    return NextResponse.json({ suggested_action });
  } catch (err) {
    console.error("[ai/suggest-action]", err);
    return NextResponse.json(
      { error: "Error al generar la sugerencia" },
      { status: 500 }
    );
  }
}
