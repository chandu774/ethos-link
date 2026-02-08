import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  useCommunityGroups, 
  useCreateGroup, 
  useJoinGroup, 
  useIsGroupMember 
} from "@/hooks/useGroups";
import { Plus, Users, Loader2, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GroupAvatar } from "@/components/ui/group-avatar";

interface CommunityGroupsProps {
  communityId: string;
  communityName: string;
}

function GroupCard({ 
  group, 
  onJoin, 
  onChat,
  isJoining
}: { 
  group: { id: string; name: string; description: string | null; creator_id: string; avatar_url?: string | null };
  onJoin: () => void;
  onChat: () => void;
  isJoining: boolean;
}) {
  const { data: isMember, isLoading } = useIsGroupMember(group.id);

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card hover:shadow-elevated transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <GroupAvatar
            name={group.name}
            avatarUrl={group.avatar_url || null}
            className="h-12 w-12 border border-border/40"
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground truncate">{group.name}</h4>
              {isMember && (
                <Badge variant="secondary" className="text-xs">Joined</Badge>
              )}
            </div>
            {group.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {group.description}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              {isMember ? (
                <Button size="sm" onClick={onChat}>
                  Chat
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  onClick={onJoin}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-1" />
                      Join
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CommunityGroups({ communityId, communityName }: CommunityGroupsProps) {
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

  const { data: groups, isLoading } = useCommunityGroups(communityId);
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup.mutate(
      { name: newGroupName, description: newGroupDescription, communityId },
      {
        onSuccess: () => {
          setShowCreateDialog(false);
          setNewGroupName("");
          setNewGroupDescription("");
        },
      }
    );
  };

  const handleChatWithGroup = (groupId: string) => {
    // Navigate to connections page with the group selected
    navigate(`/connections?group=${groupId}&tab=groups`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {communityName} Groups
        </h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Community Group</DialogTitle>
              <DialogDescription>
                Create a group chat within the {communityName} community.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="community-group-name">Group Name</Label>
                <Input
                  id="community-group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Competitive Gamers"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="community-group-description">Description (optional)</Label>
                <Textarea
                  id="community-group-description"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What's this group about?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} disabled={createGroup.isPending || !newGroupName.trim()}>
                {createGroup.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Group"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {groups && groups.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onJoin={() => joinGroup.mutate(group.id)}
              onChat={() => handleChatWithGroup(group.id)}
              isJoining={joinGroup.isPending}
            />
          ))}
        </div>
      ) : (
        <Card className="py-8">
          <CardContent className="text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h4 className="mt-4 font-medium text-foreground">No groups yet</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to create a group in this community!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
