import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtSign, Check, X, Loader2, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateUsername } from "@/hooks/useProfile";
import { useCheckUsername } from "@/hooks/useProfiles";
import { useDebounce } from "@/hooks/useDebounce";
import { normalizeUsername, USERNAME_LIMITS } from "@/lib/utils";

export default function CreateUsername() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const updateUsername = useUpdateUsername();
  const [username, setUsername] = useState(profile?.username || "");
  const debouncedUsername = useDebounce(username, 250);

  const { data: usernameCheck, isLoading: checkingUsername } = useCheckUsername(
    debouncedUsername
  );

  const handleSubmit = () => {
    if (!usernameCheck?.available) return;
    updateUsername.mutate(username.trim(), {
      onSuccess: () => {
        if (profile?.onboarding_completed) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-elevated">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-neural shadow-glow">
            <User className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create your username</CardTitle>
          <p className="text-sm text-muted-foreground">
            This will be how others find and recognize you in chats and groups.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                value={username}
                onChange={(e) =>
                  setUsername(normalizeUsername(e.target.value).slice(0, USERNAME_LIMITS.max))
                }
                className="pl-9"
                placeholder="yourname"
                maxLength={USERNAME_LIMITS.max}
                autoComplete="off"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingUsername ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : usernameCheck ? (
                  usernameCheck.available ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )
                ) : null}
              </div>
            </div>
            {usernameCheck?.reason && !usernameCheck.available && (
              <p className="text-sm text-destructive">{usernameCheck.reason}</p>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            <p>Rules:</p>
            <p>Use {USERNAME_LIMITS.min}-{USERNAME_LIMITS.max} characters.</p>
            <p>Only lowercase letters, numbers, and underscores.</p>
          </div>

          <Button
            className="w-full gradient-neural text-primary-foreground"
            onClick={handleSubmit}
            disabled={!usernameCheck?.available || updateUsername.isPending}
          >
            {updateUsername.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Continue"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
