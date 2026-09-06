import {
  AlertOctagon,
  AlertTriangle,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  CheckSquare,
  Dumbbell,
  Flame,
  Folder,
  FolderKanban,
  Home,
  Info,
  Languages,
  LayoutDashboard,
  Lightbulb,
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  Moon,
  Pencil,
  Play,
  Printer,
  Receipt,
  Sparkles,
  Sun,
  Trash2,
  Tv,
  Video,
  Brain,
  Heart,
  Box,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import type { TaskSource } from "@/types/database";

export const ICON_MAP: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  home: Home,
  "folder-kanban": FolderKanban,
  folder: Folder,
  "check-square": CheckSquare,
  bot: Bot,
  sparkles: Sparkles,
  languages: Languages,
  briefcase: Briefcase,
  printer: Printer,
  heart: Heart,
  tv: Tv,
  video: Video,
  brain: Brain,
  lightbulb: Lightbulb,
  dumbbell: Dumbbell,
  flame: Flame,
  box: Box,
  mail: Mail,
  "message-circle": MessageCircle,
  youtube: Play,
  "book-open": BookOpen,
  receipt: Receipt,
  pencil: Pencil,
  info: Info,
  "alert-triangle": AlertTriangle,
  "alert-octagon": AlertOctagon,
  calendar: Calendar,
  "map-pin": MapPin,
  sun: Sun,
  moon: Moon,
  mic: Mic,
  trash: Trash2,
  check: Check,
  x: X,
};

/** Emojis legacy → iconos Lucide */
const LEGACY_EMOJI_MAP: Record<string, string> = {
  "🏠": "home",
  "📁": "folder",
  "✅": "check-square",
  "🤖": "bot",
  "🇬🇧": "languages",
  "💼": "briefcase",
  "🖨️": "printer",
  "🧘": "heart",
  "📺": "tv",
  "🧠": "brain",
  "💡": "lightbulb",
  "💪": "dumbbell",
  "🔥": "flame",
  "✉️": "mail",
  "💬": "message-circle",
  "▶️": "youtube",
  "📚": "book-open",
  "🧾": "receipt",
  "✏️": "pencil",
  "ℹ️": "info",
  "⚠️": "alert-triangle",
  "🚨": "alert-octagon",
  "📅": "calendar",
  "📍": "map-pin",
  "☀️": "sun",
  "🌙": "moon",
  "🗑️": "trash",
};

export const PROJECT_ICON_OPTIONS = [
  { name: "folder", label: "Carpeta" },
  { name: "languages", label: "Idiomas" },
  { name: "briefcase", label: "Negocio" },
  { name: "printer", label: "Impresión" },
  { name: "heart", label: "Bienestar" },
  { name: "tv", label: "YouTube" },
  { name: "brain", label: "Mente" },
  { name: "lightbulb", label: "Idea" },
  { name: "dumbbell", label: "Fitness" },
  { name: "flame", label: "Marca" },
  { name: "box", label: "Producto" },
  { name: "video", label: "Vídeo" },
  { name: "sparkles", label: "Destacado" },
] as const;

export const SOURCE_ICON_NAMES: Record<TaskSource, string> = {
  gmail: "mail",
  dralo: "message-circle",
  youtube: "youtube",
  training: "book-open",
  invoice: "receipt",
  manual: "pencil",
};

export function resolveIconName(name: string): string {
  const trimmed = name.trim();
  if (LEGACY_EMOJI_MAP[trimmed]) return LEGACY_EMOJI_MAP[trimmed];
  if (ICON_MAP[trimmed]) return trimmed;
  return "folder";
}

export function getIconComponent(name: string): LucideIcon {
  const resolved = resolveIconName(name);
  return ICON_MAP[resolved] ?? Folder;
}

export const NAV_ICONS = {
  panel: "layout-dashboard",
  proyectos: "folder-kanban",
  tareas: "check-square",
} as const;

export const APP_LOGO_ICON = "sparkles";
