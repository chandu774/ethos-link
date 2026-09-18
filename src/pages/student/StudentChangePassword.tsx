import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function StudentChangePassword() {
  const navigate = useNavigate();
  const { profile, completePasswordChange } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await completePasswordChange(newPassword);
      if (error) {
        toast.error("Failed to change password: " + error.message);
        return;
      }
      toast.success("Password updated successfully! Welcome to your student workspace.");
      navigate("/student/dashboard", { replace: true });
    } catch (err: any) {
      toast.error("An error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-1">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">First-Time Login Security</h1>
          <p className="text-xs text-muted-foreground">
            Account Roll No: <span className="font-mono font-semibold text-primary">{profile?.roll_number || "Student"}</span>
          </p>
        </div>

        <Card className="shadow-elevated border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Set Personal Password</CardTitle>
            <CardDescription className="text-xs">
              Your account was created by faculty with a temporary default password. Please choose a new secure password to proceed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-pw" className="text-xs">New Secure Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-pw" className="text-xs">Confirm New Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/60 text-[11px] text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  After updating, use your Roll Number and this new password for all future logins to Synapse.
                </span>
              </div>

              <Button
                type="submit"
                className="w-full gradient-neural text-primary-foreground font-semibold text-sm shadow-md"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Password & Enter Student Portal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
