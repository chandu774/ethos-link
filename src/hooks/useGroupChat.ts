import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildStoragePath, type CollaborationMessage, uploadCollaborationFile } from "@/lib/collaboration";

const PAGE_SIZE = 20;

export function useGroupMessages(groupId: string | null) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["collaboration-group-messages", groupId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!groupId) return [] as CollaborationMessage[];

      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("group_messages")
        .select(`
          *,
          sender:profiles(id, name, username, avatar_url)
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return (data as CollaborationMessage[]).reverse();
    },
    getNextPageParam: (lastPage, allPages) => (lastPage.length < PAGE_SIZE ? undefined : allPages.length),
    enabled: !!groupId,
  });

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`collaboration-group-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["collaboration-group-messages", groupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  const messages = useMemo(
    () => query.data?.pages.flatMap((page) => page) ?? [],
    [query.data]
  );

  return { ...query, messages };
}

export function useSendGroupChatMessage(groupId: string) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      file,
    }: {
      content: string;
      file?: File | null;
    }) => {
      if (!user) throw new Error("Not authenticated");

      let fileUrl: string | null = null;
      let type = "text";

      if (file) {
        const path = buildStoragePath(user.id, file, groupId);
        fileUrl = await uploadCollaborationFile({
          bucket: "shared-files",
          path,
          file,
        });
        type = "file";
      }

      const { data, error } = await supabase
        .from("group_messages")
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content: content.trim() || file?.name || "Shared a file",
          file_url: fileUrl,
          type,
          metadata: file ? { fileName: file.name, fileSize: file.size } : {},
        })
        .select(`
          *,
          sender:profiles(id, name, username, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as CollaborationMessage;
    },
    onMutate: async ({ content, file }) => {
      if (!user) return undefined;

      await queryClient.cancelQueries({ queryKey: ["collaboration-group-messages", groupId] });
      const previous = queryClient.getQueryData(["collaboration-group-messages", groupId]);
      const optimisticMessage: CollaborationMessage = {
        id: `temp-${Date.now()}`,
        group_id: groupId,
        sender_id: user.id,
        content: content.trim() || file?.name || "Shared a file",
        created_at: new Date().toISOString(),
        reply_to_message_id: null,
        file_url: null,
        metadata: file ? { fileName: file.name, optimistic: true } : {},
        type: file ? "file" : "text",
        sender: {
          id: user.id,
          name: profile?.name || "You",
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
        },
      };

      queryClient.setQueryData(
        ["collaboration-group-messages", groupId],
        (old: { pages?: CollaborationMessage[][]; pageParams?: number[] } | undefined) => {
          if (!old?.pages?.length) {
            return { pages: [[optimisticMessage]], pageParams: [0] };
          }
          const pages = [...old.pages];
          pages[pages.length - 1] = [...pages[pages.length - 1], optimisticMessage];
          return { ...old, pages };
        }
      );

      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["collaboration-group-messages", groupId], context.previous);
      }
      toast.error(error.message || "Failed to send message");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-group-messages", groupId] });
    },
  });
}

export function useGroupTyping(groupId: string | null) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!groupId || !user) return;

    const channel = supabase.channel(`typing:${groupId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload?.userId || payload.userId === user.id) return;
        setTypingUsers((current) => Array.from(new Set([...current, payload.userId])));
        window.setTimeout(() => {
          setTypingUsers((current) => current.filter((id) => id !== payload.userId));
        }, 2500);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [groupId, user]);

  const sendTyping = async () => {
    if (!channelRef.current || !user || !groupId) return;
    await channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, groupId },
    });
  };

  return { typingUsers, sendTyping };
}
