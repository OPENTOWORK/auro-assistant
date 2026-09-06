"use client";

import { Header } from "@/components/layout/Header";
import { ProjectsProvider } from "@/components/projects/ProjectsProvider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ProjectsProvider>
      <div className="min-h-screen bg-auro-bg">
        <Header />
        <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-8 lg:px-6">
          {children}
        </main>
      </div>
    </ProjectsProvider>
  );
}
