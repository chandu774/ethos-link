import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Eye, EyeOff, Lock, UserCheck, Loader2, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const navigate = useNavigate();
  const {
    loginWithIdentifier,
    updatePassword,
    user,
    role,
    loading: authLoading,
  } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  // If already authenticated and not loading, redirect to the appropriate portal
  useEffect(() => {
    if (user && !authLoading) {
      if (role === "administrator") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "faculty") {
        navigate("/faculty/dashboard", { replace: true });
      } else {
        navigate("/student/dashboard", { replace: true });
      }
    }
  }, [user, role, authLoading, navigate]);

  // Detect Supabase recovery / reset flow from URL
  useEffect(() => {
    const hash = window.location.hash ?? "";
    const search = window.location.search ?? "";
    const isRecovery = hash.includes("type=recovery") || search.includes("type=recovery");
    setIsRecoveryMode(isRecovery);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setErrors({ identifier: "Please enter your Login ID or Roll Number" });
      return;
    }
    if (!password) {
      setErrors({ password: "Please enter your password" });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const { error, role: loggedInRole } = await loginWithIdentifier(trimmedId, password);
      
      if (error) {
        if (error.message.includes("Invalid login credentials") || error.message.includes("invalid_grant")) {
          toast.error("Invalid Login ID / Roll Number or Password. Please check your credentials.");
        } else {
          toast.error(error.message || "Failed to sign in. Please verify your credentials.");
        }
        return;
      }

      // Check must_change_password for student or direct navigation
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role, is_admin, must_change_password")
          .eq("id", userData.user.id)
          .single();

        const activeRole: UserRole =
          prof?.role === "administrator" || prof?.is_admin
            ? "administrator"
            : prof?.role === "faculty"
            ? "faculty"
            : "student";

        if (activeRole === "administrator") {
          toast.success("Welcome back, Administrator");
          navigate("/admin/dashboard", { replace: true });
        } else if (activeRole === "faculty") {
          toast.success("Welcome back, Faculty");
          navigate("/faculty/dashboard", { replace: true });
        } else {
          if (prof?.must_change_password) {
            navigate("/student/change-password", { replace: true });
          } else {
            toast.success("Welcome back to Synapse!");
            navigate("/student/dashboard", { replace: true });
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!password || password.length < 6) {
      setErrors({ password: "Password must be at least 6 characters" });
      return;
    }
    if (password !== confirmPassword) {
      setErrors({ password: "Passwords do not match" });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        toast.error(error.message || "Failed to update password");
        return;
      }
      toast.success("Password updated successfully. You can now sign in.");
      setIsRecoveryMode(false);
      setPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-neural shadow-glow">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-neural">SYNAPSE</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Institutional Education & Academic Management Platform
          </p>
        </div>

        {/* Single Unified Sign In Card */}
        <Card className="shadow-elevated border bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Sign In</CardTitle>
                <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  <Shield className="h-3 w-3 text-primary" />
                  <span>Verified Institutional Access</span>
                </div>
              </div>
              <CardDescription className="text-xs">
                Use your institution-issued credentials to access your dashboard.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isRecoveryMode ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pl-9 pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="pl-9 pr-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-neural text-primary-foreground font-semibold"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Update Password
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Login ID / Roll Number Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="identifier" className="text-xs font-semibold">
                    Login ID / Roll Number
                  </Label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Roll Number, Faculty ID, or Admin ID"
                      className="pl-9 text-sm"
                      autoComplete="username"
                      disabled={loading}
                      required
                    />
                  </div>
                  {errors.identifier && (
                    <p className="text-xs text-destructive">{errors.identifier}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    e.g., Roll No (<span className="font-mono">21BCE001</span>), Faculty ID (<span className="font-mono">CSE-101</span>), or Admin (<span className="font-mono">ADMIN001</span>)
                  </p>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold">
                      Password
                    </Label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 pr-10 text-sm"
                      autoComplete="current-password"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full gradient-neural text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:opacity-95 transition-opacity"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Informational Footer */}
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            Synapse requires institution-issued credentials.
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            For account creation or credential resets, please contact your Institutional Administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
