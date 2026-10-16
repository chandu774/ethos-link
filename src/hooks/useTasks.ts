import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/apiClient";
import type { CollaborationTask } from "@/lib/collaboration";

export function useTasks(groupId: string | null, assignedTo?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tasks", user?.id, groupId, assignedTo],
    queryFn: async () => {
      if (!user) return [] as CollaborationTask[];

      const params = new URLSearchParams();
      if (groupId) params.append("groupId", groupId);
      if (assignedTo) params.append("assignedTo", assignedTo);

      const data = await api.get<any[]>(`/tasks?${params.toString()}`);
      return (data || []).map((t: any) => ({
        id: t.id || t._id,
        title: t.title,
        description: t.description,
        status: t.status,
        deadline: t.deadline,
        created_by: t.created_by,
        group_id: t.group_id,
        assigned_to: t.assigned_to,
        created_at: t.created_at,
        priority: t.priority,
        official_assignment_id: t.official_assignment_id,
        subject: t.subject,
      })) as CollaborationTask[];
    },
    enabled: !!user,
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

      const data = await api.post<any>("/tasks", {
        group_id: groupId,
        title: title.trim(),
        description: description?.trim() || null,
        assigned_to: assignedTo || null,
        deadline: deadline || null,
      });

      return {
        id: data.id || data._id,
        title: data.title,
        description: data.description,
        status: data.status,
        deadline: data.deadline,
        created_by: data.created_by,
        group_id: data.group_id,
        assigned_to: data.assigned_to,
        created_at: data.created_at,
      } as CollaborationTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Task created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create task");
    },
  });
}

export function useUpdateTaskStatus(groupId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: CollaborationTask["status"];
    }) => {
      await api.patch(`/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: ["tasks", groupId] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task");
    },
  });
}
