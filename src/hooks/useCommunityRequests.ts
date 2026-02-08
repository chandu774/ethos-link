import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`community-create-requests-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_create_requests" },
        (payload) => {
          const requestUserId = (payload.new as CommunityCreateRequest | null)?.user_id;
          if (!requestUserId || requestUserId !== user.id) return;
          queryClient.invalidateQueries({ queryKey: ["community-create-requests", "me"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);

  return useQuery({
    queryKey: ["community-create-requests", "me"],
    queryFn: async () => {
      if (!user) return [] as CommunityCreateRequest[];
      const { data, error } = await supabase
        .from("community_create_requests")
        .select("id, user_id, community_name, description, category, avatar_url, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CommunityCreateRequest[];
    },
    enabled: !!user,
  });
}

export function useAdminCommunityRequests(enabled: boolean) {
  return useQuery({
    queryKey: ["community-create-requests", "pending", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_create_requests")
        .select(
          "id, user_id, community_name, description, category, avatar_url, status, created_at, user:profiles(id, name, username)"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CommunityCreateRequest[];
    },
    enabled,
  });
}

export function useApproveCommunityRequest() {
  const queryClient = useQueryClient();

  return {
    mutate: async (requestId: string) => {
      const { error } = await supabase.rpc("approve_community_request", { request_id: requestId });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["community-create-requests"] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  };
}

export function useRejectCommunityRequest() {
  const queryClient = useQueryClient();

  return {
    mutate: async (requestId: string) => {
      const { error } = await supabase.rpc("reject_community_request", { request_id: requestId });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["community-create-requests"] });
    },
  };
}
