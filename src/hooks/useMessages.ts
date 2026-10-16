import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  reply_to_message_id?: string | null;
  status?: string;
  delivered_at?: string | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export function useMessages(
  otherUserId: string | null,
  options?: { pageSize?: number }
) {
  const { user } = useAuth();
  const pageSize = options?.pageSize ?? 40;

  const query = useInfiniteQuery({
    queryKey: ["messages", user?.id, otherUserId],
    initialPageParam: 0,
    queryFn: async ({ pageParam: _pageParam }) => {
      if (!otherUserId) return [];
      const data = await api.get<any[]>(`/chat/direct/${otherUserId}`);
      return (data || []).map((m: any) => ({
        id: m.id || m._id,
        sender_id: m.sender_id?._id || m.sender_id || "",
        receiver_id: m.receiver_id?._id || m.receiver_id || "",
        content: m.content,
        created_at: m.created_at || new Date().toISOString(),
        status: m.is_read ? "read" : "sent",
      })) as Message[];
    },
    getNextPageParam: () => undefined,
    enabled: !!user && !!otherUserId,
    refetchInterval: 3000, // Poll every 3 seconds for active conversation
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

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      receiverId,
      content,
      replyToMessageId: _replyToMessageId,
    }: {
      receiverId: string;
      content: string;
      replyToMessageId?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      return await api.post("/chat/direct", {
        receiver_id: receiverId,
        content: content.trim(),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", user?.id, variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: ["recent-chats", user?.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send message");
    },
  });
}

export function useRecentChats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recent-chats", user?.id],
    queryFn: async () => {
      const connections = await api.get<any[]>("/chat/connections");
      const accepted = (connections || []).filter((c) => c.status === "accepted");

      return accepted.map((c: any) => {
        const partner =
          (c.requester_id?._id || c.requester_id) === user?.id
            ? c.receiver_id
            : c.requester_id;
        const partnerId = partner?._id || partner?.id || partner || "";

        return {
          partnerId,
          lastMessage: {
            id: c.id || c._id,
            sender_id: partnerId,
            receiver_id: user?.id || "",
            content: "Connected",
            created_at: c.updated_at || c.created_at || new Date().toISOString(),
          } as Message,
        };
      });
    },
    enabled: !!user,
  });
}

export function useMessageReactions(_messageIds: string[]) {
  return useQuery({
    queryKey: ["message-reactions"],
    queryFn: async () => [] as MessageReaction[],
    enabled: false,
  });
}

export function useToggleMessageReaction() {
  return useMutation({
    mutationFn: async (_payload: { messageId: string; emoji: string }) => {
      return { action: "added" as const };
    },
  });
}
