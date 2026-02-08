import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

interface Community {
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
  updated_at: string;
}

interface CommunityWithMembers extends Community {
  members: number;
}

export function useCommunities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`community-memberships-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_members" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["communities"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "communities" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["communities"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const { data: communities, error } = await supabase
        .from("communities")
        .select("id, name, description, icon, color, avatar_url, category, approval_status, created_by, is_user_created, created_at, updated_at")
        .eq("approval_status", "approved")
        .order("name", { ascending: true });

      if (error) throw error;
      if (!communities || communities.length === 0) return [] as CommunityWithMembers[];

      const communityIds = communities.map((community) => community.id);

      const { data: members, error: membersError } = await supabase
        .from("community_members")
        .select("community_id, user_id")
        .in("community_id", communityIds);

      if (membersError) throw membersError;

      const memberSets = new Map<string, Set<string>>();
      members?.forEach((member) => {
        const communityId = member.community_id;
        if (!communityId) return;
        if (!memberSets.has(communityId)) {
          memberSets.set(communityId, new Set());
        }
        memberSets.get(communityId)!.add(member.user_id);
      });

      return communities.map((community) => ({
        ...community,
        members: memberSets.get(community.id)?.size ?? 0,
      })) as CommunityWithMembers[];
    },
    enabled: true,
  });
}

export function usePendingCommunities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["communities", "pending", user?.id],
    queryFn: async () => {
      if (!user) return [] as Community[];
      const { data, error } = await supabase
        .from("communities")
        .select("id, name, description, icon, color, avatar_url, category, approval_status, created_by, is_user_created, created_at, updated_at")
        .eq("created_by", user.id)
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Community[];
    },
    enabled: !!user,
  });
}

export function useAdminPendingCommunities(enabled: boolean) {
  return useQuery({
    queryKey: ["communities", "pending", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("id, name, description, icon, color, avatar_url, category, approval_status, created_by, is_user_created, created_at, updated_at")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Community[];
    },
    enabled,
  });
}

export function useApproveCommunity() {
  const queryClient = useQueryClient();

  return {
    mutate: async (communityId: string, creatorId: string | null) => {
      const { error } = await supabase
        .from("communities")
        .update({ approval_status: "approved" })
        .eq("id", communityId);
      if (error) throw error;

      if (creatorId) {
        const { error: memberError } = await supabase.from("community_members").insert({
          community_id: communityId,
          user_id: creatorId,
          role: "admin",
        });
        if (memberError) throw memberError;
      }

      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({ queryKey: ["communities", "pending"] });
    },
  };
}

export function useRejectCommunity() {
  const queryClient = useQueryClient();

  return {
    mutate: async (communityId: string) => {
      const { error } = await supabase
        .from("communities")
        .update({ approval_status: "rejected" })
        .eq("id", communityId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["communities", "pending"] });
    },
  };
}
