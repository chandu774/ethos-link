import { useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/apiClient";

const DEFAULT_PAGE_SIZE = 30;

interface MessageUser {
  id: string | null;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface AssignmentMessageItem {
  id: string;
  assignment_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: MessageUser | null;
}

export function useAssignmentChat(assignmentId: string, pageSize = DEFAULT_PAGE_SIZE) {
  const query = useInfiniteQuery({
    queryKey: ["assignment-chat", assignmentId, pageSize],
    initialPageParam: 0,
    queryFn: async () => {
      try {
        const data = await api.get<any[]>(`/assignments/${assignmentId}/messages`);
        return (data || []).map((m: any) => ({
          id: m.id || m._id,
          assignment_id: assignmentId,
          user_id: m.user_id?._id || m.user_id,
          message: m.message || m.content,
          created_at: m.created_at || new Date().toISOString(),
          user: m.user_id && typeof m.user_id === "object"
            ? {
                id: m.user_id._id || m.user_id.id,
                name: m.user_id.name || "Student",
                username: m.user_id.roll_number,
                avatar_url: m.user_id.avatar_url,
              }
            : null,
        })) as AssignmentMessageItem[];
      } catch {
        return [] as AssignmentMessageItem[];
      }
    },
    getNextPageParam: () => undefined,
    enabled: !!assignmentId,
    refetchInterval: 5000,
  });

  const messages = useMemo(() => {
    const pages = query.data?.pages || [];
    return pages.flat() as AssignmentMessageItem[];
  }, [query.data?.pages]);

  return {
    ...query,
    messages,
  };
}

export function useSendAssignmentMessage(assignmentId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      if (!user) throw new Error("Please login first.");
      if (!assignmentId) throw new Error("Assignment not selected.");
      if (!message.trim()) throw new Error("Message is empty.");

      try {
        await api.post(`/assignments/${assignmentId}/messages`, {
          message: message.trim(),
        });
      } catch (err: any) {
        console.warn("Assignment message error:", err);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send message");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment-chat", assignmentId] });
    },
  });
}
