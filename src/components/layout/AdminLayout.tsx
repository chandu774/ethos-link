import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  Shield,
  KeyRound,
  BookOpen,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/faculty", label: "Faculty", icon: Users },
  { to: "/admin/classrooms", label: "Classrooms", icon: Building2 },
  { to: "/admin/teaching-assignments", label: "Teaching Assignments", icon: BookOpen },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActiveRoute = (path: string) => {
    return location.pathname === path || (path !== "/admin/dashboard" && location.pathname.startsWith(path));
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50 dark:bg-zinc-950 text-foreground">
      {/* Desktop Admin Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card/90 backdrop-blur-md sticky top-0 h-screen z-40">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-sm shadow-rose-500/25">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight">SYNAPSE</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold">
                  ADMIN
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-none">Institution Control</p>
            </div>
          </Link>
        </div>

        {/* Status Callout */}
        <div className="px-3 pt-3 pb-1">
          <div className="p-2.5 rounded-xl border bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/40 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Hierarchy Level 1</div>
              <div className="text-xs font-bold text-foreground">Administrator Console</div>
            </div>
            <Shield className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Institutional Oversight
          </div>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-rose-600 text-white shadow-sm shadow-rose-600/25 font-semibold"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4", active ? "text-white" : "text-muted-foreground")} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    active ? "bg-white/20 text-white" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin User Footer */}
        <div className="p-3 border-t bg-card/40 space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/40">
            <Avatar className="h-9 w-9 border border-rose-500/30">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-rose-600/10 text-rose-600 font-semibold text-xs">AD</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{profile?.name || "System Admin"}</div>
              <div className="text-[10px] text-muted-foreground truncate">{profile?.email || "admin@synapse.edu"}</div>
            </div>
          </div>

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
              onClick={async () => {
                await signOut();
                navigate("/admin/login");
              }}
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex h-14 items-center justify-between px-4 border-b bg-card/80 backdrop-blur sticky top-0 z-30">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-rose-600 flex items-center justify-center text-white">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm">SYNAPSE</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-rose-600 border-rose-500/20 font-bold">
              ADMIN
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
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                  <span className="font-bold">Admin Console</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActiveRoute(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                        active ? "bg-rose-600 text-white font-medium" : "text-muted-foreground hover:bg-muted"
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
      </div>
    </div>
  );
}
