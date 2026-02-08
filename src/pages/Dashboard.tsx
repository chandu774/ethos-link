import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchCard, ConnectionState } from "@/components/ui/match-card";
import { CategoryToggle } from "@/components/ui/category-toggle";
import { CommunityCard } from "@/components/ui/community-card";
import { CommunityGroups } from "@/components/community/CommunityGroups";
import { Brain, Sparkles, Users, Loader2, UserPlus, AtSign, Plus, ShieldCheck } from "lucide-react";
import { formatUsername } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileWithSimilarity, useProfilesInCommunity } from "@/hooks/useProfiles";
import { 
  useSendConnectionRequest, 
  useAllConnectionStatuses, 
  usePendingRequests,
  useRespondToRequest,
  useCancelRequest
} from "@/hooks/useConnections";
import { useToggleCommunity } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommunities } from "@/hooks/useCommunities";
import {
  useAdminCommunityRequests,
  useApproveCommunityRequest,
  useMyCommunityRequests,
  useRejectCommunityRequest,
} from "@/hooks/useCommunityRequests";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { uploadAvatarFile } from "@/lib/storage";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [category, setCategory] = useState<"Professional" | "Personal">(
    profile?.mode === "personal" ? "Personal" : "Professional"
  );
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [communityImagePreview, setCommunityImagePreview] = useState<string | null>(null);
  const [isUploadingCommunityImage, setIsUploadingCommunityImage] = useState(false);
  const communityFileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const [showStartCommunity, setShowStartCommunity] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunityCategory, setNewCommunityCategory] = useState("");
  const [newCommunityDescription, setNewCommunityDescription] = useState("");
  const [newCommunityImage, setNewCommunityImage] = useState<File | null>(null);
  const [newCommunityImagePreview, setNewCommunityImagePreview] = useState<string | null>(null);
  const [isSubmittingCommunity, setIsSubmittingCommunity] = useState(false);
  const [processingRequestIds, setProcessingRequestIds] = useState<Set<string>>(new Set());
  const [hiddenRequestIds, setHiddenRequestIds] = useState<Set<string>>(new Set());

  const { data: profilesWithSimilarity, isLoading: loadingProfiles } = useProfileWithSimilarity();
  const { data: communityProfiles, isLoading: loadingCommunityProfiles } = useProfilesInCommunity(selectedCommunity || "");
  const { data: allConnections } = useAllConnectionStatuses();
  const { data: pendingRequests } = usePendingRequests();
  const { data: communities, isLoading: loadingCommunities } = useCommunities();
  const { data: pendingCommunityRequests, isLoading: loadingPendingCommunities } = useMyCommunityRequests();
  const { data: adminPendingRequests, isLoading: loadingAdminPendingCommunities } = useAdminCommunityRequests(
    !!profile?.is_admin
  );
  const approveCommunity = useApproveCommunityRequest();
  const rejectCommunity = useRejectCommunityRequest();
  const sendRequest = useSendConnectionRequest();
  const respondToRequest = useRespondToRequest();
  const cancelRequest = useCancelRequest();
  const toggleCommunity = useToggleCommunity();

  const joinedCommunities = profile?.joined_communities || [];
  const selectedCommunityData = communities?.find((community) => community.id === selectedCommunity) || null;
  const selectedCommunityImage = communityImagePreview || selectedCommunityData?.avatar_url || null;

  useEffect(() => {
    setCommunityImagePreview(null);
  }, [selectedCommunity]);

  const isAllowedImageFile = (file: File) =>
    ["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(file.type);

  const handleCommunityImageUpload = async (file: File) => {
    if (!selectedCommunity) return;
    if (!isAllowedImageFile(file)) {
      toast.error("Please select a JPG, PNG, or WebP image.");
      return;
    }
    setCommunityImagePreview(URL.createObjectURL(file));
    setIsUploadingCommunityImage(true);
    try {
      const publicUrl = await uploadAvatarFile({
        bucket: "community-images",
        pathPrefix: selectedCommunity,
        file,
      });
      const { error } = await supabase
        .from("communities")
        .update({ avatar_url: publicUrl })
        .eq("id", selectedCommunity);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload community photo";
      toast.error(message);
      setCommunityImagePreview(null);
    } finally {
      setIsUploadingCommunityImage(false);
    }
  };

  const handleStartCommunity = async () => {
    if (!profile?.id) {
      toast.error("You must be logged in to start a community.");
      return;
    }
    const name = newCommunityName.trim();
    const description = newCommunityDescription.trim();
    const categoryValue = newCommunityCategory.trim();

    if (name.length < 3) {
      toast.error("Community name must be at least 3 characters.");
      return;
    }
    if (description.length < 10) {
      toast.error("Please add a short description (at least 10 characters).");
      return;
    }
    if (!categoryValue) {
      toast.error("Please select a category.");
      return;
    }

    setIsSubmittingCommunity(true);
    try {
      const { data: nameCheck } = await supabase
        .from("communities")
        .select("id")
        .ilike("name", name)
        .limit(1);

      if (nameCheck && nameCheck.length > 0) {
        toast.error("A community with this name already exists.");
        return;
      }

      const { data: pendingByUser } = await supabase
        .from("community_create_requests")
        .select("id")
        .eq("user_id", profile.id)
        .eq("status", "pending")
        .limit(1);

      if (pendingByUser && pendingByUser.length > 0) {
        toast.error("You already have a pending community request.");
        return;
      }

      const { data: pendingByName } = await supabase
        .from("community_create_requests")
        .select("id")
        .ilike("community_name", name)
        .eq("status", "pending")
        .limit(1);

      if (pendingByName && pendingByName.length > 0) {
        toast.error("A community request with this name is already pending.");
        return;
      }
      let avatarUrl: string | null = null;

      if (newCommunityImage) {
        if (!isAllowedImageFile(newCommunityImage)) {
          toast.error("Please select a JPG, PNG, or WebP image.");
          return;
        }
        avatarUrl = await uploadAvatarFile({
          bucket: "community-images",
          pathPrefix: `community-requests/${profile.id}`,
          file: newCommunityImage,
        });
      }

      const { error } = await supabase.from("community_create_requests").insert({
        user_id: profile.id,
        community_name: name,
        description,
        category: categoryValue,
        avatar_url: avatarUrl,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Community request submitted for review");
      setShowStartCommunity(false);
      setNewCommunityName("");
      setNewCommunityCategory("");
      setNewCommunityDescription("");
      setNewCommunityImage(null);
      setNewCommunityImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ["community-create-requests"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit community request";
      toast.error(message);
    } finally {
      setIsSubmittingCommunity(false);
    }
  };

  // Get connection status for a user
  const getConnectionState = (targetUserId: string): { state: ConnectionState; connectionId: string | null } => {
    if (!user || !allConnections) {
      return { state: "none", connectionId: null };
    }

    const connection = allConnections.find(
      (c) =>
        (c.requester_id === user.id && c.receiver_id === targetUserId) ||
        (c.receiver_id === user.id && c.requester_id === targetUserId)
    );

    if (!connection) {
      return { state: "none", connectionId: null };
    }

    if (connection.status === "accepted") {
      return { state: "connected", connectionId: connection.id };
    }

    if (connection.status === "pending") {
      if (connection.requester_id === user.id) {
        return { state: "pending_sent", connectionId: connection.id };
      } else {
        return { state: "pending_received", connectionId: connection.id };
      }
    }

    return { state: "none", connectionId: null };
  };

  const handleConnect = (userId: string, communityId?: string) => {
    sendRequest.mutate({ receiverId: userId, communityId });
  };

  const handleAccept = (connectionId: string) => {
    respondToRequest.mutate({ connectionId, status: "accepted" });
  };

  const handleReject = (connectionId: string) => {
    respondToRequest.mutate({ connectionId, status: "rejected" });
  };

  const handleCancel = (connectionId: string) => {
    cancelRequest.mutate(connectionId);
  };

  const handleToggleCommunity = (communityId: string) => {
    toggleCommunity.mutate(communityId);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-2xl gradient-hero p-8 text-primary-foreground shadow-glow">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent" />
          <div className="relative z-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Brain className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Welcome back, {profile?.name?.split(" ")[0] || "User"}</h1>
                  <p className="mt-1 text-lg opacity-90">
                    {category === "Professional" 
                      ? "Connect with professionals who share your mindset."
                      : "Find your tribe in communities you love."}
                  </p>
                </div>
              </div>
              <CategoryToggle value={category} onChange={setCategory} />
            </div>
          </div>
        </div>

        {/* Pending Requests Banner */}
        {pendingRequests && pendingRequests.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <UserPlus className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  You have {pendingRequests.length} pending connection request{pendingRequests.length > 1 ? "s" : ""}
                </span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/requests">View Requests</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Row - Removed trust score card */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {category === "Professional" ? "Discover Users" : "Your Communities"}
              </CardTitle>
              {category === "Professional" ? (
                <Brain className="h-4 w-4 text-primary" />
              ) : (
                <Users className="h-4 w-4 text-primary" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-foreground">
                  {category === "Professional" 
                    ? profilesWithSimilarity?.length || 0 
                    : joinedCommunities.length}
                </span>
                <span className="mb-1 text-lg text-muted-foreground">
                  {category === "Professional" ? "users to connect with" : "communities"}
                </span>
              </div>
              <div className="mt-3 flex -space-x-2">
                {category === "Professional" ? (
                  profilesWithSimilarity?.slice(0, 5).map((p, i) => (
                    <div
                      key={p.id}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-primary/30 to-accent/30 text-sm font-semibold text-foreground"
                      style={{ zIndex: 5 - i }}
                    >
                      {p.name.charAt(0)}
                    </div>
                  ))
                ) : (
                  joinedCommunities.slice(0, 5).map((id, i) => {
                    const community = communities?.find((c) => c.id === id);
                    return community ? (
                      <div
                        key={id}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br ${community.color || "from-primary/20 to-accent/20"} text-lg`}
                        style={{ zIndex: 5 - i }}
                      >
                        {community.icon || community.name.charAt(0)}
                      </div>
                    ) : null;
                  })
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {category === "Professional"
                  ? "New mindset-aligned connections waiting for you."
                  : "Explore more communities below."}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mindset Analysis
              </CardTitle>
              <Sparkles className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-foreground">Active</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full gradient-neural transition-all duration-700"
                  style={{ width: "100%" }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Chat with Synapse AI to refine your mindset profile and find better matches.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Professional: Match Suggestions | Personal: Communities */}
        {category === "Professional" ? (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-foreground">Mindset Match Suggestions</h2>
            {loadingProfiles ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : profilesWithSimilarity && profilesWithSimilarity.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {profilesWithSimilarity.map((match) => {
                  const { state, connectionId } = getConnectionState(match.id);
                  return (
                    <MatchCard
                      key={match.id}
                      userId={match.id}
                      username={match.name}
                      displayUsername={match.username}
                      avatarUrl={match.avatar_url}
                      similarity={match.similarity}
                      connectionState={state}
                      connectionId={connectionId}
                      onConnect={() => handleConnect(match.id)}
                      onAccept={() => connectionId && handleAccept(connectionId)}
                      onReject={() => connectionId && handleReject(connectionId)}
                      onCancel={() => connectionId && handleCancel(connectionId)}
                      isLoading={sendRequest.isPending || respondToRequest.isPending || cancelRequest.isPending}
                    />
                  );
                })}
              </div>
            ) : (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 font-medium text-foreground">No users found yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Be the first to invite others to Synapse!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : selectedCommunity ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setSelectedCommunity(null)}>
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <input
                    ref={communityFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleCommunityImageUpload(file);
                      event.currentTarget.value = "";
                    }}
                    disabled={isUploadingCommunityImage}
                  />
                  <button
                    type="button"
                    className="relative h-12 w-12 overflow-hidden rounded-xl border border-border/40 bg-muted"
                    onClick={() => communityFileInputRef.current?.click()}
                    aria-label="Change community photo"
                  >
                    {selectedCommunityImage ? (
                      <img
                        src={selectedCommunityImage}
                        alt={selectedCommunityData?.name || "Community"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg">
                        {selectedCommunityData?.icon || selectedCommunityData?.name?.charAt(0) || "C"}
                      </div>
                    )}
                    {isUploadingCommunityImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
                  </button>
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {selectedCommunityData?.name}
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isUploadingCommunityImage}
                  onClick={() => communityFileInputRef.current?.click()}
                >
                  {isUploadingCommunityImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Upload photo"
                  )}
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue="groups" className="space-y-4">
              <TabsList>
                <TabsTrigger value="groups">Groups</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>
              
              <TabsContent value="groups">
                <CommunityGroups 
                  communityId={selectedCommunity} 
                  communityName={selectedCommunityData?.name || ""} 
                />
              </TabsContent>
              
              <TabsContent value="members">
                {loadingCommunityProfiles ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : communityProfiles && communityProfiles.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {communityProfiles.map((member) => {
                      const { state, connectionId } = getConnectionState(member.id);
                      return (
                        <Card key={member.id} className="shadow-card">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-semibold overflow-hidden">
                                {member.avatar_url ? (
                                  <img src={member.avatar_url} alt={member.name} className="h-full w-full object-cover" />
                                ) : (
                                  member.name.charAt(0)
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{member.name}</h4>
                                {member.username && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <AtSign className="h-3 w-3" />
                                    {(() => {
                                      const formatted = formatUsername(member.username);
                                      return (
                                        <span className="truncate" title={formatted.raw}>
                                          {formatted.display}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                              {state === "connected" ? (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={`/connections?chat=${member.id}`}>Chat</a>
                                </Button>
                              ) : state === "pending_sent" ? (
                                <Button size="sm" variant="outline" disabled>
                                  Sent
                                </Button>
                              ) : state === "pending_received" ? (
                                <Button
                                  size="sm"
                                  onClick={() => connectionId && handleAccept(connectionId)}
                                  disabled={respondToRequest.isPending}
                                >
                                  Accept
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleConnect(member.id, selectedCommunity)}
                                  disabled={sendRequest.isPending}
                                >
                                  Connect
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="py-12">
                    <CardContent className="text-center">
                      <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 font-medium text-foreground">No other members yet</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Be the first to invite others to this community!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Explore Communities</h2>
                <p className="text-sm text-muted-foreground">
                  Discover approved communities or start your own.
                </p>
              </div>
              <Dialog open={showStartCommunity} onOpenChange={setShowStartCommunity}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Start a Community
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start a Community</DialogTitle>
                    <DialogDescription>Requires approval</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="community-name">Community name</Label>
                      <Input
                        id="community-name"
                        value={newCommunityName}
                        onChange={(event) => setNewCommunityName(event.target.value)}
                        placeholder="e.g., Mindful Builders"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="community-category">Category</Label>
                      <Input
                        id="community-category"
                        value={newCommunityCategory}
                        onChange={(event) => setNewCommunityCategory(event.target.value)}
                        placeholder="e.g., Productivity"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="community-description">Description</Label>
                      <Textarea
                        id="community-description"
                        value={newCommunityDescription}
                        onChange={(event) => setNewCommunityDescription(event.target.value)}
                        placeholder="Describe the purpose and vibe of this community."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="community-image">Community image (optional)</Label>
                      <Input
                        id="community-image"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setNewCommunityImage(file);
                          setNewCommunityImagePreview(file ? URL.createObjectURL(file) : null);
                          event.currentTarget.value = "";
                        }}
                      />
                      {newCommunityImagePreview && (
                        <div className="h-16 w-16 overflow-hidden rounded-lg border border-border/40">
                          <img
                            src={newCommunityImagePreview}
                            alt="Community preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowStartCommunity(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleStartCommunity} disabled={isSubmittingCommunity}>
                      {isSubmittingCommunity ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for review"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium text-foreground">Your Pending Communities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingPendingCommunities ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : pendingCommunityRequests && pendingCommunityRequests.length > 0 ? (
                  pendingCommunityRequests
                    .filter((request) => request.status === "pending")
                    .filter((request) => !hiddenRequestIds.has(request.id))
                    .map((request) => (
                    <div key={request.id} className="rounded-lg border bg-card p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{request.community_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.category || "Uncategorized"}
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                          Pending Approval
                        </span>
                      </div>
                      {request.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{request.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No pending community requests.</p>
                )}
              </CardContent>
            </Card>

            {profile?.is_admin && (
              <Card className="mb-6 shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Pending Community Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingAdminPendingCommunities ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : adminPendingRequests && adminPendingRequests.length > 0 ? (
                    adminPendingRequests
                      .filter((request) => !hiddenRequestIds.has(request.id))
                      .map((request) => (
                      <div key={request.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{request.community_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {request.category || "Uncategorized"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Requested by {request.user?.username || request.user?.name || request.user_id}
                            </p>
                            {request.description && (
                              <p className="mt-2 text-sm text-muted-foreground">{request.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={processingRequestIds.has(request.id)}
                              onClick={async () => {
                                setProcessingRequestIds((prev) => new Set(prev).add(request.id));
                                setHiddenRequestIds((prev) => new Set(prev).add(request.id));
                                try {
                                  await approveCommunity.mutate(request.id);
                                  toast.success("Community approved");
                                } catch (error) {
                                  setHiddenRequestIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(request.id);
                                    return next;
                                  });
                                  const message =
                                    error instanceof Error ? error.message : "Failed to approve community";
                                  toast.error(message);
                                } finally {
                                  setProcessingRequestIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(request.id);
                                    return next;
                                  });
                                }
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={processingRequestIds.has(request.id)}
                              onClick={async () => {
                                setProcessingRequestIds((prev) => new Set(prev).add(request.id));
                                setHiddenRequestIds((prev) => new Set(prev).add(request.id));
                                try {
                                  await rejectCommunity.mutate(request.id);
                                  toast.success("Community rejected");
                                } catch (error) {
                                  setHiddenRequestIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(request.id);
                                    return next;
                                  });
                                  const message =
                                    error instanceof Error ? error.message : "Failed to reject community";
                                  toast.error(message);
                                } finally {
                                  setProcessingRequestIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(request.id);
                                    return next;
                                  });
                                }
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No pending community requests.</p>
                  )}
                </CardContent>
              </Card>
            )}
            {loadingCommunities ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-sm text-muted-foreground">Loading communities...</span>
              </div>
            ) : communities && communities.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {communities.map((community) => (
                  <div key={community.id} className="relative">
                    <CommunityCard
                      id={community.id}
                      name={community.name}
                      icon={community.icon || community.name.charAt(0)}
                      color={community.color || "from-primary/20 to-accent/20"}
                      imageUrl={community.avatar_url || null}
                      category={community.category || null}
                      members={community.members}
                      description={community.description || ""}
                      isJoined={joinedCommunities.includes(community.id)}
                      onToggle={handleToggleCommunity}
                    />
                    {joinedCommunities.includes(community.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute bottom-4 right-4"
                        onClick={() => setSelectedCommunity(community.id)}
                      >
                        View Members
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 font-medium text-foreground">No communities available</h3>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
