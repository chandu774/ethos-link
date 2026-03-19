import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { CollaborationTask } from "@/lib/collaboration";

export function useTasks(groupId: string | null, assignedTo?: string | null) {
  return useQuery({
    queryKey: ["tasks", groupId, assignedTo],
    queryFn: async () => {
      if (!groupId) return [] as CollaborationTask[];
      let query = supabase
        .from("tasks")
        .select("*")
        .eq("group_id", groupId)
        .order("deadline", { ascending: true, nullsFirst: false });

      if (assignedTo) {
        query = query.eq("assigned_to", assignedTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CollaborationTask[];
    },
    enabled: !!groupId,
  });
}

export function useCreateTask(groupId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      assignedTo,
      deadline,
    }: {
      title: string;
      description?: string;
      assignedTo?: string | null;
      deadline?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          group_id: groupId,
          title: title.trim(),
          description: description?.trim() || null,
          assigned_to: assignedTo || null,
          deadline: deadline || null,
          created_by: user.id,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as CollaborationTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", groupId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Task created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create task");
    },
  });
}

export function useUpdateTaskStatus(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: CollaborationTask["status"];
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", groupId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task");
    },
  });
}
