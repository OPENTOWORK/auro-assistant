"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { APP_LOGO_ICON, NAV_ICONS } from "@/lib/icons";

const navItems = [
  { href: "/", label: "Panel", icon: NAV_ICONS.panel },
  { href: "/proyectos", label: "Proyectos", icon: NAV_ICONS.proyectos },
  { href: "/tareas", label: "Tareas", icon: NAV_ICONS.tareas },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-auro-border bg-auro-bg/95 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-7xl px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-auro-accent/15 text-auro-accent">
              <AppIcon name={APP_LOGO_ICON} className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-auro-text tracking-wide">
                Auro
              </h1>
              <p className="text-[10px] text-auro-muted -mt-0.5">
                Asistente Personal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-auro-muted">Activo</span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleLogout}>
              Salir
            </Button>
          </div>
        </div>

        <nav className="mt-3 flex gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-auro-accent/20 text-auro-accent"
                    : "text-auro-muted hover:text-auro-text hover:bg-auro-surface"
                }`}
              >
                <AppIcon name={item.icon} className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
