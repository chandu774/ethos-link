import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  community_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    id: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to_message_id?: string | null;
  sender?: {
    id: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface GroupMessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

// Get groups the user is a member of
export function useUserGroups(communityId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["groups", user?.id, communityId],
    queryFn: async () => {
      if (!user) return [];
      const data = await api.get<any[]>("/chat/groups");
      return (data || []).map((g: any) => ({
        id: g.id || g._id,
        name: g.name,
        description: g.description,
        creator_id: g.created_by,
        community_id: null,
        avatar_url: g.avatar_url,
        created_at: g.created_at,
        updated_at: g.updated_at,
      })) as Group[];
    },
    enabled: !!user,
  });
}

export function useCommunityGroups(_communityId: string) {
  return useQuery({
    queryKey: ["community-groups"],
    queryFn: async () => {
      const data = await api.get<any[]>("/chat/groups");
      return (data || []).map((g: any) => ({
        id: g.id || g._id,
        name: g.name,
        description: g.description,
        creator_id: g.created_by,
        community_id: null,
        avatar_url: g.avatar_url,
        created_at: g.created_at,
        updated_at: g.updated_at,
      })) as Group[];
    },
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => [] as GroupMember[],
    enabled: !!groupId,
  });
}

export function useGroupMessages(
  groupId: string | null,
  _options?: { pageSize?: number }
) {
  const query = useInfiniteQuery({
    queryKey: ["group-messages", groupId],
    initialPageParam: 0,
    queryFn: async () => {
      if (!groupId) return [];
      const data = await api.get<any[]>(`/chat/groups/${groupId}/messages`);
      return (data || []).map((m: any) => ({
        id: m.id || m._id,
        group_id: groupId,
        sender_id: m.user_id?._id || m.user_id || "",
        content: m.content,
        created_at: m.created_at,
        reply_to_message_id: null,
        sender: m.user_id && typeof m.user_id === "object"
          ? {
              id: m.user_id._id || m.user_id.id,
              name: m.user_id.name || "Student",
              username: m.user_id.roll_number,
              avatar_url: m.user_id.avatar_url,
            }
          : undefined,
      })) as GroupMessage[];
    },
    getNextPageParam: () => undefined,
    enabled: !!groupId,
    refetchInterval: 3000,
  });

  const messages = query.data?.pages?.[0] || [];

  return {
    ...query,
    data: messages,
    hasOlder: false,
    loadOlder: () => {},
    isLoadingOlder: false,
  };
}

export function useGroupDetails(groupId: string | null) {
  return useQuery({
    queryKey: ["group-details", groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const groups = await api.get<any[]>("/chat/groups");
      const found = (groups || []).find((g) => (g.id || g._id) === groupId);
      if (!found) return null;
      return {
        id: found.id || found._id,
        name: found.name,
        description: found.description,
        creator_id: found.created_by,
        community_id: null,
        avatar_url: found.avatar_url,
        created_at: found.created_at,
        updated_at: found.updated_at,
      } as Group;
    },
    enabled: !!groupId,
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, ...updates }: { groupId: string; name?: string; description?: string }) => {
      await api.patch(`/chat/groups/${groupId}`, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["group-details", variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update group");
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      avatarUrl,
    }: {
      name: string;
      description?: string;
      communityId?: string;
      avatarUrl?: string;
    }) => {
      return await api.post("/chat/groups", {
        name: name.trim(),
        description: description?.trim(),
        avatar_url: avatarUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group created!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create group");
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      await api.post(`/chat/groups/${groupId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Joined group!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to join group");
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      await api.post(`/chat/groups/${groupId}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Left group");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to leave group");
    },
  });
}

export function useSendGroupMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      content,
    }: {
      groupId: string;
      content: string;
      replyToMessageId?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      return await api.post(`/chat/groups/${groupId}/messages`, {
        content: content.trim(),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["group-messages", variables.groupId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send group message");
    },
  });
}

export function useGroupMessageReactions(_messageIds: string[]) {
  return useQuery({
    queryKey: ["group-message-reactions"],
    queryFn: async () => [] as GroupMessageReaction[],
    enabled: false,
  });
}

export function useToggleGroupMessageReaction() {
  return useMutation({
    mutationFn: async (_payload: { messageId: string; emoji: string }) => {
      return { action: "added" as const };
    },
  });
}

export function useAddGroupMember() {
  return useMutation({
    mutationFn: async () => {},
  });
}

export function useRemoveGroupMember() {
  return useMutation({
    mutationFn: async () => {},
  });
}

export function useIsGroupAdmin(_groupId: string) {
  return { isAdmin: true, isLoading: false };
}

export function useIsGroupMember(_groupId: string) {
  return { isMember: true, isLoading: false };
}
