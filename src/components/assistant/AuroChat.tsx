"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActionConfirmCard } from "@/components/assistant/ActionConfirmCard";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { CHAT_SUGGESTIONS } from "@/lib/assistant/constants";
import { cn } from "@/lib/utils";
import type { ChatMessage, PendingAction } from "@/types/assistant";

export function AuroChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadHistory = useCallback(async () => {
    try {
      const id = conversationIdRef.current;
      const qs = id ? `?conversationId=${id}` : "";
      const res = await fetch(`/api/assistant/chat${qs}`);
      const json = await res.json();
      if (json.conversationId) {
        conversationIdRef.current = json.conversationId;
        setConversationId(json.conversationId);
      }
      setMessages(json.messages ?? []);
      setPendingActions(json.pendingActions ?? []);
    } catch {
      setError("No se pudo cargar el historial");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, pendingActions]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLoading(true);
    setInput("");

    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      conversation_id: conversationId ?? "",
      role: "user",
      content: trimmed,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationId: conversationIdRef.current ?? conversationId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al enviar");

      if (json.conversationId) {
        conversationIdRef.current = json.conversationId;
        setConversationId(json.conversationId);
      }
      if (json.message) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimistic.id),
          { ...optimistic, id: optimistic.id },
          json.message,
        ]);
      }
      setPendingActions(json.pendingActions ?? []);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError(err instanceof Error ? err.message : "Error de conexión");
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-[min(70vh,720px)] flex-col rounded-xl border border-auro-border bg-auro-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-auro-border px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-auro-accent/15 text-auro-accent">
          <AppIcon name="sparkles" className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-auro-text">Auro</h2>
          <p className="text-[10px] text-auro-muted">Asistente personal</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {initialLoading && (
          <p className="text-sm text-auro-muted text-center py-8">
            Cargando conversación...
          </p>
        )}

        {!initialLoading && messages.length === 0 && (
          <div className="space-y-3 py-4">
            <p className="text-sm text-auro-muted text-center">
              Hola Charly. ¿En qué puedo ayudarte hoy?
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {CHAT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-auro-border bg-auro-surface px-3 py-1.5 text-xs text-auro-text hover:border-auro-accent/50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-auro-accent text-white rounded-br-md"
                  : "bg-auro-surface border border-auro-border text-auro-text rounded-bl-md"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-auro-surface border border-auro-border px-3 py-2 text-sm text-auro-muted">
              Auro está pensando...
            </div>
          </div>
        )}

        {pendingActions.map((action) => (
          <ActionConfirmCard
            key={action.id}
            action={action}
            onResolved={loadHistory}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-4 pb-2 text-xs text-red-400">{error}</p>
      )}

      <form
        className="border-t border-auro-border p-3 flex gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          rows={1}
          placeholder="Escribe a Auro..."
          className="flex-1 resize-none rounded-lg border border-auro-border bg-auro-bg px-3 py-2 text-sm text-auro-text placeholder:text-auro-muted/50 focus:outline-none focus:border-auro-accent min-h-[40px] max-h-32"
        />
        <button
          type="button"
          title="Voz (próximamente)"
          disabled
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-auro-border bg-auro-surface text-auro-muted opacity-50 cursor-not-allowed"
        >
          <AppIcon name="mic" className="h-4 w-4" />
        </button>
        <Button type="submit" size="sm" loading={loading} className="shrink-0 h-10">
          Enviar
        </Button>
      </form>
    </div>
  );
}
