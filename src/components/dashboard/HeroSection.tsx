import { Link } from "react-router-dom";
import { ArrowRight, Bell, BookOpenCheck, ListChecks, MessageCircleMore, NotebookTabs } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeroSectionProps {
  name: string;
  assignmentsCount: number;
  openTasks: number;
  pendingRequestsCount: number;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function HeroSection({ name, assignmentsCount, openTasks, pendingRequestsCount }: HeroSectionProps) {
  return (
    <section className="animate-in fade-in-0 slide-in-from-top-2 duration-500">
      <div className="overflow-hidden rounded-[32px] border border-border/50 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.20),_transparent_26%),radial-gradient(circle_at_85%_15%,_hsl(var(--accent)/0.18),_transparent_24%),linear-gradient(135deg,_hsl(var(--card)/0.96),_hsl(var(--background)/0.9))] p-5 shadow-elevated md:p-7">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center rounded-full border border-border/60 bg-background/55 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                {getGreeting()}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                {name}
              </h1>
              <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                Your classes, group work, notes, and chat are all in one workspace. Start with the thing
                that needs attention now and keep the rest within reach.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <Button
                asChild
                variant="outline"
                size="icon"
                className="relative self-end rounded-full border-border/60 bg-background/80 shadow-sm"
              >
                <Link to="/notifications" aria-label="Open notifications">
                  <Bell className="h-4 w-4" />
                  {pendingRequestsCount > 0 && (
                    <Badge className="absolute -right-2 -top-2 h-5 min-w-5 px-1 text-[10px]">
                      {pendingRequestsCount}
                    </Badge>
                  )}
                </Link>
              </Button>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Button asChild size="sm" className="rounded-full px-4 shadow-sm">
                  <Link to="/chat">
                    Open chat
                    <MessageCircleMore className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-full px-4">
                  <Link to="/notes">
                    Browse notes
                    <NotebookTabs className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="rounded-full px-4 text-muted-foreground">
                  <Link to="/assignments">
                    See assignments
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label="Assignments"
              value={assignmentsCount}
              hint={assignmentsCount === 0 ? "Create your first deadline to anchor a group" : "Total deadlines in your workspace"}
              icon={BookOpenCheck}
              tone="accent"
            />
            <StatCard
              label="Tasks"
              value={openTasks}
              hint={openTasks === 0 ? "You are clear right now" : "Todo + in progress"}
              icon={ListChecks}
              tone="success"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
