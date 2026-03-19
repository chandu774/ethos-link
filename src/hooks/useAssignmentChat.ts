import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

interface AssignmentMessageRow {
  id: string;
  assignment_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: MessageUser | null;
}

async function fetchMessageById(messageId: string) {
  const { data, error } = await supabase
    .from("assignment_messages")
    .select(`
      id,
      assignment_id,
      user_id,
      message,
      created_at,
      user:profiles_public(id, name, username, avatar_url)
    `)
    .eq("id", messageId)
    .single();

  if (error) throw error;
  return data as AssignmentMessageItem;
}

export function useAssignmentChat(assignmentId: string, pageSize = DEFAULT_PAGE_SIZE) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["assignment-chat", assignmentId, pageSize],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("assignment_messages")
        .select(`
          id,
          assignment_id,
          user_id,
          message,
          created_at,
          user:profiles_public(id, name, username, avatar_url)
        `)
        .eq("assignment_id", assignmentId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return (data || []) as AssignmentMessageRow[];
    },
    getNextPageParam: (lastPage, allPages) => (lastPage.length < pageSize ? undefined : allPages.length),
    enabled: !!assignmentId,
  });

  useEffect(() => {
    if (!assignmentId) return;

    const channel = supabase
      .channel(`assignment-chat-${assignmentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "assignment_messages",
          filter: `assignment_id=eq.${assignmentId}`,
        },
        async (payload) => {
          try {
            const incoming = await fetchMessageById(payload.new.id as string);
            queryClient.setQueryData(
              ["assignment-chat", assignmentId, pageSize],
              (
                current:
                  | { pages: AssignmentMessageRow[][]; pageParams: number[] }
                  | undefined
              ) => {
                if (!current) return current;
                const exists = current.pages.some((page) => page.some((row) => row.id === incoming.id));
                if (exists) return current;

                const nextPages = [...current.pages];
                if (!nextPages[0]) {
                  nextPages[0] = [incoming];
                } else {
                  nextPages[0] = [incoming, ...nextPages[0]];
                }

                return {
                  ...current,
                  pages: nextPages,
                };
              }
            );
          } catch {
            queryClient.invalidateQueries({ queryKey: ["assignment-chat", assignmentId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assignmentId, pageSize, queryClient]);

  const messages = useMemo(() => {
    const pages = query.data?.pages || [];
    return pages
      .map((page) => [...page].reverse())
      .reverse()
      .flat() as AssignmentMessageItem[];
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

      const { error } = await supabase.from("assignment_messages").insert({
        assignment_id: assignmentId,
        user_id: user.id,
        message: message.trim(),
      });
      if (error) throw error;
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send message");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment-chat", assignmentId] });
    },
  });
}
