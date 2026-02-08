import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useMemo, useRef } from "react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  community_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface GroupMember {
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

interface GroupMessage {
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

interface GroupMessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

// Get groups the user is a member of
export function useUserGroups(communityId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`group-membership-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["groups", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["groups", user?.id, communityId],
    queryFn: async () => {
      if (!user) return [];

      // First get group IDs where user is a member
      const { data: membershipData, error: membershipError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (membershipError) throw membershipError;

      const groupIds = membershipData.map((m) => m.group_id);
      
      if (groupIds.length === 0) return [];

      // Then get the groups
      let query = supabase
        .from("groups")
        .select("*")
        .in("id", groupIds);

      if (communityId === null) {
        // Professional mode - groups with no community
        query = query.is("community_id", null);
      } else if (communityId) {
        // Personal mode - specific community
        query = query.eq("community_id", communityId);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Group[];
    },
    enabled: !!user,
  });
}

// Get available groups in a community (for joining)
export function useCommunityGroups(communityId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["community-groups", communityId],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Group[];
    },
    enabled: !!user && !!communityId,
  });
}

// Get group members - removed trust_score from query
export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select(`
          *,
          profile:profiles(id, name, username, avatar_url)
        `)
        .eq("group_id", groupId);

      if (error) throw error;
      return data as GroupMember[];
    },
    enabled: !!groupId,
  });
}

// Get group messages with real-time updates - FIXED to prevent infinite subscriptions
export function useGroupMessages(groupId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Set up and clean up real-time subscription properly
  useEffect(() => {
    if (!groupId) return;

    // Clean up previous subscription if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [groupId, queryClient]);

  return useQuery({
    queryKey: ["group-messages", groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from("group_messages")
        .select(`
          *,
          sender:profiles(id, name, username, avatar_url)
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as GroupMessage[];
    },
    enabled: !!groupId,
  });
}

export function useGroupDetails(groupId: string | null) {
  return useQuery({
    queryKey: ["group-details", groupId],
    queryFn: async () => {
      if (!groupId) return null;

      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error) throw error;
      return data as Group;
    },
    enabled: !!groupId,
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      name,
      avatarUrl,
    }: {
      groupId: string;
      name?: string;
      avatarUrl?: string | null;
    }) => {
      const updates: Record<string, unknown> = {};
      if (typeof name === "string") updates.name = name.trim();
      if (typeof avatarUrl !== "undefined") updates.avatar_url = avatarUrl;
      if (Object.keys(updates).length === 0) return;

      const { error } = await supabase
        .from("groups")
        .update(updates)
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["group-details", variables.groupId] });
    },
  });
}
// Create a new group - simplified to prevent re-renders
export function useCreateGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      communityId,
    }: {
      name: string;
      description?: string;
      communityId?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name,
          description: description || null,
          creator_id: user.id,
          community_id: communityId || null,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin member
      const { error: memberError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "admin",
      });

      if (memberError) throw memberError;

      return group;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      if (variables.communityId) {
        queryClient.invalidateQueries({ queryKey: ["community-groups", variables.communityId] });
      }
      toast.success("Group created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create group");
    },
  });
}

// Join a group
export function useJoinGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: user.id,
        role: "member",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["group-members"] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      toast.success("Joined group successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to join group");
    },
  });
}

// Leave a group
export function useLeaveGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["group-members"] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      toast.success("Left group successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to leave group");
    },
  });
}

