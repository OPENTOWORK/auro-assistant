export type TaskSource =
  | "gmail"
  | "dralo"
  | "youtube"
  | "training"
  | "invoice"
  | "manual";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "waiting_approval"
  | "done"
  | "rejected";

export type ApprovalActionType =
  | "send_email"
  | "create_client"
  | "update_database"
  | "publish_content";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ProjectType =
  | "education"
  | "recruitment"
  | "ecommerce"
  | "wellness"
  | "youtube"
  | "patent"
  | "fitness"
  | "brand";

export type ProjectStatus =
  | "in_progress"
  | "established"
  | "active"
  | "paused";

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  priority: number;
  icon: string;
  color: string;
  url?: string | null;
  created_at: string;
  objective: string | null;
  deadline: string | null;
  next_action: string | null;
  blocked_reason: string | null;
  last_activity_at: string;
}

export type RecurringFrequency = "weekly" | "monthly";

export interface RecurringTask {
  id: string;
  title: string;
  description: string | null;
  frequency: RecurringFrequency;
  /** Día de la semana (0=domingo) para semanales, o día del mes (1-31) para mensuales */
  schedule_day: number;
  project_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  source: TaskSource;
  priority: TaskPriority;
  status: TaskStatus;
  ai_summary: string | null;
  suggested_action: string | null;
  project_id: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  due_at: string | null;
  planned_for: string | null;
  estimated_minutes: number | null;
  blocked_reason: string | null;
  completed_at: string | null;
}

export interface Approval {
  id: string;
  task_id: string;
  action_type: ApprovalActionType;
  proposed_payload: Record<string, unknown>;
  status: ApprovalStatus;
  reviewed_at: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  title: string;
  message: string | null;
  severity: "info" | "warning" | "critical";
  is_read: boolean;
  source: string | null;
  project_id: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: "new" | "contacted" | "qualified" | "lost";
  notes: string | null;
  project_id: string | null;
  created_at: string;
}

export interface Automation {
  id: string;
  name: string;
  description: string | null;
  workflow_id: string | null;
  is_active: boolean;
  last_run_at: string | null;
  last_status: "success" | "error" | "running" | "unknown";
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  calendar_name: string;
  location: string | null;
  html_link: string | null;
  google_event_id: string | null;
  project_id: string | null;
  created_at: string;
}

export interface ImportantEmail {
  id: string;
  subject: string;
  sender: string;
  snippet: string | null;
  gmail_id: string | null;
  is_processed: boolean;
  received_at: string;
  created_at: string;
}

export interface DashboardStats {
  pendingEmails: number;
  aiTasks: number;
  newLeads: number;
  activeAutomations: number;
  urgentAlerts: number;
}
