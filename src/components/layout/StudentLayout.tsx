import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Brain,
  Home,
  Compass,
  CheckSquare,
  BookOpen,
  NotebookTabs,
  Video,
  FileCheck2,
  TrendingUp,
  Sparkles,
  Award,
  User,
  LogOut,
  Moon,
  Sun,
  Menu,
  ChevronRight,
  ClipboardList,
  Volume2,
  Layers,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useSynapse } from "@/hooks/useSynapse";
import { ForceChangePasswordModal } from "@/components/auth/ForceChangePasswordModal";
import { VoiceControlWidget } from "@/components/accessibility/VoiceControlWidget";
import { toast } from "sonner";

interface StudentLayoutProps {
  children: React.ReactNode;
}

const studentNavItems = [
  { to: "/student/dashboard", label: "Home", icon: Home },
  { to: "/student/learning", label: "My Learning", icon: Compass, badge: "gaps" },
  { to: "/student/classrooms", label: "Classrooms", icon: BookOpen },
  { to: "/student/tasks", label: "Tasks", icon: CheckSquare, badge: "tasks" },
  { to: "/student/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/student/lectures", label: "Lectures", icon: Video },
  { to: "/student/quizzes", label: "Quizzes", icon: FileCheck2 },
  { to: "/student/progress", label: "Progress", icon: TrendingUp },
  { to: "/student/notes", label: "Notes", icon: NotebookTabs },
  { to: "/student/ai-tutor", label: "AI Tutor", icon: Sparkles, highlight: true },
  { to: "/student/opportunities", label: "Opportunities", icon: Award },
  { to: "/student/profile", label: "My Profile", icon: User },
];

const mobileNavItems = [
  { to: "/student/dashboard", label: "Home", icon: Home },
  { to: "/student/learning", label: "Learn", icon: Compass },
  { to: "/student/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/student/ai-tutor", label: "AI", icon: Sparkles },
  { to: "/student/profile", label: "Profile", icon: User },
];

export function StudentLayout({ children }: StudentLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { profile, signOut, enterDemoMode } = useAuth();
  const synapse = useSynapse();

  const [mobileOpen, setMobileOpen] = useState(false);

  const isActiveRoute = (path: string) => {
    if (path === "/student/classrooms") {
      return location.pathname.startsWith("/student/classrooms");
    }
    if (path === "/student/lectures") {
      return location.pathname.startsWith("/student/lectures");
    }
    if (path === "/student/quizzes") {
      return location.pathname.startsWith("/student/quizzes") || location.pathname.startsWith("/assessments");
    }
    if (path === "/student/assignments") {
      return location.pathname.startsWith("/student/assignments") || location.pathname.startsWith("/assignments");
    }
    return location.pathname === path;
  };

  const pendingTasksCount = (synapse.tasks || []).filter((t) => t && t.status !== "completed").length;
  const gapCount = (synapse.concepts || []).filter((c) => c && c.status === "gap").length;

  const handleSpeakSummary = () => {
    const text = `Hello ${profile?.name || "Alex"}. Your learning health is ${synapse.learningHealth} percent. You have ${pendingTasksCount} pending tasks and ${gapCount} topic needing practice: Second Normal Form.`;
    synapse.speakText(text);
    toast.info("Reading your daily academic summary aloud...");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Student Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card/60 backdrop-blur-md sticky top-0 h-screen z-40">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b">
          <Link to="/student/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight">SYNAPSE</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                  STUDENT
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-none">Personalized Companion</p>
            </div>
          </Link>
        </div>

        {/* Academic Health Quick Card */}
        <div className="px-3 pt-3 pb-1">
          <div className="p-2.5 rounded-xl border bg-card/40 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[11px] font-medium text-muted-foreground">Learning Health</div>
              <div className="text-base font-bold text-primary flex items-center gap-1.5">
                {synapse.learningHealth}%
                <span className="text-[10px] font-normal text-emerald-500">Good</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={handleSpeakSummary}
              title="Auditory Briefing (TTS)"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Learn & Track
          </div>
          {studentNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  item.highlight && !active && "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4", active ? "text-primary-foreground" : item.highlight ? "text-primary" : "text-muted-foreground")} />
                  <span>{item.label}</span>
                </div>
                {item.badge === "tasks" && pendingTasksCount > 0 && (
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", active ? "bg-primary-foreground text-primary" : "bg-primary/15 text-primary")}>
                    {pendingTasksCount}
                  </span>
                )}
                {item.badge === "gaps" && gapCount > 0 && (
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", active ? "bg-amber-100 text-amber-900" : "bg-amber-500/15 text-amber-600 dark:text-amber-400")}>
                    {gapCount} gap
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Footer & Switcher */}
        <div className="p-3 border-t bg-card/40 space-y-2">
          <Link
            to="/student/profile"
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 transition-colors"
          >
            <Avatar className="h-9 w-9 border border-primary/20">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">AC</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{profile?.name || "Alex Chen"}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {profile?.roll_number || "CS22B042"} • CSE 3A
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>

          <div className="flex items-center justify-between pt-1 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5 mr-1" /> : <Moon className="h-3.5 w-3.5 mr-1" />}
              {theme === "dark" ? "Light" : "Dark"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                signOut();
                navigate("/auth");
              }}
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Mobile Top Header */}
        <header className="lg:hidden flex h-14 items-center justify-between px-4 border-b bg-card/80 backdrop-blur sticky top-0 z-30">
          <Link to="/student/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Brain className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm">SYNAPSE</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-primary border-primary/20">
              STUDENT
            </Badge>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSpeakSummary}
              title="Listen"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <span className="font-bold">Student Portal</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {studentNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActiveRoute(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                          active ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"
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
          </div>
        </header>

        {/* Main Children View */}
        <main className="flex-1">
          <ForceChangePasswordModal />
          {children}
          <VoiceControlWidget />
        </main>

        {/* Mobile Student Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 border-t bg-card/95 backdrop-blur z-30 flex items-center justify-around px-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-14 py-1 text-[10px] font-medium transition-colors",
                  active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "scale-110 text-primary")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
