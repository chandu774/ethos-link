import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/apiClient";
import type { CollaborationMessage } from "@/lib/collaboration";

export function useGroupMessages(groupId: string | null) {
  const query = useInfiniteQuery({
    queryKey: ["collaboration-group-messages", groupId],
    initialPageParam: 0,
    queryFn: async () => {
      if (!groupId) return [] as CollaborationMessage[];
      const data = await api.get<any[]>(`/chat/groups/${groupId}/messages`);
      return (data || []).map((m: any) => ({
        id: m.id || m._id,
        group_id: groupId,
        sender_id: m.user_id?._id || m.user_id || "",
        content: m.content,
        created_at: m.created_at || new Date().toISOString(),
        reply_to_message_id: null,
        file_url: null,
        metadata: {},
        type: "text",
        sender: m.user_id && typeof m.user_id === "object"
          ? {
              id: m.user_id._id || m.user_id.id,
              name: m.user_id.name || "Student",
              username: m.user_id.roll_number,
              avatar_url: m.user_id.avatar_url,
            }
          : undefined,
      })) as CollaborationMessage[];
    },
    getNextPageParam: () => undefined,
    enabled: !!groupId,
    refetchInterval: 3000,
  });

  const messages = query.data?.pages?.[0] || [];

  return { ...query, messages };
}

export function useSendGroupChatMessage(groupId: string) {
  const { user } = useAuth();
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

      let finalContent = content.trim();
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.upload<{ url: string }>("/storage/upload", formData);
        finalContent = finalContent ? `${finalContent} (${res.url})` : res.url;
      }

      return await api.post(`/chat/groups/${groupId}/messages`, {
        content: finalContent || "Shared a file",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-group-messages", groupId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send message");
    },
  });
}

export function useGroupTyping(_groupId: string | null) {
  const [typingUsers] = useState<string[]>([]);
  const sendTyping = async () => {};
  return { typingUsers, sendTyping };
}
