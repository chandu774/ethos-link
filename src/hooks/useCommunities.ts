import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";

export interface Community {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  avatar_url?: string | null;
  category?: string | null;
  approval_status?: string;
  created_by?: string | null;
  is_user_created?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CommunityWithMembers extends Community {
  members: number;
}

export function useCommunities() {
  return useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const communities = await api.get<any[]>("/chat/communities");
      return (communities || []).map((c: any) => ({
        id: c.id || c._id,
        name: c.name,
        description: c.description || null,
        icon: null,
        color: null,
        avatar_url: c.avatar_url || null,
        category: c.category || "General",
        approval_status: "approved",
        created_by: c.created_by,
        is_user_created: false,
        created_at: c.created_at,
        members: c.member_count || 1,
      })) as CommunityWithMembers[];
    },
  });
}

export function usePendingCommunities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["communities", "pending", user?.id],
    queryFn: async () => [] as Community[],
    enabled: !!user,
  });
}

export function useAdminPendingCommunities(enabled: boolean) {
  return useQuery({
    queryKey: ["communities", "pending", "admin"],
    queryFn: async () => [] as Community[],
    enabled,
  });
}

export function useApproveCommunity() {
  const queryClient = useQueryClient();

  return {
    mutate: async (communityId: string) => {
      await api.patch(`/chat/communities/${communityId}/approve`);
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  };
}

export function useRejectCommunity() {
  const queryClient = useQueryClient();

  return {
    mutate: async (communityId: string) => {
      await api.patch(`/chat/communities/${communityId}/reject`);
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  };
}
