import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Lock, UserCheck, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { loginWithIdentifier, signOut, user, role, loading: authLoading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated as administrator, navigate to admin dashboard
  useEffect(() => {
    if (user && !authLoading) {
      if (role === "administrator") {
        navigate("/admin/dashboard", { replace: true });
      }
    }
  }, [user, role, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      toast.error("Please provide both Admin ID / Email and password");
      return;
    }

    setLoading(true);
    try {
      const { error, role: loggedRole } = await loginWithIdentifier(cleanId, password);
      if (error) {
        if (error.message.includes("Invalid login credentials") || error.message.includes("invalid_grant")) {
          toast.error("Invalid Admin ID or Password. Please check your credentials.");
        } else {
          toast.error("Authentication failed: " + error.message);
        }
        return;
      }

      if (loggedRole !== "administrator") {
        await signOut();
        toast.error("Access denied. This portal is restricted to Central Administrators.");
        return;
      }

      toast.success("Welcome back, Administrator");
      navigate("/admin/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 shadow-xl shadow-rose-900/40">
            <ShieldAlert className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Synapse Institutional Admin</h1>
          <p className="text-xs text-slate-400">
            Restricted Central Authority Portal — Hierarchy Tier 1
          </p>
        </div>

        {/* Real Supabase Auth Card */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Administrator Sign In</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Enter official institutional administrator credentials (Admin ID or Email).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-identifier" className="text-xs text-slate-300">Admin ID or Email</Label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="admin-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ADMIN001 or admin@synapse.edu"
                    className="pl-9 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-sm"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-password" className="text-xs text-slate-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 text-sm"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm shadow-md shadow-rose-600/30"
                disabled={loading || authLoading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Authenticate as Administrator
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Helper Note */}
        <div className="text-center text-[11px] text-slate-500">
          Faculty or Student? Visit <a href="/login" className="text-slate-400 hover:underline">Unified Portal</a>.
        </div>
      </div>
    </div>
  );
}