// Send a group message
export function useSendGroupMessage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      content,
      replyToMessageId,
    }: {
      groupId: string;
      content: string;
      replyToMessageId?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("group_messages")
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content,
          reply_to_message_id: replyToMessageId ?? null,
        })
        .select(`
          *,
          sender:profiles(id, name, username, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Update group's updated_at
      await supabase
        .from("groups")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", groupId);

      return data as GroupMessage;
    },
    onMutate: async ({ groupId, content, replyToMessageId }) => {
      if (!user) return undefined;

      await queryClient.cancelQueries({ queryKey: ["group-messages", groupId] });
      const previous = queryClient.getQueryData<GroupMessage[]>(["group-messages", groupId]) || [];
      const tempId = `temp-${Date.now()}`;

      const optimisticMessage: GroupMessage = {
        id: tempId,
        group_id: groupId,
        sender_id: user.id,
        content,
        created_at: new Date().toISOString(),
        reply_to_message_id: replyToMessageId ?? null,
        sender: {
          id: user.id,
          name: profile?.name || "You",
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
        },
      };

      queryClient.setQueryData<GroupMessage[]>(["group-messages", groupId], (old) => {
        const existing = old ?? [];
        return [...existing, optimisticMessage];
      });

      return { previous, tempId };
    },
    onSuccess: (data, { groupId }, context) => {
      queryClient.setQueryData<GroupMessage[]>(["group-messages", groupId], (old) => {
        const existing = old ?? [];
        const cleaned = context?.tempId ? existing.filter((msg) => msg.id !== context.tempId) : existing;
        if (!data) return cleaned;
        const withoutDuplicate = cleaned.filter((msg) => msg.id !== data.id);
        return [...withoutDuplicate, data].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error: Error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData<GroupMessage[]>(["group-messages", variables.groupId], context.previous);
      }
      toast.error(error.message || "Failed to send message");
    },
  });
}

export function useGroupMessageReactions(messageIds: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const idsKey = useMemo(() => [...messageIds].sort().join(","), [messageIds]);

  const query = useQuery({
    queryKey: ["group-message-reactions", idsKey],
    queryFn: async () => {
      if (!messageIds.length) return [] as GroupMessageReaction[];
      const { data, error } = await supabase
        .from("group_message_reactions")
        .select("*")
        .in("message_id", messageIds);
      if (error) throw error;
      return data as GroupMessageReaction[];
    },
    enabled: !!user && messageIds.length > 0,
  });

  useEffect(() => {
    if (!messageIds.length) return;
    const messageIdSet = new Set(messageIds);
    const channel = supabase
      .channel(`group-message-reactions-${idsKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_message_reactions" },
        (payload) => {
          const messageId =
            (payload.new as GroupMessageReaction | null)?.message_id ??
            (payload.old as GroupMessageReaction | null)?.message_id;
          if (messageId && messageIdSet.has(messageId)) {
            queryClient.invalidateQueries({ queryKey: ["group-message-reactions", idsKey] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [idsKey, messageIds, queryClient]);

  return query;
}

export function useToggleGroupMessageReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user?.id) {
        if (import.meta.env.DEV) {
          console.error("Missing user id for group reaction");
        }
        throw new Error("Not authenticated");
      }
      if (!messageId) {
        if (import.meta.env.DEV) {
          console.error("Missing message id for group reaction");
        }
        throw new Error("Missing message id");
      }

      const { data: existing, error: existingError } = await supabase
        .from("group_message_reactions")
        .select("id, emoji")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) {
        if (import.meta.env.DEV) {
          console.error("Group reaction lookup failed:", existingError);
        }
        throw existingError;
      }

      if (existing?.id && existing.emoji === emoji) {
        const { error } = await supabase
          .from("group_message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id);
        if (error) {
          if (import.meta.env.DEV) {
            console.error("Group reaction delete failed:", error);
          }
          throw error;
        }
        return { action: "removed" as const };
      }

      const { error } = await supabase.from("group_message_reactions").upsert(
        {
          message_id: messageId,
          user_id: user.id,
          emoji,
        },
        {
          onConflict: "message_id,user_id",
        }
      );
      if (error) {
        if (import.meta.env.DEV) {
          console.error("Group reaction upsert failed:", error);
        }
        throw error;
      }
      return { action: "added" as const };
    },
    onMutate: async ({ messageId, emoji }) => {
      const userId = user?.id;
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ["group-message-reactions"] });
      const previous = queryClient.getQueriesData<GroupMessageReaction[]>({
        queryKey: ["group-message-reactions"],
      });

      previous.forEach(([key, data]) => {
        if (!data) return;
        const existing = data.find(
          (reaction) => reaction.message_id === messageId && reaction.user_id === userId
        );
        let next = data.filter(
          (reaction) => !(reaction.message_id === messageId && reaction.user_id === userId)
        );

        if (!existing || existing.emoji !== emoji) {
          next = [
            ...next,
            {
              id: `temp-${messageId}-${emoji}-${userId}`,
              message_id: messageId,
              user_id: userId,
              emoji,
              created_at: new Date().toISOString(),
            },
          ];
        }

        queryClient.setQueryData(key, next);
      });

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-message-reactions"] });
    },
    onError: (_error, _variables, context) => {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
  });
}

// Add member to group (admin only)
export function useAddGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: userId,
        role: "member",
      });

      if (error) throw error;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      toast.success("Member added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add member");
    },
  });
}

// Remove member from group (admin only)
export function useRemoveGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      toast.success("Member removed successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove member");
    },
  });
}

// Check if user is admin of a group
export function useIsGroupAdmin(groupId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-group-admin", groupId, user?.id],
    queryFn: async () => {
      if (!user || !groupId) return false;

      const { data, error } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single();

      if (error) return false;
      return data.role === "admin";
    },
    enabled: !!user && !!groupId,
  });
}

// Check if user is member of a group
export function useIsGroupMember(groupId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-group-member", groupId, user?.id],
    queryFn: async () => {
      if (!user || !groupId) return false;

      const { data, error } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
    enabled: !!user && !!groupId,
  });
}
