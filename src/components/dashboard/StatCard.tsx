import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "accent" | "success";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "from-card/80 to-card/40",
  accent: "from-primary/20 to-primary/5",
  success: "from-emerald-500/15 to-emerald-500/5",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <Card
      className={cn(
        "group border-border/40 bg-gradient-to-br p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
        toneClasses[tone]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="rounded-xl border border-border/50 bg-background/50 p-2 text-primary transition-colors group-hover:bg-primary/10">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

