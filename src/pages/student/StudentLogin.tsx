import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Lock, GraduationCap, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function StudentLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithRollNumber, loading: authLoading } = useAuth();
  const [rollNumber, setRollNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim() || !password) {
      toast.error("Please enter your Roll Number and Password");
      return;
    }

    setLoading(true);
    try {
      const { error } = await loginWithRollNumber(rollNumber, password);
      if (error) {
        toast.error("Invalid Roll Number or Password. Check with your Faculty if account is provisioned.");
        return;
      }
      toast.success("Welcome back to Synapse!");
      const from = location.state?.from?.pathname || "/student/dashboard";
      navigate(from, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-neural shadow-glow">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient-neural">Student Learning Portal</h1>
          <p className="text-xs text-muted-foreground">
            Sign in using your institutional Roll Number — Hierarchy Tier 3
          </p>
        </div>

        {/* Real Roll Number + Password Form */}
        <Card className="shadow-elevated border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Student Sign In</CardTitle>
            <CardDescription className="text-xs">
              Your account is created by your classroom Faculty. Initial password is set to your Roll Number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="roll-number" className="text-xs">Roll Number *</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="roll-number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. CS22B042"
                    className="pl-9 font-mono uppercase text-sm tracking-wider"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="student-password" className="text-xs">Password *</Label>
                  <span className="text-[10px] text-muted-foreground">Default: Roll Number</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="student-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-neural text-primary-foreground font-semibold text-sm shadow-md"
                disabled={loading || authLoading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Sign In to Student Portal
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Bottom switcher helper */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <div>Are you a faculty member or administrator?</div>
          <div>
            <a href="/auth" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
              Faculty & Administrator Portal →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
