import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  Brain,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  NotebookTabs,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { usePendingRequests } from "@/hooks/useConnections";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/notes", label: "Notes", icon: NotebookTabs },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
];

const LAYOUT_NOTIFICATION_TYPES = new Set(["connection_request", "new_assignment", "new_note"]);

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const { data: notifications = [] } = useNotifications(100);
  const { data: pendingRequests = [] } = usePendingRequests();
  const requestNotificationCount = notifications.filter(
    (notification) => !notification.is_read && notification.type === "connection_request"
  ).length;
  const otherNotificationCount = notifications.filter(
    (notification) =>
      !notification.is_read &&
      notification.type !== "connection_request" &&
      LAYOUT_NOTIFICATION_TYPES.has(notification.type)
  ).length;
  const notificationCount = otherNotificationCount + Math.max(requestNotificationCount, pendingRequests.length);

  const isActiveRoute = (path: string) => {
    if (path === "/chat") {
      return location.pathname === "/chat" || location.pathname === "/connections";
    }
    return location.pathname === path;
  };
  const isChatRoute = location.pathname === "/chat" || location.pathname === "/connections";
  const visibleNavItems = navItems.filter((item) => item.to !== "/chat" || !isChatRoute);
  const mobileNavItems = [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/assignments", label: "Tasks", icon: ClipboardList },
    { to: "/chat", label: "Chat", icon: MessageCircle },
    { to: "/notes", label: "Notes", icon: NotebookTabs },
    { to: "/notifications", label: "Alerts", icon: Bell, badge: notificationCount },
  ].filter((item) => item.to !== "/chat" || !isChatRoute);

  const profileName = profile?.name || "Your profile";
  const profileUsername = profile?.username ? `@${profile.username}` : "Student workspace";
  const profileInitial = (profile?.name || profile?.username || "S").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_28%),radial-gradient(circle_at_80%_10%,_hsl(var(--accent)/0.16),_transparent_22%),radial-gradient(circle_at_bottom_right,_hsl(var(--primary)/0.08),_transparent_24%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))]"
      />
      <div className="flex min-h-screen">
        <aside className="group/sidebar fixed inset-y-0 left-0 z-40 hidden md:flex md:w-24 md:hover:w-72 md:transition-[width] md:duration-300">
          <div className="m-3 flex w-full flex-col rounded-[28px] border border-border/60 bg-card/75 p-3 shadow-elevated backdrop-blur-xl">
            <Link to="/dashboard" className="flex items-center gap-3 rounded-2xl px-3 py-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gradient-neural shadow-glow">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
                <span className="block truncate text-lg font-semibold tracking-tight text-gradient-neural">
                  Synapse
                </span>
                <span className="block truncate text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Student workspace
                </span>
              </div>
            </Link>

            <div className="mt-4 flex-1 space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.to);
                const badgeCount = item.to === "/notifications" ? notificationCount : 0;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "group/item flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200 hover:translate-x-1",
                      isActive
                        ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18),0_10px_30px_-18px_hsl(var(--primary)/0.75)]"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-200",
                        isActive
                          ? "bg-primary/12 text-primary"
                          : "bg-background/80 text-muted-foreground group-hover/item:scale-110 group-hover/item:bg-background group-hover/item:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between overflow-hidden">
                      <span className="truncate opacity-0 transition-all duration-200 group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 -translate-x-2">
                        {item.label}
                      </span>
                      {badgeCount > 0 && (
                        <Badge className="ml-3 opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
                          {badgeCount}
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 space-y-2">
              <Link
                to="/profile"
                className="group/profile flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-2.5 transition-all duration-200 hover:border-primary/30 hover:bg-background/80"
              >
                <Avatar className="h-11 w-11 shrink-0 border border-border/60">
                  {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profileName} /> : null}
                  <AvatarFallback className="gradient-neural text-sm font-semibold text-primary-foreground">
                    {profileInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 overflow-hidden opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
                  <p className="truncate text-sm font-semibold text-foreground">{profileName}</p>
                  <p className="truncate text-xs text-muted-foreground">{profileUsername}</p>
                </div>
              </Link>

              <div className="rounded-2xl border border-border/60 bg-background/70 p-2">
              <Button
                variant="ghost"
                className="flex w-full items-center justify-start gap-3 rounded-xl px-3 py-6"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background">
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </div>
                <div className="min-w-0 overflow-hidden text-left opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
                  <p className="truncate text-sm font-medium text-foreground">
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">Switch the look instantly</p>
                </div>
              </Button>
              </div>

              <Button
                variant="ghost"
                className="flex w-full items-center justify-start gap-3 rounded-2xl px-3 py-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  void signOut();
                }}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background">
                  <LogOut className="h-5 w-5" />
                </div>
                <div className="min-w-0 overflow-hidden text-left opacity-0 transition-all duration-200 group-hover/sidebar:opacity-100">
                  <p className="truncate text-sm font-medium">Sign out</p>
                  <p className="truncate text-xs text-muted-foreground">Exit your workspace</p>
                </div>
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col md:pl-24">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-card/75 backdrop-blur-xl md:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-neural">
                  <Brain className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-lg font-semibold text-gradient-neural">Synapse</span>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open quick menu">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[88vw] max-w-xs border-r border-border/60 bg-card/95 p-4 backdrop-blur-xl">
                    <div className="mt-4 space-y-4">
                      <div className="rounded-3xl border border-border/60 bg-background/60 p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border border-border/60">
                            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profileName} /> : null}
                            <AvatarFallback className="gradient-neural text-sm font-semibold text-primary-foreground">
                              {profileInitial}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{profileName}</p>
                            <p className="truncate text-xs text-muted-foreground">{profileUsername}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <SheetClose asChild>
                          <Link
                            to="/profile"
                            className={cn(
                              "flex min-h-12 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200",
                              isActiveRoute("/profile")
                                ? "bg-primary/12 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <User className="h-4 w-4" />
                            <span>Profile</span>
                          </Link>
                        </SheetClose>
                      </div>

                      <Button
                        variant="ghost"
                        className="justify-start rounded-2xl px-3 py-6"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      >
                        {theme === "dark" ? <Sun className="mr-3 h-4 w-4" /> : <Moon className="mr-3 h-4 w-4" />}
                        {theme === "dark" ? "Light mode" : "Dark mode"}
                      </Button>

                      <Button
                        variant="ghost"
                        className="justify-start rounded-2xl px-3 py-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          void signOut();
                        }}
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign out
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden px-4 py-4 pb-24 md:px-8 md:py-8 md:pb-8">
            {children}
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(1.1rem+env(safe-area-inset-bottom))] pt-1 md:hidden">
            <div className="mx-auto max-w-md rounded-[30px] border border-border/70 bg-card/92 px-2 py-2 shadow-[0_-18px_40px_-28px_hsl(var(--foreground)/0.55)] backdrop-blur-xl">
              <div className={cn("grid gap-1", mobileNavItems.length === 4 ? "grid-cols-4" : "grid-cols-5")}>
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.to);
                const badgeCount = item.badge ?? 0;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "relative flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/14 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.16)]"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                    aria-label={item.label}
                  >
                    <div className="relative">
                      <Icon className={cn("h-5 w-5 transition-transform duration-200", isActive ? "scale-110" : "")} />
                      {badgeCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                          {badgeCount > 9 ? "9+" : badgeCount}
                        </span>
                      )}
                    </div>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
