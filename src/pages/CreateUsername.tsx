import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtSign, Check, X, Loader2, User, MessageCircle, NotebookTabs, Users } from "lucide-react";
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
        navigate("/dashboard");
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.16),_transparent_30%),radial-gradient(circle_at_top_right,_hsl(var(--accent)/0.14),_transparent_24%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))]"
      />
      <Card className="w-full max-w-4xl overflow-hidden border-border/50 bg-[linear-gradient(135deg,_hsl(var(--card)/0.97),_hsl(var(--background)/0.94))] shadow-elevated">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-border/50 p-6 lg:border-b-0 lg:border-r">
            <CardHeader className="px-0 pt-0 text-left">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-neural shadow-glow">
                <User className="h-7 w-7 text-primary-foreground" />
              </div>
              <CardTitle className="pt-4 text-2xl">Create your username</CardTitle>
              <p className="text-sm text-muted-foreground">
                This is how classmates will recognize you across chats, shared notes, and study groups.
              </p>
            </CardHeader>
            <CardContent className="space-y-6 px-0 pb-0">
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

              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Username rules</p>
                <p className="mt-2">Use {USERNAME_LIMITS.min}-{USERNAME_LIMITS.max} characters.</p>
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
                  "Continue to dashboard"
                )}
              </Button>
            </CardContent>
          </div>

          <div className="bg-background/40 p-6">
            <div className="space-y-4">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Why this matters</p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Your identity follows your work</h2>
              <p className="text-sm text-muted-foreground">
                A clear username helps people trust what you share and makes collaboration feel more personal and organized.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { icon: MessageCircle, title: "Chat", text: "Classmates can quickly find and message the right person." },
                  { icon: NotebookTabs, title: "Notes", text: "Uploads and summaries are easier to recognize and trust." },
                  { icon: Users, title: "Groups", text: "Your profile feels consistent across shared study spaces." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-2xl border border-border/50 bg-card/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
