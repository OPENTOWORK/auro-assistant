"use client";

import { ACTION_LABELS } from "@/lib/assistant/constants";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { PendingAction } from "@/types/assistant";

interface ActionConfirmCardProps {
  action: PendingAction;
  onResolved: () => void;
}

export function ActionConfirmCard({ action, onResolved }: ActionConfirmCardProps) {
  async function handle(decision: "confirm" | "cancel") {
    await fetch("/api/assistant/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: action.id, decision }),
    });
    onResolved();
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Confirmar acción
        </p>
        <p className="text-sm font-medium text-auro-text mt-1">{action.label}</p>
        <p className="text-xs text-auro-muted mt-0.5">
          {ACTION_LABELS[action.action_type] ?? action.action_type}
        </p>
      </div>
      <pre className="rounded-lg bg-auro-bg border border-auro-border p-2 text-[10px] text-auro-muted overflow-x-auto max-h-32">
        {JSON.stringify(action.payload, null, 2)}
      </pre>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => handle("confirm")}>
          Confirmar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex-1"
          onClick={() => handle("cancel")}
        >
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
