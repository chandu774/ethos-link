import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, User, MessageCircle, NotebookTabs } from "lucide-react";
import { formatUsername } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PublicProfileData {
  id: string;
  name: string | null;
  username: string | null;
  bio?: string | null;
  avatar_url: string | null;
}

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles_public")
        .select("id, name, username, bio, avatar_url")
        .eq("id", id)
        .single();

      if (!error && data && isMounted) {
        setProfile(data as PublicProfileData);
      }
      if (isMounted) setLoading(false);
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const formatted = formatUsername(profile?.username, profile?.name);

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card className="overflow-hidden border-border/50 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_24%),linear-gradient(135deg,_hsl(var(--card)/0.96),_hsl(var(--background)/0.92))] shadow-elevated">
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : profile ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                  Public profile
                </Badge>
                <Avatar className="h-24 w-24 border border-border/40">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={formatted.raw} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                    <User className="h-12 w-12 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">
                    {profile.name || "User"}
                  </h1>
                  {profile.username && (
                    <p className="text-sm text-muted-foreground">@{formatted.raw}</p>
                  )}
                </div>
                <div className="max-w-xl text-sm text-muted-foreground">
                  {profile.bio || "No bio provided."}
                </div>
                <div className="grid w-full gap-3 pt-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/50 bg-background/70 p-4 text-left">
                    <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <p className="font-medium text-foreground">Visible in chat</p>
                    <p className="mt-1 text-sm text-muted-foreground">This is the identity classmates will see in direct messages and group discussions.</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/70 p-4 text-left">
                    <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <NotebookTabs className="h-4 w-4" />
                    </div>
                    <p className="font-medium text-foreground">Visible in notes</p>
                    <p className="mt-1 text-sm text-muted-foreground">Shared notes and uploads are easier to trust when profiles feel recognizable.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Profile not found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
