import { Link, useLocation } from "react-router-dom";
import { Brain, ClipboardList, Home, NotebookTabs, User, MessageCircle, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/notes", label: "Notes", icon: NotebookTabs },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-neural">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-gradient-neural">
              Synapse
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.to ||
                (item.to === "/chat" &&
                  (location.pathname === "/connections" || location.pathname === "/requests"));
              
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-xs p-4">
                <div className="mt-8 flex flex-col gap-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      location.pathname === item.to ||
                      (item.to === "/chat" &&
                        (location.pathname === "/connections" || location.pathname === "/requests"));

                    return (
                      <SheetClose asChild key={item.to}>
                        <Link
                          to={item.to}
                          className={cn(
                            "flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8">
        {children}
      </main>
    </div>
  );
}
