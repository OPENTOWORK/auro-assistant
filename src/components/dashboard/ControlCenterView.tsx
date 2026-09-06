"use client";

import { AuroChat } from "@/components/assistant/AuroChat";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TodayAgenda } from "@/components/dashboard/TodayAgenda";
import { DailyBriefingCard } from "@/components/dashboard/DailyBriefing";

export function ControlCenterView() {
  return (
    <div className="space-y-4">
      <section>
        <h1 className="text-xl font-semibold text-auro-text">
          Buenos días, Charly
        </h1>
        <p className="text-sm text-auro-muted mt-0.5">
          {new Date().toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          {" · "}Centro de control Auro
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start">
        <div className="min-w-0">
          <AuroChat />
        </div>
        <aside className="min-w-0 lg:sticky lg:top-[7.5rem] lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <DashboardSidebar />
        </aside>
      </div>

      <DailyBriefingCard />
      <TodayAgenda />
    </div>
  );
}
