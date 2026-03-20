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
  default: "from-card/90 via-card/75 to-background/80",
  accent: "from-primary/20 via-primary/10 to-background/80",
  success: "from-emerald-500/20 via-emerald-500/10 to-background/80",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <Card
      className={cn(
        "group overflow-hidden rounded-[28px] border border-border/50 bg-gradient-to-br p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated",
        toneClasses[tone]
      )}
    >
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint ? <p className="max-w-xs text-sm leading-6 text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/65 text-primary shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:bg-primary/10 group-hover:shadow-glow">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
