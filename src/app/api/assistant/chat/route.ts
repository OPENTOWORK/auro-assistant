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
  ConversationNotFoundError,
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
import {
  chatMessageRequestSchema,
  conversationIdQuerySchema,
} from "@/lib/assistant/action-schemas";

export async function GET(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const rawConversationId = searchParams.get("conversationId");
  let conversationId: string | undefined;

  if (rawConversationId) {
    const parsedId = conversationIdQuerySchema.safeParse(rawConversationId);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: "conversationId inválido" },
        { status: 400 }
      );
    }
    conversationId = parsedId.data;
  }

  try {
    const convId = await getOrCreateConversation(conversationId);
    const [messages, pendingActions] = await Promise.all([
      loadMessages(convId),
      getPendingActions(),
    ]);
    return NextResponse.json({ conversationId: convId, messages, pendingActions });
  } catch (error) {
    if (error instanceof ConversationNotFoundError) {
      return NextResponse.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }
    console.error("[api/assistant/chat GET]", error);
    return NextResponse.json(
      { error: "No se pudo cargar la conversación" },
      { status: 500 }
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsedBody = chatMessageRequestSchema.safeParse(raw);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
  }

  const { message, conversationId: requestedConversationId } = parsedBody.data;

  try {
    const conversationId = await getOrCreateConversation(requestedConversationId);
    await saveMessage(conversationId, "user", message);

    const history = await loadMessages(conversationId, 30);
    const memory = await getConfirmedMemory();

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
    if (error instanceof ConversationNotFoundError) {
      return NextResponse.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }
    console.error("[api/assistant/chat POST]", error);
    return NextResponse.json(
      { error: "No se pudo completar la conversación" },
      { status: 500 }
    );
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

Modelo de inteligencia de proyectos y tareas:
- objective: resultado deseado del proyecto. No lo inventes.
- next_action: siguiente paso concreto registrado. No lo inventes.
- blocked_reason: bloqueo explícito escrito por el usuario. Vacío = no está bloqueado.
- deadline (proyecto) y due_at (tarea): compromisos temporales.
- planned_for: intención de trabajar esa tarea ese día (fecha local, no UTC).
- last_activity_at: última actividad real del proyecto.
- stalled: cálculo por inactividad (>= 7 días) en proyectos in_progress o active. No es un estado persistido.
- overdue: cálculo por deadline/due_at vencido. No es un estado persistido.
- Distingue estancado (stalled, sin actividad) de bloqueado (blocked_reason con texto).
- El ranking del día lo calcula el Decision Engine (get_daily_plan), no tú. Explica las reasons recibidas. No recalcules scores.

Reglas:
- Consulta herramientas antes de inventar datos sobre proyectos, tareas, correos, calendario o leads.
- Si pregunta qué está parado o estancado, consulta get_projects antes de responder.
- Si pregunta qué hacer hoy, qué hacer primero, por dónde empezar, cuál es su prioridad, en qué centrarse ahora, o dice cuántos minutos tiene, llama get_daily_plan ANTES de responder.
- Si dice “tengo 90 minutos” (u otro número entre 15 y 720), llama get_daily_plan con available_minutes.
- Explica el ranking con las reasons: “AURO la coloca primero porque…”. No digas que es objetivamente la mejor tarea.
- No afirmes que una tarea cabe en un tiempo disponible si no tiene estimated_minutes o no está en focus_plan.
- No inventes huecos libres en el calendario ni jornada laboral.
- No afirmes que un proyecto o tarea está bloqueado si blocked_reason está vacío.
- No afirmes que un proyecto está estancado si stalled es false.
- No decidas prioridades ni cambies objective, deadline, next_action, planned_for o bloqueos por tu cuenta.
- Para crear, modificar o guardar algo usa propose_action y espera confirmación del usuario.
- Para recordar preferencias usa propose_action con action_type save_memory.
- No ejecutes acciones destructivas sin propose_action.
- Sé conciso pero completo.`;
}
