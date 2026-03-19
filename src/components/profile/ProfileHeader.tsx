import { AtSign, Camera, Edit2, Eye, FileUp, Loader2, Save, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";
import { normalizeUsername, USERNAME_LIMITS } from "@/lib/utils";

type Profile = Tables<"profiles">;

interface UsernameCheck {
  available: boolean;
  reason?: string;
}

interface ProfileHeaderProps {
  profile: Profile;
  avatarPreviewUrl: string | null;
  isUploadingAvatar: boolean;
  onPickAvatar: () => void;
  onUploadNotes: () => void;
  onViewNotes: () => void;
  isEditing: boolean;
  onToggleEditing: () => void;
  editName: string;
  setEditName: (value: string) => void;
  editUsername: string;
  setEditUsername: (value: string) => void;
  editBio: string;
  setEditBio: (value: string) => void;
  onSaveProfile: () => void;
  onCancelEditing: () => void;
  usernameCheck?: UsernameCheck;
  checkingUsername: boolean;
  isSaving: boolean;
}

export function ProfileHeader({
  profile,
  avatarPreviewUrl,
  isUploadingAvatar,
  onPickAvatar,
  onUploadNotes,
  onViewNotes,
  isEditing,
  onToggleEditing,
  editName,
  setEditName,
  editUsername,
  setEditUsername,
  editBio,
  setEditBio,
  onSaveProfile,
  onCancelEditing,
  usernameCheck,
  checkingUsername,
  isSaving,
}: ProfileHeaderProps) {
  return (
    <section className="rounded-2xl bg-card/90 p-5 shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-background shadow-md">
              {avatarPreviewUrl || profile.avatar_url ? (
                <AvatarImage src={avatarPreviewUrl || profile.avatar_url || ""} alt={profile.name || "Profile"} />
              ) : null}
              <AvatarFallback className="text-xl">{(profile.name || "U").charAt(0)}</AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
              onClick={onPickAvatar}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex-1 space-y-3">
            {isEditing ? (
              <>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Display name" />
                <div className="space-y-1">
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={editUsername}
                      onChange={(e) => setEditUsername(normalizeUsername(e.target.value).slice(0, USERNAME_LIMITS.max))}
                      placeholder="username"
                      className="pl-9"
                    />
                  </div>
                  {checkingUsername ? (
                    <p className="text-xs text-muted-foreground">Checking username...</p>
                  ) : null}
                  {usernameCheck?.reason && !usernameCheck.available ? (
                    <p className="text-xs text-destructive">{usernameCheck.reason}</p>
                  ) : null}
                </div>
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Add a short bio"
                  className="min-h-[88px]"
                />
              </>
            ) : (
              <>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">{profile.name || "No display name"}</h1>
                  <p className="text-sm text-muted-foreground">@{profile.username || "username"}</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{profile.bio || "Add a short bio to introduce yourself."}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <Button onClick={onSaveProfile} disabled={isSaving || (usernameCheck ? !usernameCheck.available : false)}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Profile
              </Button>
              <Button variant="outline" onClick={onCancelEditing}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={onToggleEditing}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}

          <Button variant="secondary" onClick={onUploadNotes}>
            <FileUp className="mr-2 h-4 w-4" />
            Upload Notes
          </Button>
          <Button variant="outline" onClick={onViewNotes}>
            <Eye className="mr-2 h-4 w-4" />
            View Notes
          </Button>
        </div>
      </div>
    </section>
  );
}
