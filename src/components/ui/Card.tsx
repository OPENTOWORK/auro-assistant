import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-auro-border bg-auro-card p-4",
        onClick && "cursor-pointer transition-colors hover:border-auro-accent/40",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
