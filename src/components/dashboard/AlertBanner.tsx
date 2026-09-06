import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/ui/AppIcon";
import type { Alert } from "@/types/database";

interface AlertBannerProps {
  alert: Alert;
}

const severityStyles = {
  info: "border-blue-500/30 bg-blue-500/10",
  warning: "border-amber-500/30 bg-amber-500/10",
  critical: "border-red-500/30 bg-red-500/10 animate-pulse",
};

const severityIcons = {
  info: "info",
  warning: "alert-triangle",
  critical: "alert-octagon",
} as const;

export function AlertBanner({ alert }: AlertBannerProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 flex items-start gap-2.5",
        severityStyles[alert.severity]
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-auro-bg/50 text-auro-text">
        <AppIcon name={severityIcons[alert.severity]} className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-auro-text">{alert.title}</p>
        {alert.message && (
          <p className="text-xs text-auro-muted mt-0.5">{alert.message}</p>
        )}
      </div>
    </div>
  );
}
