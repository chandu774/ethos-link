import { useState } from "react";
import { CalendarPlus, Plus, CheckSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const quickActions = [
  { label: "Open AI Chat", href: "/ai-chat", icon: Sparkles },
  { label: "Add Assignment", href: "/assignments", icon: CalendarPlus },
  { label: "Add Task", href: "/chat", icon: CheckSquare },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative space-y-6">
      {children}

      <div className="fixed bottom-6 right-6 z-40">
        <div
          className={cn(
            "mb-2 flex flex-col items-end gap-2 transition-all duration-300",
            open ? "pointer-events-auto opacity-100" : "pointer-events-none translate-y-2 opacity-0"
          )}
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button key={action.label} asChild variant="secondary" className="h-9 rounded-full px-4 shadow-lg">
                <a href={action.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {action.label}
                </a>
              </Button>
            );
          })}
        </div>
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-xl transition-transform duration-300 hover:scale-105"
          onClick={() => setOpen((value) => !value)}
          aria-label="Quick actions"
        >
          <Plus className={cn("h-5 w-5 transition-transform duration-300", open ? "rotate-45" : "")} />
        </Button>
      </div>
    </div>
  );
}
