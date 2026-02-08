import { cn } from "@/lib/utils";

interface TrustBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function TrustBadge({ score, size = "md", showLabel = false }: TrustBadgeProps) {
  const getColor = () => {
    if (score >= 80) return "bg-trust text-trust-foreground";
    if (score >= 60) return "bg-primary text-primary-foreground";
    if (score >= 40) return "bg-accent text-accent-foreground";
    return "bg-muted text-muted-foreground";
  };

  const sizeClasses = {
    sm: "h-6 px-2 text-xs",
    md: "h-8 px-3 text-sm",
    lg: "h-10 px-4 text-base",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        getColor(),
        sizeClasses[size]
      )}
    >
      <span>{score}</span>
      {showLabel && <span className="opacity-80">Trust</span>}
    </div>
  );
}
