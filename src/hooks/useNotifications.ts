import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/apiClient";
import type { CollaborationNotification } from "@/lib/collaboration";

export function useNotifications(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", user?.id, limit],
    queryFn: async () => {
      if (!user) return [] as CollaborationNotification[];
      const data = await api.get<any[]>(`/notifications?limit=${limit}`);
      return (data || []).map((n: any) => ({
        id: n.id || n._id,
        user_id: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        action_url: n.action_url,
        is_read: n.is_read,
        created_at: n.created_at,
        metadata: n.metadata,
      })) as CollaborationNotification[];
    },
    enabled: !!user,
    refetchInterval: 15000, // Poll every 15 seconds
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      await api.patch("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}
