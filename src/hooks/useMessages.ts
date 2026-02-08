import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo } from "react";

type Message = Tables<"messages">;
type MessageReaction = Tables<"message_reactions">;

export function useMessages(otherUserId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", user?.id, otherUserId],
    queryFn: async () => {
      if (!otherUserId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!user && !!otherUserId,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  useEffect(() => {
    if (!user || !otherUserId || !query.data?.length) return;

    const undeliveredIds = query.data
      .filter(
        (message) =>
          message.receiver_id === user.id &&
          message.sender_id === otherUserId &&
          !message.delivered_at
      )
      .map((message) => message.id);

    if (undeliveredIds.length === 0) return;

    supabase
      .from("messages")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .in("id", undeliveredIds);
  }, [query.data, otherUserId, user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user || !otherUserId) return;

    const channel = supabase
      .channel(`messages:${user.id}:${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `or(and(sender_id=eq.${user.id},receiver_id=eq.${otherUserId}),and(sender_id=eq.${otherUserId},receiver_id=eq.${user.id}))`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", user.id, otherUserId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `or(and(sender_id=eq.${user.id},receiver_id=eq.${otherUserId}),and(sender_id=eq.${otherUserId},receiver_id=eq.${user.id}))`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", user.id, otherUserId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherUserId, queryClient]);

  return query;
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      receiverId,
      content,
      replyToMessageId,
    }: {
      receiverId: string;
      content: string;
      replyToMessageId?: string | null;
    }) => {
      const { error } = await supabase.from("messages").insert({
        sender_id: user!.id,
        receiver_id: receiverId,
        content,
        reply_to_message_id: replyToMessageId ?? null,
        status: "sent",
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", user?.id, variables.receiverId] });
    },
  });
}

export function useRecentChats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recent-chats", user?.id],
    queryFn: async () => {
      // Get the most recent message with each user
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const chatMap = new Map<string, Message>();
      for (const msg of data as Message[]) {
        const partnerId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
        if (!chatMap.has(partnerId)) {
          chatMap.set(partnerId, msg);
        }
      }

      return Array.from(chatMap.entries()).map(([partnerId, lastMessage]) => ({
        partnerId,
        lastMessage,
      }));
    },
    enabled: !!user,
  });
}

export function useMessageReactions(messageIds: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const idsKey = useMemo(() => [...messageIds].sort().join(","), [messageIds]);

  const query = useQuery({
    queryKey: ["message-reactions", idsKey],
    queryFn: async () => {
      if (!messageIds.length) return [] as MessageReaction[];

      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", messageIds);

      if (error) throw error;
      return data as MessageReaction[];
    },
    enabled: !!user && messageIds.length > 0,
  });

  useEffect(() => {
    if (!messageIds.length) return;

    const messageIdSet = new Set(messageIds);
    const channel = supabase
      .channel(`message-reactions-${idsKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        (payload) => {
          const messageId =
            (payload.new as MessageReaction | null)?.message_id ??
            (payload.old as MessageReaction | null)?.message_id;
          if (messageId && messageIdSet.has(messageId)) {
            queryClient.invalidateQueries({ queryKey: ["message-reactions", idsKey] });
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

export function useToggleMessageReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user?.id) {
        if (import.meta.env.DEV) {
          console.error("Missing user id for reaction");
        }
        throw new Error("Not authenticated");
      }
      if (!messageId) {
        if (import.meta.env.DEV) {
          console.error("Missing message id for reaction");
        }
        throw new Error("Missing message id");
      }

      const { data: existing, error: existingError } = await supabase
        .from("message_reactions")
        .select("id, emoji")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) {
        if (import.meta.env.DEV) {
          console.error("Reaction lookup failed:", existingError);
        }
        throw existingError;
      }

      if (existing?.id && existing.emoji === emoji) {
        const { error } = await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id);
        if (error) {
          if (import.meta.env.DEV) {
            console.error("Reaction delete failed:", error);
          }
          throw error;
        }
        return { action: "removed" as const };
      }

      const { error } = await supabase.from("message_reactions").upsert(
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
          console.error("Reaction upsert failed:", error);
        }
        throw error;
      }
      return { action: "added" as const };
    },
    onMutate: async ({ messageId, emoji }) => {
      const userId = user?.id;
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ["message-reactions"] });
      const previous = queryClient.getQueriesData<MessageReaction[]>({
        queryKey: ["message-reactions"],
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
      queryClient.invalidateQueries({ queryKey: ["message-reactions"] });
    },
    onError: (_error, _variables, context) => {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
  });
}
