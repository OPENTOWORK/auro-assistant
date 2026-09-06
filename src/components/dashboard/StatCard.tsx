import { Card } from "@/components/ui/Card";
import { AppIcon } from "@/components/ui/AppIcon";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  accent?: "blue" | "green" | "amber" | "red" | "purple";
}

const accentColors = {
  blue: "text-blue-400",
  green: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
  purple: "text-purple-400",
};

export function StatCard({ label, value, icon, accent = "blue" }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-auro-surface border border-auro-border text-auro-muted">
          <AppIcon name={icon} className="h-4 w-4" />
        </div>
        <span className={cn("text-3xl font-bold tabular-nums", accentColors[accent])}>
          {value}
        </span>
      </div>
      <p className="text-xs text-auro-muted leading-tight">{label}</p>
    </Card>
  );
}
