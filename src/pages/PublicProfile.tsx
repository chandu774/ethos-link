import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, User } from "lucide-react";
import { formatUsername } from "@/lib/utils";

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
        <Card className="shadow-elevated">
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : profile ? (
              <div className="flex flex-col items-center gap-4 text-center">
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
