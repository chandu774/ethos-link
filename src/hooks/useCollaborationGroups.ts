import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { CollaborationGroup, CollaborationGroupMember } from "@/lib/collaboration";

type GroupWithMeta = CollaborationGroup & {
  members_count: number;
  member_role: string | null;
};

export function useDashboardGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-groups", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: memberships, error: membershipError } = await supabase
        .from("group_members")
        .select("group_id, role")
        .eq("user_id", user.id);

      if (membershipError) throw membershipError;
      if (!memberships.length) return [] as GroupWithMeta[];

      const groupIds = memberships.map((item) => item.group_id);
      const roleMap = new Map(memberships.map((item) => [item.group_id, item.role]));

      const { data: groups, error } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const { data: memberCounts, error: countError } = await supabase
        .from("group_members")
        .select("group_id")
        .in("group_id", groupIds);

      if (countError) throw countError;

      const counts = memberCounts.reduce<Record<string, number>>((acc, item) => {
        acc[item.group_id] = (acc[item.group_id] ?? 0) + 1;
        return acc;
      }, {});

      return groups.map((group) => ({
        ...group,
        members_count: counts[group.id] ?? 0,
        member_role: roleMap.get(group.id) ?? null,
      })) as GroupWithMeta[];
    },
    enabled: !!user,
  });
}

export function useCreateCollaborationGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      isPrivate,
    }: {
      name: string;
      description?: string;
      isPrivate?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: group, error } = await supabase
        .from("groups")
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          creator_id: user.id,
          is_private: !!isPrivate,
        })
        .select("*")
        .single();

      if (error) throw error;

      const { error: memberError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "admin",
      });

      if (memberError) throw memberError;
      return group as CollaborationGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-groups"] });
      toast.success("Group created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create group");
    },
  });
}

export function useJoinGroupByInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const { error } = await supabase.rpc("join_group_with_invite", {
        target_invite_code: inviteCode.trim().toUpperCase(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-groups"] });
      queryClient.invalidateQueries({ queryKey: ["group-members"] });
      toast.success("Joined group");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to join group");
    },
  });
}

export function useCollaborationGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ["collaboration-group-members", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select(`
          *,
          profile:profiles(id, name, username, avatar_url)
        `)
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true });

      if (error) throw error;
      return data as CollaborationGroupMember[];
    },
    enabled: !!groupId,
  });
}

export function useGroupRole(groupId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["group-role", groupId, user?.id],
    queryFn: async () => {
      if (!groupId || !user) return null;
      const { data, error } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.role ?? null;
    },
    enabled: !!groupId && !!user,
  });
}

export function useAddCollaborationGroupMember(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: userId,
        role: "member",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-groups"] });
      toast.success("Member added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add member");
    },
  });
}
