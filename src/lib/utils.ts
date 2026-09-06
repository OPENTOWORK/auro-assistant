export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffDays < 7) return `hace ${diffDays} d`;
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

export function formatEventRange(
  startAt: string,
  endAt: string,
  allDay: boolean
): string {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (allDay) {
    return start.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  const sameDay = start.toDateString() === end.toDateString();
  const datePart = start.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const startTime = start.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return sameDay
    ? `${datePart} · ${startTime} – ${endTime}`
    : `${datePart} ${startTime} → ${end.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} ${endTime}`;
}

export function isEventToday(startAt: string): boolean {
  return new Date(startAt).toDateString() === new Date().toDateString();
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
