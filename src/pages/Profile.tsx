import { Suspense, lazy, useMemo, useRef, useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile, useUpdateUsername } from "@/hooks/useProfile";
import { useCheckUsername } from "@/hooks/useProfiles";
import { useDebounce } from "@/hooks/useDebounce";
import { useProfileInsights } from "@/hooks/useProfileInsights";
import { uploadAvatarFile } from "@/lib/storage";
import { normalizeUsername } from "@/lib/utils";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { StatsRow } from "@/components/profile/StatsRow";
import { ProfileTabs, type ProfileTabKey } from "@/components/profile/Tabs";

const OverviewPanel = lazy(() =>
  import("@/components/profile/OverviewPanel").then((module) => ({ default: module.OverviewPanel }))
);
const NotesTabContent = lazy(() =>
  import("@/components/profile/NotesTabContent").then((module) => ({ default: module.NotesTabContent }))
);
const AssignmentsTabContent = lazy(() =>
  import("@/components/profile/AssignmentsTabContent").then((module) => ({ default: module.AssignmentsTabContent }))
);
const ActivityTabContent = lazy(() =>
  import("@/components/profile/ActivityTabContent").then((module) => ({ default: module.ActivityTabContent }))
);

function SectionLoader() {
  return (
    <div className="flex items-center justify-center rounded-2xl bg-card/80 p-10 shadow-sm">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}

export default function Profile() {
  const { profile, signOut } = useAuth();
  const updateProfile = useUpdateProfile();
  const updateUsername = useUpdateUsername();
  const { data: insights, isLoading: loadingInsights, isError, error } = useProfileInsights();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ProfileTabKey>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.name || "");
  const [editUsername, setEditUsername] = useState(profile?.username || "");
  const [editBio, setEditBio] = useState(profile?.bio || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const debouncedUsername = useDebounce(editUsername, 300);
  const usernameChanged = useMemo(
    () => normalizeUsername(editUsername) !== normalizeUsername(profile?.username || ""),
    [editUsername, profile?.username]
  );
  const { data: usernameCheck, isLoading: checkingUsername } = useCheckUsername(
    isEditing && usernameChanged ? debouncedUsername : ""
  );

  const stats = insights?.stats || {
    notesUploaded: 0,
    assignmentsSubmitted: 0,
    groupsJoined: 0,
    activityStreak: 0,
  };

  const recentActivity = useMemo(() => (insights?.activities || []).slice(0, 5), [insights?.activities]);
  const latestNotes = useMemo(() => (insights?.notes || []).slice(0, 4), [insights?.notes]);
  const recentAssignments = useMemo(
    () => (insights?.assignments || []).slice(0, 5),
    [insights?.assignments]
  );

  const handleStartEditing = () => {
    if (!profile) return;
    setEditName(profile.name || "");
    setEditUsername(profile.username || "");
    setEditBio(profile.bio || "");
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    if (!profile) return;
    setEditName(profile.name || "");
    setEditUsername(profile.username || "");
    setEditBio(profile.bio || "");
  };

  const handleSaveProfile = async () => {
    try {
      if (usernameChanged) {
        if (!usernameCheck?.available) {
          toast.error(usernameCheck?.reason || "Username is not available.");
          return;
        }
        await updateUsername.mutateAsync(editUsername);
      }

      await updateProfile.mutateAsync({
        name: editName.trim() || "",
        bio: editBio.trim() || null,
      });
      setIsEditing(false);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save profile";
      toast.error(message);
    }
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
      await updateProfile.mutateAsync({ avatar_url: publicUrl });
      setAvatarPreviewUrl(null);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload avatar";
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

      <div className="mx-auto max-w-7xl">
        <div className="grid gap-5 md:gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-3 sm:space-y-4 lg:sticky lg:top-20 lg:h-fit">
            <ProfileHeader
              profile={profile}
              avatarPreviewUrl={avatarPreviewUrl}
              isUploadingAvatar={isUploadingAvatar}
              onPickAvatar={() => avatarInputRef.current?.click()}
              onUploadNotes={() => navigate("/notes")}
              onViewNotes={() => {
                setActiveTab("notes");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              isEditing={isEditing}
              onToggleEditing={handleStartEditing}
              editName={editName}
              setEditName={setEditName}
              editUsername={editUsername}
              setEditUsername={setEditUsername}
              editBio={editBio}
              setEditBio={setEditBio}
              onSaveProfile={handleSaveProfile}
              onCancelEditing={handleCancelEditing}
              usernameCheck={usernameCheck}
              checkingUsername={checkingUsername}
              isSaving={updateProfile.isPending || updateUsername.isPending}
            />

            <StatsRow
              notesUploaded={stats.notesUploaded}
              assignmentsSubmitted={stats.assignmentsSubmitted}
              groupsJoined={stats.groupsJoined}
              activityStreak={stats.activityStreak}
            />

            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </aside>

          <main className="space-y-3 sm:space-y-4">
            <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-3 text-sm text-muted-foreground shadow-sm">
              This is your academic identity inside Synapse. Keep it updated so classmates can recognize you in chats, notes, and group work.
            </div>
            <ProfileTabs value={activeTab} onValueChange={setActiveTab} />

            {loadingInsights ? <SectionLoader /> : null}
            {isError ? (
              <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive shadow-sm">
                {error instanceof Error ? error.message : "Unable to load profile data."}
              </div>
            ) : null}

            {!loadingInsights && !isError ? (
              <Suspense fallback={<SectionLoader />}>
                {activeTab === "overview" ? (
                  <OverviewPanel
                    recentActivity={recentActivity}
                    latestNotes={latestNotes}
                    recentAssignments={recentAssignments}
                  />
                ) : null}
                {activeTab === "notes" ? <NotesTabContent notes={insights?.notes || []} /> : null}
                {activeTab === "assignments" ? (
                  <AssignmentsTabContent assignments={insights?.assignments || []} />
                ) : null}
                {activeTab === "activity" ? <ActivityTabContent activity={insights?.activities || []} /> : null}
              </Suspense>
            ) : null}
          </main>
        </div>
      </div>
    </AppLayout>
  );
}
