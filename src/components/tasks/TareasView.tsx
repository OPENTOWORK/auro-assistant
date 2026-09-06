"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { RecurringTasksTable } from "@/components/tasks/RecurringTasksTable";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { NewAlertForm } from "@/components/alerts/NewAlertForm";
import { NewTaskForm } from "@/components/tasks/NewTaskForm";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { useDashboardData } from "@/hooks/useDashboardData";
import { isSupabaseConfigured } from "@/lib/config";
import { getLocalTasks } from "@/lib/local-tasks";
import type { Alert, RecurringTask, Task } from "@/types/database";
import type { CreatedItem } from "@/components/tasks/NewTaskForm";

export function TareasView() {
  const { recurringTasks, loading: dashboardLoading, refresh } =
    useDashboardData();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [recurringTasksLocal, setRecurringTasksLocal] = useState<RecurringTask[]>([]);

  const allRecurring =
    recurringTasksLocal.length > 0 ? recurringTasksLocal : recurringTasks;

  const loadData = useCallback(async () => {
    setTableMissing(false);

    if (isSupabaseConfigured()) {
      try {
        const [tasksRes, alertsRes, recurringRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/alerts"),
          fetch("/api/recurring-tasks"),
        ]);
        const tasksJson = await tasksRes.json();
        const alertsJson = await alertsRes.json();
        const recurringJson = await recurringRes.json();

        if (tasksRes.ok) {
          setTasks(tasksJson.tasks ?? []);
          setTableMissing(Boolean(tasksJson.tableMissing));
        } else {
          setTasks([]);
        }

        if (alertsRes.ok) {
          setAlerts(alertsJson.alerts ?? []);
          setTableMissing(
            (prev) => prev || Boolean(alertsJson.tableMissing)
          );
        } else {
          setAlerts([]);
        }

        if (recurringRes.ok) {
          setRecurringTasksLocal(recurringJson.tasks ?? []);
          setTableMissing(
            (prev) => prev || Boolean(recurringJson.tableMissing)
          );
        } else {
          setRecurringTasksLocal([]);
        }
      } catch {
        setTasks([]);
        setAlerts([]);
        setRecurringTasksLocal([]);
      }
    } else {
      setTasks(getLocalTasks());
      setAlerts([]);
      setRecurringTasksLocal([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleItemCreated(result: CreatedItem) {
    if (result.kind === "alert") {
      setAlerts((prev) => [result.item, ...prev]);
    } else if (result.kind === "task") {
      setTasks((prev) => [result.item, ...prev]);
    } else {
      setRecurringTasksLocal((prev) => [...prev, result.item]);
    }
    setShowTaskForm(false);
    setTableMissing(false);
    refresh();
  }

  function handleAlertCreated(alert: Alert) {
    setAlerts((prev) => [alert, ...prev]);
    setShowAlertForm(false);
    refresh();
  }

  async function dismissAlert(id: string) {
    await fetch(`/api/alerts/${id}`, { method: "PATCH" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    refresh();
  }

  const pageLoading = loading || dashboardLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-auro-text">Tareas</h2>
          <p className="text-sm text-auro-muted">
            {pageLoading
              ? "Cargando..."
              : `${alerts.length} alertas · ${tasks.length} prioritarias · ${allRecurring.length} recurrentes`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!showAlertForm && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAlertForm(true);
                setShowTaskForm(false);
              }}
            >
              + Alerta
            </Button>
          )}
          {!showTaskForm && (
            <Button
              size="sm"
              onClick={() => {
                setShowTaskForm(true);
                setShowAlertForm(false);
              }}
            >
              + Nueva
            </Button>
          )}
        </div>
      </div>

      {tableMissing && (
        <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Faltan tablas en Supabase. Ejecuta{" "}
          <code className="text-amber-200">npm run db:migrate</code> desde la
          raíz del proyecto.
        </p>
      )}

      {showAlertForm && (
        <NewAlertForm
          onCreated={handleAlertCreated}
          onCancel={() => setShowAlertForm(false)}
        />
      )}

      {showTaskForm && (
        <NewTaskForm
          onCreated={handleItemCreated}
          onCancel={() => setShowTaskForm(false)}
        />
      )}

      <CollapsibleSection
        title="Alertas urgentes"
        count={alerts.length}
        defaultOpen={alerts.length > 0}
      >
        {pageLoading ? (
          <p className="text-sm text-auro-muted py-2">Cargando alertas...</p>
        ) : alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="space-y-1">
                <AlertBanner alert={alert} />
                <button
                  type="button"
                  onClick={() => dismissAlert(alert.id)}
                  className="text-[10px] text-auro-muted hover:text-auro-text px-1"
                >
                  Marcar como leída
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-auro-muted py-2">
            Sin alertas urgentes. Usa &quot;+ Alerta&quot; para crear una.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Tareas prioritarias" count={tasks.length} defaultOpen>
        {pageLoading ? (
          <p className="text-sm text-auro-muted py-2">Cargando tareas...</p>
        ) : tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <p className="text-sm text-auro-muted py-2">
            Sin tareas pendientes. Usa &quot;+ Nueva&quot; para crear una.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Tareas mensuales / semanales"
        count={allRecurring.length}
        defaultOpen
      >
        <RecurringTasksTable
          tasks={allRecurring}
          loading={pageLoading}
          onUpdated={(task) => {
            setRecurringTasksLocal((prev) =>
              prev.map((t) => (t.id === task.id ? task : t))
            );
            refresh();
          }}
          onDeleted={(id) => {
            setRecurringTasksLocal((prev) => prev.filter((t) => t.id !== id));
            refresh();
          }}
        />
      </CollapsibleSection>
    </div>
  );
}
