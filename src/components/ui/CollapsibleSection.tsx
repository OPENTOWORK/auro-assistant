"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  href?: string;
  hrefLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  count,
  href,
  hrefLabel = "Ver todos →",
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-auro-border bg-auro-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 min-w-0 text-left transition-colors hover:opacity-80"
          aria-expanded={open}
        >
          <span
            className={cn(
              "text-xs text-auro-muted transition-transform duration-200 shrink-0",
              open && "rotate-90"
            )}
          >
            ▶
          </span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-auro-muted truncate">
            {title}
          </h3>
          {count !== undefined && count > 0 && (
            <span className="shrink-0 rounded-full bg-auro-accent/20 px-2 py-0.5 text-[10px] font-medium text-auro-accent">
              {count}
            </span>
          )}
        </button>

        {href && (
          <Link
            href={href}
            className="shrink-0 text-xs text-auro-accent hover:underline"
          >
            {hrefLabel}
          </Link>
        )}
      </div>

      <div
        className={cn(
          "border-t border-auro-border/50 transition-all duration-200 ease-out",
          open ? "visible opacity-100" : "hidden opacity-0"
        )}
      >
        <div className="px-4 pb-4 pt-3 space-y-2">{children}</div>
      </div>
    </section>
  );
}
