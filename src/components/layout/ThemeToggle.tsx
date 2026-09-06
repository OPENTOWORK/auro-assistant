"use client";

import { useTheme } from "@/components/layout/ThemeProvider";
import { AppIcon } from "@/components/ui/AppIcon";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-auro-border bg-auro-surface text-auro-muted transition-colors hover:border-auro-accent/50 hover:bg-auro-card hover:text-auro-text"
    >
      <AppIcon
        name={theme === "dark" ? "sun" : "moon"}
        className="h-4 w-4"
      />
    </button>
  );
}
