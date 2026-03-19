import { BookOpenCheck, ListChecks } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";

interface HeroSectionProps {
  name: string;
  assignmentsCount: number;
  openTasks: number;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function HeroSection({ name, assignmentsCount, openTasks }: HeroSectionProps) {
  return (
    <section className="animate-in fade-in-0 slide-in-from-top-2 duration-500">
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/95 via-card/90 to-background/90 p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm text-muted-foreground">{getGreeting()}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep momentum across groups, assignments, and shared tasks.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label="Assignments"
              value={assignmentsCount}
              hint="Total created"
              icon={BookOpenCheck}
              tone="accent"
            />
            <StatCard
              label="Tasks"
              value={openTasks}
              hint="Todo + in progress"
              icon={ListChecks}
              tone="success"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
