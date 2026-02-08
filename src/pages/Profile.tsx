import { useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Edit2, Save, X, LogOut, AtSign, Check, User, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile, useUpdateUsername } from "@/hooks/useProfile";
import { useCheckUsername } from "@/hooks/useProfiles";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { normalizeUsername, USERNAME_LIMITS } from "@/lib/utils";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadAvatarFile } from "@/lib/storage";

export default function Profile() {
  const { profile, signOut } = useAuth();
  const updateProfile = useUpdateProfile();
  const updateUsername = useUpdateUsername();
  const navigate = useNavigate();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(profile?.name || "");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editUsername, setEditUsername] = useState(profile?.username || "");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBio, setEditBio] = useState(profile?.bio || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const debouncedUsername = useDebounce(editUsername, 300);
  
  const { data: usernameCheck, isLoading: checkingUsername } = useCheckUsername(
    isEditingUsername && editUsername !== profile?.username ? debouncedUsername : ""
  );

  const handleSaveName = () => {
    updateProfile.mutate({ name: editName.trim() || "" });
    setIsEditingName(false);
  };

  const handleSaveUsername = () => {
    if (!usernameCheck?.available) {
      toast.error(usernameCheck?.reason || "Username not available");
      return;
    }
    updateUsername.mutate(editUsername.trim().toLowerCase());
    setIsEditingUsername(false);
  };

  const handleSaveBio = () => {
    updateProfile.mutate({ bio: editBio.trim() || null });
    setIsEditingBio(false);
  };

  const isAllowedImageFile = (file: File) =>
    ["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(file.type);

  const handleAvatarUpload = async (file: File) => {
    if (!profile) return;
    if (!isAllowedImageFile(file)) {
      toast.error("Please select a JPG, PNG, or WebP image.");
      return;
    }
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setIsUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatarFile({
        bucket: "profile-avatars",
        pathPrefix: profile.id,
        file,
      });
      updateProfile.mutate({ avatar_url: publicUrl });
      setAvatarPreviewUrl(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload avatar";
      toast.error(message);
      setAvatarPreviewUrl(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="overflow-hidden shadow-elevated">
          <div className="h-40 gradient-hero rounded-t-lg" />
          <CardContent className="relative pt-0 px-6 pb-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-start sm:gap-6 -mt-16 sm:-mt-14">
              <div className="flex flex-col items-center gap-3">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                    event.currentTarget.value = "";
                  }}
                  disabled={isUploadingAvatar}
                />
                <button
                  type="button"
                  className="relative"
                  onClick={() => avatarInputRef.current?.click()}
                  aria-label="Change profile photo"
                >
                  <Avatar className="h-24 w-24 border-4 border-card shadow-lg overflow-hidden">
                    {(avatarPreviewUrl || profile.avatar_url) ? (
                      <AvatarImage src={avatarPreviewUrl || profile.avatar_url || ""} alt={profile.name} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent">
                      <User className="h-12 w-12 text-primary-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </button>
                <Button size="sm" variant="outline" disabled={isUploadingAvatar} onClick={() => avatarInputRef.current?.click()}>
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload photo
                    </>
                  )}
                </Button>
              </div>
              <div className="mt-6 text-center sm:mt-12 sm:text-left flex-1 space-y-5">
                <div>
                  {isEditingName ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="max-w-xs"
                        placeholder="Optional display name"
                      />
                      <Button size="icon" variant="ghost" onClick={handleSaveName}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h1 className="text-3xl font-bold text-foreground">
                        {profile.name || "No display name"}
                      </h1>
                      <Button size="icon" variant="ghost" onClick={() => {
                        setEditName(profile.name || "");
                        setIsEditingName(true);
                      }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  {isEditingUsername ? (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="relative">
                        <AtSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={editUsername}
                          onChange={(e) => setEditUsername(normalizeUsername(e.target.value).slice(0, USERNAME_LIMITS.max))}
                          className="max-w-xs pl-8"
                          placeholder="username"
                          maxLength={USERNAME_LIMITS.max}
                        />
                      </div>
                      {checkingUsername && <Loader2 className="h-4 w-4 animate-spin" />}
                      {!checkingUsername && usernameCheck && (
                        usernameCheck.available ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSaveUsername}
                        disabled={!usernameCheck?.available || updateUsername.isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setIsEditingUsername(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center sm:justify-start gap-1 text-muted-foreground">
                      <AtSign className="h-4 w-4" />
                      <span className="text-sm">{profile.username || "No username set"}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                        setEditUsername(profile.username || "");
                        setIsEditingUsername(true);
                      }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {usernameCheck?.reason && !usernameCheck.available && isEditingUsername && (
                    <p className="text-sm text-destructive mt-1">{usernameCheck.reason}</p>
                  )}
                </div>

                <div>
                  {isEditingBio ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Tell people a bit about you (optional)"
                        className="min-h-[100px]"
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleSaveBio}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsEditingBio(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1">
                      {profile.bio ? (
                        <p className="text-sm text-foreground whitespace-pre-wrap">{profile.bio}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No bio yet</p>
                      )}
                      <Button size="sm" variant="ghost" className="mt-2" onClick={() => {
                        setEditBio(profile.bio || "");
                        setIsEditingBio(true);
                      }}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit bio
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
