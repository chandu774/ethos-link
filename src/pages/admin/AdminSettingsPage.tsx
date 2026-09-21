import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Sun, Moon, Laptop, LogOut, ShieldCheck, Mail, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Sign out error:", err);
      navigate("/login", { replace: true });
    }
  };

  return (
    <AdminLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Settings & Preferences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your administrative interface theme and session security
          </p>
        </div>

        {/* Admin Identity Card */}
        <div className="p-6 rounded-3xl border bg-card shadow-card flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar className="h-16 w-16 border-2 border-rose-500/30 shadow-md">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-rose-600/10 text-rose-600 text-xl font-bold">
              AD
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">
                {profile?.name || "System Administrator"}
              </h2>
              <Badge className="bg-rose-600 text-white text-xs">Full Privileges</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {profile?.email || "admin@synapse.edu"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Verified Admin Authority
              </span>
            </div>
          </div>
        </div>

        {/* Appearance / Theme Settings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              Appearance & Theme
            </CardTitle>
            <CardDescription>
              Select your preferred color scheme for the administration dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={theme === "light" ? "default" : "outline"}
                className={`h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border ${
                  theme === "light"
                    ? "bg-rose-600 text-white shadow-sm shadow-rose-500/25"
                    : "hover:bg-muted/70"
                }`}
                onClick={() => setTheme("light")}
              >
                <Sun className="h-5 w-5" />
                <span className="text-xs font-semibold">Light</span>
              </Button>

              <Button
                type="button"
                variant={theme === "dark" ? "default" : "outline"}
                className={`h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border ${
                  theme === "dark"
                    ? "bg-rose-600 text-white shadow-sm shadow-rose-500/25"
                    : "hover:bg-muted/70"
                }`}
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-5 w-5" />
                <span className="text-xs font-semibold">Dark</span>
              </Button>

              <Button
                type="button"
                variant={theme === "system" ? "default" : "outline"}
                className={`h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border ${
                  theme === "system"
                    ? "bg-rose-600 text-white shadow-sm shadow-rose-500/25"
                    : "hover:bg-muted/70"
                }`}
                onClick={() => setTheme("system")}
              >
                <Laptop className="h-5 w-5" />
                <span className="text-xs font-semibold">System</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Theme changes are applied immediately across the portal and persisted locally.
            </p>
          </CardContent>
        </Card>

        {/* Account & Security (Sign Out) */}
        <Card className="shadow-card border-rose-500/20">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              Account & Session Security
            </CardTitle>
            <CardDescription>
              Terminate your active administrative session securely
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-rose-50/30 dark:bg-rose-950/10 border-rose-200/50 dark:border-rose-900/30">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">Sign Out of Synapse</div>
                <div className="text-xs text-muted-foreground">
                  Terminates your authenticated credentials and prevents session restoration via browser back navigation.
                </div>
              </div>
              <Button
                variant="destructive"
                className="bg-rose-600 hover:bg-rose-700 text-white shrink-0 font-medium"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
