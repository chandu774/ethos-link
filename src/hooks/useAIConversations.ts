import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
  summary: string | null;
}

const initialMessage: Message = {
  id: "1",
  role: "assistant",
  content: "Hey! 👋 What's on your mind today?",
};

export function useAIConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ["ai-conversations", user?.id],
    queryFn: async () => {
      const data = await api.get<any[]>("/ai/conversations");
      return (data || []).map((conv: any) => ({
        id: conv.id || conv._id,
        user_id: conv.user_id,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        summary: conv.summary || null,
        messages: (conv.messages || []).map((m: any, idx: number) => ({
          id: m.id || String(idx),
          role: m.role,
          content: m.content,
        })),
      })) as Conversation[];
    },
    enabled: !!user,
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      const data = await api.post<any>("/ai/chat", {
        messages: [initialMessage],
      });
      return {
        id: data.id || `conv-${Date.now()}`,
        user_id: user?.id || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        summary: "New Study Chat",
        messages: [initialMessage],
      } as Conversation;
    },
    onSuccess: (newConv) => {
      queryClient.setQueryData(
        ["ai-conversations", user?.id],
        (old: Conversation[] | undefined) => [newConv, ...(old || [])]
      );
    },
  });

  const updateConversation = useMutation({
    mutationFn: async ({
      id: _id,
      messages: _messages,
      summary: _summary,
    }: {
      id: string;
      messages: Message[];
      summary?: string;
    }) => {
      // Updates happen implicitly through /ai/chat messages array
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ai/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });

  return {
    conversations: conversationsQuery.data || [],
    isLoading: conversationsQuery.isLoading,
    createConversation,
    updateConversation,
    deleteConversation,
    initialMessage,
  };
}

export function useCurrentConversation(conversationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-conversation", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      try {
        const data = await api.get<any>(`/ai/conversations/${conversationId}`);
        if (!data) return null;
        return {
          id: data.id || data._id,
          user_id: data.user_id,
          created_at: data.created_at,
          updated_at: data.updated_at,
          summary: data.summary || null,
          messages: (data.messages || []).map((m: any, idx: number) => ({
            id: m.id || String(idx),
            role: m.role,
            content: m.content,
          })),
        } as Conversation;
      } catch (e) {
        return null;
      }
    },
    enabled: !!user && !!conversationId,
  });
}
