import type {
  Alert,
  Automation,
  Approval,
  CalendarEvent,
  DashboardStats,
  ImportantEmail,
  Lead,
  RecurringTask,
  Task,
} from "@/types/database";

function todayAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysFromNowAt(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const MOCK_STATS: DashboardStats = {
  pendingEmails: 0,
  aiTasks: 0,
  newLeads: 2,
  activeAutomations: 3,
  urgentAlerts: 1,
};

export const MOCK_TASKS: Task[] = [];

export const MOCK_RECURRING_TASKS: RecurringTask[] = [
  {
    id: "rt1",
    title: "Revisar métricas de Dralo",
    description: "Usuarios activos, lecciones completadas y feedback de la semana.",
    frequency: "weekly",
    schedule_day: 1,
    project_id: "p1",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "rt2",
    title: "Publicar vídeo en Cuento Que Fue",
    description: "Subir y programar el episodio semanal.",
    frequency: "weekly",
    schedule_day: 6,
    project_id: "p5",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "rt3",
    title: "Facturación y gastos del mes",
    description: "Revisar ingresos/gastos de todos los proyectos.",
    frequency: "monthly",
    schedule_day: 1,
    project_id: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "rt4",
    title: "Seguimiento patente Tap-up",
    description: "Avances con abogado y estado del expediente.",
    frequency: "monthly",
    schedule_day: 15,
    project_id: "p7",
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export const MOCK_APPROVALS: Approval[] = [];

export const MOCK_ALERTS: Alert[] = [
  {
    id: "al1",
    title: "Dralo: beta pendiente de contenido",
    message: "Faltan 4 unidades para cerrar el MVP de la web de inglés.",
    severity: "critical",
    is_read: false,
    source: "dralo",
    project_id: "p1",
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "al2",
    title: "Workflow n8n falló",
    message: "El workflow Gmail→IA falló a las 08:30.",
    severity: "warning",
    is_read: false,
    source: "n8n",
    project_id: null,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_LEADS: Lead[] = [
  {
    id: "l1",
    name: "María García",
    email: "maria@empresa.com",
    phone: "+34 600 123 456",
    source: "whatsapp",
    status: "new",
    notes: "Interesada en clases de inglés B2",
    project_id: "p1",
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "l2",
    name: "Carlos Ruiz",
    email: "carlos@startup.io",
    phone: null,
    source: "gmail",
    status: "new",
    notes: "Busca entrenador personal zona norte Madrid",
    project_id: "p8",
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_AUTOMATIONS: Automation[] = [
  {
    id: "au1",
    name: "Gmail → IA → Tareas",
    description: "Procesa emails importantes y genera tareas automáticamente.",
    workflow_id: "wf_gmail_ai",
    is_active: true,
    last_run_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    last_status: "success",
    created_at: new Date().toISOString(),
  },
  {
    id: "au2",
    name: "WhatsApp → Leads Dralo",
    description: "Captura leads de alumnos interesados en inglés.",
    workflow_id: "wf_wa_dralo",
    is_active: true,
    last_run_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    last_status: "success",
    created_at: new Date().toISOString(),
  },
  {
    id: "au3",
    name: "Pedidos 3D → Presupuesto",
    description: "Genera presupuesto automático para Pokebolas.",
    workflow_id: "wf_3d_quote",
    is_active: true,
    last_run_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    last_status: "error",
    created_at: new Date().toISOString(),
  },
];

export const MOCK_EMAILS: ImportantEmail[] = [
  {
    id: "e1",
    subject: "RE: Colaboración contenido inglés B1",
    sender: "profesora@academia.com",
    snippet: "Me interesa colaborar con Dralo en el módulo de conversación...",
    gmail_id: null,
    is_processed: false,
    received_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "e2",
    subject: "Candidato senior disponible",
    sender: "rrhh@empresa.com",
    snippet: "Tenemos un perfil senior que encaja con vuestra ETT...",
    gmail_id: null,
    is_processed: false,
    received_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "ce1",
    title: "Revisión contenidos Dralo",
    description: "Sesión de trabajo en la estructura de lecciones B1",
    start_at: todayAt(11, 0),
    end_at: todayAt(12, 30),
    all_day: false,
    calendar_name: "Personal",
    location: null,
    html_link: null,
    google_event_id: null,
    project_id: "p1",
    created_at: new Date().toISOString(),
  },
  {
    id: "ce2",
    title: "Entrevista candidato — Open To Work",
    description: "Entrevista técnica con candidato senior",
    start_at: daysFromNowAt(1, 10, 0),
    end_at: daysFromNowAt(1, 10, 45),
    all_day: false,
    calendar_name: "Trabajo",
    location: "Google Meet",
    html_link: null,
    google_event_id: null,
    project_id: "p2",
    created_at: new Date().toISOString(),
  },
  {
    id: "ce3",
    title: "Grabación Cuento Que Fue",
    description: "Grabar episodio semanal del canal",
    start_at: daysFromNowAt(2, 18, 0),
    end_at: daysFromNowAt(2, 20, 0),
    all_day: false,
    calendar_name: "Personal",
    location: "Estudio casa",
    html_link: null,
    google_event_id: null,
    project_id: "p5",
    created_at: new Date().toISOString(),
  },
  {
    id: "ce4",
    title: "Seguimiento patente Tap-up",
    description: "Llamada con asesor de patentes",
    start_at: daysFromNowAt(4, 9, 0),
    end_at: daysFromNowAt(4, 10, 0),
    all_day: false,
    calendar_name: "Trabajo",
    location: null,
    html_link: null,
    google_event_id: null,
    project_id: "p7",
    created_at: new Date().toISOString(),
  },
  {
    id: "ce5",
    title: "Entreno demo TuFitMentor360",
    description: "Sesión de prueba con cliente potencial",
    start_at: daysFromNowAt(6, 17, 0),
    end_at: daysFromNowAt(6, 18, 0),
    all_day: false,
    calendar_name: "Personal",
    location: "Domicilio cliente",
    html_link: null,
    google_event_id: null,
    project_id: "p8",
    created_at: new Date().toISOString(),
  },
];

export function getUpcomingCalendarEvents(
  events: CalendarEvent[],
  limit = 7
): CalendarEvent[] {
  const now = new Date();
  return [...events]
    .filter((e) => new Date(e.end_at) >= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, limit);
}

export function getMockTask(id: string): Task | undefined {
  return MOCK_TASKS.find((t) => t.id === id);
}

export function getMockApprovalForTask(taskId: string): Approval | undefined {
  return MOCK_APPROVALS.find((a) => a.task_id === taskId);
}

export function getTasksByProject(projectId: string, tasks: Task[]): Task[] {
  return tasks.filter((t) => t.project_id === projectId);
}

export function countTasksByProject(projectId: string, tasks: Task[]): number {
  return tasks.filter(
    (t) =>
      t.project_id === projectId &&
      (t.status === "pending" ||
        t.status === "in_progress" ||
        t.status === "waiting_approval")
  ).length;
}
