import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";

export interface CommunityCreateRequest {
  id: string;
  user_id: string;
  community_name: string;
  description: string | null;
  category: string | null;
  avatar_url: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  user?: {
    id: string;
    name: string | null;
    username: string | null;
  } | null;
}

export function useMyCommunityRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["community-create-requests", "me"],
    queryFn: async () => [] as CommunityCreateRequest[],
    enabled: !!user,
  });
}

export function useAdminCommunityRequests(enabled: boolean) {
  return useQuery({
    queryKey: ["community-create-requests", "pending", "admin"],
    queryFn: async () => [] as CommunityCreateRequest[],
    enabled,
  });
}

export function useApproveCommunityRequest() {
  const queryClient = useQueryClient();

  return {
    mutate: async (requestId: string) => {
      await api.patch(`/chat/communities/${requestId}/approve`);
      queryClient.invalidateQueries({ queryKey: ["community-create-requests"] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  };
}

export function useRejectCommunityRequest() {
  const queryClient = useQueryClient();

  return {
    mutate: async (requestId: string) => {
      await api.patch(`/chat/communities/${requestId}/reject`);
      queryClient.invalidateQueries({ queryKey: ["community-create-requests"] });
    },
  };
}
