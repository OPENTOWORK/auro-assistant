import { cn } from "@/lib/utils";
import { getIconComponent } from "@/lib/icons";
import type { LucideProps } from "lucide-react";

interface AppIconProps extends LucideProps {
  name: string;
}

export function AppIcon({ name, className, strokeWidth = 1.75, ...props }: AppIconProps) {
  const Icon = getIconComponent(name);
  return (
    <Icon
      className={cn("shrink-0", className)}
      strokeWidth={strokeWidth}
      aria-hidden
      {...props}
    />
  );
}

interface ProjectIconProps {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: { box: "h-8 w-8", icon: "h-3.5 w-3.5" },
  md: { box: "h-9 w-9", icon: "h-4 w-4" },
  lg: { box: "h-12 w-12", icon: "h-5 w-5" },
};

export function ProjectIcon({
  name,
  color = "#3b82f6",
  size = "md",
  className,
}: ProjectIconProps) {
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border border-auro-border bg-auro-surface/80",
        sizes.box,
        className
      )}
      style={{ color }}
    >
      <AppIcon name={name} className={sizes.icon} />
    </div>
  );
}

interface ProjectLabelProps {
  name: string;
  icon: string;
  color?: string;
  className?: string;
}

export function ProjectLabel({
  name,
  icon,
  color,
  className,
}: ProjectLabelProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 min-w-0", className)}
      style={color ? { color } : undefined}
    >
      <AppIcon name={icon} className="h-3 w-3 shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  );
}
