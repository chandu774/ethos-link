import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import StudentProfile from "./student/StudentProfile";
import { useAuth } from "@/contexts/AuthContext";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Mail, ShieldCheck, Sun, Moon, Laptop, LogOut, KeyRound, Settings } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { role, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
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

  if (role === "faculty") {
    return (
      <FacultyLayout>
        <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div className="pb-2 border-b">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Settings
            </h1>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl border bg-card shadow-card flex flex-col sm:flex-row sm:items-center gap-5">
            <Avatar className="h-20 w-20 border-2 border-indigo-500/30 shadow-md">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-indigo-600/10 text-indigo-600 text-2xl font-bold">
                AT
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">{profile?.name || "Dr. Aris Thorne"}</h2>
                <Badge className="bg-indigo-600 text-white text-xs">Verified Faculty</Badge>
              </div>
              <p className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-indigo-600" />
                Associate Professor • Department of Computer Science & Engineering
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {profile?.email || "dr.thorne@synapse.edu"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  Lead Instructor: DBMS (CS301)
                </span>
              </div>
            </div>
          </div>

          {/* Faculty Credentials & Cohorts */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">Faculty Credentials & Assigned Cohorts</CardTitle>
              <CardDescription>Academic appointment and teaching allocations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Designation</div>
                  <div className="font-semibold text-foreground">Associate Professor of Computer Science</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Primary Subject Area</div>
                  <div className="font-semibold text-foreground">Database Management Systems & Systems Architecture</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Active Cohort 1</div>
                  <div className="font-semibold text-foreground">CS301: DBMS - CSE 3A (62 Students)</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Active Cohort 2</div>
                  <div className="font-semibold text-foreground">CS302: OS - CSE 3A (58 Students)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance / Theme Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sun className="h-5 w-5 text-amber-500" />
                Appearance & Theme
              </CardTitle>
              <CardDescription>
                Customize your faculty workspace appearance across all instruction modules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant={theme === "light" ? "default" : "outline"}
                  className={`h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border ${
                    theme === "light"
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
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
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
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
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                      : "hover:bg-muted/70"
                  }`}
                  onClick={() => setTheme("system")}
                >
                  <Laptop className="h-5 w-5" />
                  <span className="text-xs font-semibold">System</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Theme changes are persisted to your browser session and synchronize across all views.
              </p>
            </CardContent>
          </Card>

          {/* Account & Security (Sign Out) */}
          <Card className="shadow-card border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Account & Session Security
              </CardTitle>
              <CardDescription>
                Manage your active authenticated faculty session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">Sign Out of Synapse</div>
                  <div className="text-xs text-muted-foreground">
                    End your active session securely. Browser back navigation cannot restore this session.
                  </div>
                </div>
                <Button
                  variant="destructive"
                  className="bg-destructive hover:bg-destructive/90 text-white shrink-0 font-medium"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </FacultyLayout>
    );
  }

  return <StudentProfile />;
}
