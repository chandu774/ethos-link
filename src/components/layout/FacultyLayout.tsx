import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardList,
  FileCheck2,
  Video,
  CalendarCheck,
  BarChart3,
  Lightbulb,
  Settings,
  Menu,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useSynapse } from "@/hooks/useSynapse";
import { toast } from "sonner";

interface FacultyLayoutProps {
  children: React.ReactNode;
}

const facultyNavItems = [
  { to: "/faculty/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/faculty/classrooms", label: "My Classrooms", icon: BookOpen },
  { to: "/faculty/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/faculty/quizzes", label: "Quizzes", icon: FileCheck2 },
  { to: "/faculty/lectures", label: "Lectures", icon: Video },
  { to: "/faculty/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/faculty/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/faculty/ai-insights", label: "AI Insights", icon: Lightbulb, highlight: true },
  { to: "/faculty/profile", label: "Settings", icon: Settings },
];

const facultyMobileNavItems = [
  { to: "/faculty/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/faculty/classrooms", label: "Classes", icon: BookOpen },
  { to: "/faculty/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/faculty/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/faculty/analytics", label: "Analytics", icon: BarChart3 },
];

export function FacultyLayout({ children }: FacultyLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const synapse = useSynapse();

  const [mobileOpen, setMobileOpen] = useState(false);

  const isActiveRoute = (path: string) => {
    if (path === "/faculty/classrooms") {
      return location.pathname.startsWith("/faculty/classrooms") || location.pathname.startsWith("/faculty/teaching");
    }
    if (path === "/faculty/assignments") {
      return location.pathname.startsWith("/faculty/assignments");
    }
    if (path === "/faculty/quizzes") {
      return location.pathname.startsWith("/faculty/quizzes");
    }
    return location.pathname === path;
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50 dark:bg-zinc-950 text-foreground">
      {/* Desktop Faculty Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card/90 backdrop-blur-md sticky top-0 h-screen z-40">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b">
          <Link to="/faculty/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight">SYNAPSE</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                  FACULTY
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-none">Academic Management</p>
            </div>
          </Link>
        </div>

        {/* Faculty Active Cohort Badge */}
        <div className="px-3 pt-3 pb-1">
          <div className="p-2.5 rounded-xl border bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-900/40 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Active Cohorts</div>
              <div className="text-xs font-bold text-foreground">DBMS - CSE 3A & OS</div>
            </div>
            <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Instruction & Insights
          </div>
          {facultyNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-semibold"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  item.highlight && !active && "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/15"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4", active ? "text-white" : item.highlight ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    active ? "bg-white/20 text-white" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Faculty Footer Profile Section */}
        <div className="p-3 border-t bg-card/40">
          <Link
            to="/faculty/profile"
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 transition-colors group"
          >
            <Avatar className="h-9 w-9 border border-indigo-500/30">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-indigo-600/10 text-indigo-600 font-semibold text-xs">AT</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate group-hover:text-indigo-600 transition-colors">
                {profile?.name || "Dr. Aris Thorne"}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Associate Professor • CSE
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Mobile Top Header */}
        <header className="lg:hidden flex h-14 items-center justify-between px-4 border-b bg-card/80 backdrop-blur sticky top-0 z-30">
          <Link to="/faculty/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm">SYNAPSE</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-indigo-600 border-indigo-500/20">
              FACULTY
            </Badge>
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-indigo-600" />
                  <span className="font-bold">Faculty Portal</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {facultyNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActiveRoute(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                        active ? "bg-indigo-600 text-white font-medium" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Children View */}
        <main className="flex-1">
          {children}
        </main>

        {/* Mobile Faculty Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 border-t bg-card/95 backdrop-blur z-30 flex items-center justify-around px-2">
          {facultyMobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-14 py-1 text-[10px] font-medium transition-colors",
                  active ? "text-indigo-600 font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "scale-110 text-indigo-600")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
