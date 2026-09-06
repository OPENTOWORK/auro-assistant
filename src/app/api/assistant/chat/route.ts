import { NextResponse } from "next/server";
import type {
  EasyInputMessage,
  ResponseFunctionToolCall,
  ResponseInputItem,
  ResponseOutputItem,
} from "openai/resources/responses/responses";
import { getOpenAIClient } from "@/lib/openai";
import { ASSISTANT_TOOLS } from "@/lib/assistant/constants";
import {
  getOrCreateConversation,
  loadMessages,
  saveMessage,
} from "@/lib/assistant/chat-store";
import {
  getConfirmedMemory,
  getPendingActions,
  runAssistantTool,
} from "@/lib/assistant/tools";
import { requireOwner } from "@/lib/auth/require-owner";

export async function GET(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId") ?? undefined;

  try {
    const convId = await getOrCreateConversation(conversationId);
    const [messages, pendingActions] = await Promise.all([
      loadMessages(convId),
      getPendingActions(),
    ]);
    return NextResponse.json({ conversationId: convId, messages, pendingActions });
  } catch (error) {
    console.error("[api/assistant/chat GET]", error);
    return NextResponse.json(
      {
        conversationId: null,
        messages: [],
        pendingActions: [],
        error: "Historial no disponible. Ejecuta la migración SQL del asistente.",
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY no configurada en el servidor" },
      { status: 503 }
    );
  }

  let body: { message?: string; conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }

  try {
    const conversationId = await getOrCreateConversation(body.conversationId);
    await saveMessage(conversationId, "user", message);

    const history = await loadMessages(conversationId, 30);
    const memory = await getConfirmedMemory().catch(() => []);

    const systemPrompt = buildSystemPrompt(memory);
    const openai = getOpenAIClient();

    const input: ResponseInputItem[] = history.map((m) => ({
      role: m.role as EasyInputMessage["role"],
      content: m.content,
    }));

    let reply = "";
    let pendingActions = await getPendingActions();
    const maxRounds = 6;

    for (let round = 0; round < maxRounds; round++) {
      const response = await openai.responses.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        instructions: systemPrompt,
        input,
        tools: ASSISTANT_TOOLS,
        tool_choice: "auto",
      });

      const toolCalls = response.output.filter(
        (item): item is ResponseFunctionToolCall => item.type === "function_call"
      );

      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          input.push(toolCall);

          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = JSON.parse(toolCall.arguments || "{}");
          } catch {
            parsedArgs = {};
          }

          const result = await runAssistantTool(
            toolCall.name,
            parsedArgs,
            conversationId
          );

          input.push({
            type: "function_call_output",
            call_id: toolCall.call_id,
            output: JSON.stringify(result),
          });
        }

        pendingActions = await getPendingActions();
        continue;
      }

      reply = extractAssistantText(response.output);
      break;
    }

    if (!reply) {
      reply =
        "He consultado tus datos. ¿Quieres que profundice en algo concreto?";
    }

    const assistantMessage = await saveMessage(
      conversationId,
      "assistant",
      reply,
      { pending_action_ids: pendingActions.map((a) => a.id) }
    );

    return NextResponse.json({
      conversationId,
      message: assistantMessage,
      pendingActions,
    });
  } catch (error) {
    console.error("[api/assistant/chat POST]", error);
    const msg =
      error instanceof Error ? error.message : "Error del asistente";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function extractAssistantText(output: ResponseOutputItem[]): string {
  const parts: string[] = [];

  for (const item of output) {
    if (item.type !== "message" || item.role !== "assistant") continue;
    for (const block of item.content) {
      if (block.type === "output_text" && block.text) {
        parts.push(block.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function buildSystemPrompt(
  memory: { category: string; memory_key: string; value: string }[]
) {
  const memoryBlock =
    memory.length > 0
      ? memory
          .map((m) => `- ${m.category}/${m.memory_key}: ${m.value}`)
          .join("\n")
      : "Sin memoria confirmada todavía.";

  return `Eres Auro, el asistente personal de Charly. Respondes siempre en español, de forma clara y útil.

Memoria confirmada del usuario:
${memoryBlock}

Reglas:
- Consulta herramientas antes de inventar datos sobre proyectos, tareas, correos, calendario o leads.
- Para crear, modificar o guardar algo usa propose_action y espera confirmación del usuario.
- Para recordar preferencias usa propose_action con action_type save_memory.
- No ejecutes acciones destructivas sin propose_action.
- Sé conciso pero completo.`;
}
