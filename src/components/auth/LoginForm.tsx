"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof json.error === "string" ? json.error : "No se pudo iniciar sesión"
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-auro-bg flex items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-auro-text">Auro</h1>
          <p className="text-sm text-auro-muted mt-0.5">Inicia sesión para continuar</p>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-xs text-auro-muted">Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-auro-border bg-auro-bg px-3 py-2 text-sm text-auro-text placeholder:text-auro-muted/50 focus:outline-none focus:border-auro-accent"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-auro-muted">Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-auro-border bg-auro-bg px-3 py-2 text-sm text-auro-text placeholder:text-auro-muted/50 focus:outline-none focus:border-auro-accent"
            />
          </label>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}
