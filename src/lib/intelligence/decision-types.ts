import type { CalendarEvent, Project, Task } from "@/types/database";

export interface DecisionReason {
  code: string;
  label: string;
  points: number;
}

export interface DecisionProject {
  id: string;
  name: string;
  slug: string;
  priority: number;
  status: Project["status"];
}

export interface DecisionTask {
  id: string;
  title: string;
  description: string | null;
  priority: Task["priority"];
  status: Task["status"];
  project_id: string | null;
  due_at: string | null;
  planned_for: string | null;
  estimated_minutes: number | null;
  blocked_reason: string | null;
  created_at: string;
}

export interface RankedTask {
  task: DecisionTask;
  project: DecisionProject | null;
  score: number;
  reasons: DecisionReason[];
  actionable: boolean;
}

export interface FocusPlan {
  available_minutes: number;
  used_minutes: number;
  remaining_minutes: number;
  selected: RankedTask[];
}

export interface CalendarDecisionContext {
  today_events: CalendarEvent[];
  /**
   * Siguiente evento no terminado dentro de la ventana cargada
   * (en curso, más tarde hoy, o mañana). No implica “de hoy”.
   */
  next_event: CalendarEvent | null;
  /** Eventos que tocan el día `today` en AURO_TIMEZONE. */
  calendar_event_count: number;
}

export interface DailyDecision {
  generated_at: string;
  date: string;
  timezone: string;
  ranked_tasks: RankedTask[];
  recommended: RankedTask[];
  blocked: RankedTask[];
  waiting: RankedTask[];
  overdue: RankedTask[];
  planned_today: RankedTask[];
  focus_plan: FocusPlan | null;
  calendar: CalendarDecisionContext;
}

export interface DecisionEngineInput {
  now: Date;
  today: string;
  timezone: string;
  tasks: Task[];
  projects: Project[];
  events: CalendarEvent[];
  availableMinutes?: number;
}
