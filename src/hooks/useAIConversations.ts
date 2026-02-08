import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Json } from "@/integrations/supabase/types";

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
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data.map((conv) => ({
        ...conv,
        messages: (conv.messages as unknown as Message[]) || [],
      })) as Conversation[];
    },
    enabled: !!user,
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: user!.id,
          messages: [initialMessage] as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        messages: data.messages as unknown as Message[],
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
      id, 
      messages, 
      summary 
    }: { 
      id: string; 
      messages: Message[]; 
      summary?: string;
    }) => {
      const { error } = await supabase
        .from("ai_conversations")
        .update({
          messages: messages as unknown as Json,
          summary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });

  return {
    conversations: conversationsQuery.data,
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

      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      return {
        ...data,
        messages: (data.messages as unknown as Message[]) || [],
      } as Conversation;
    },
    enabled: !!user && !!conversationId,
  });
}
