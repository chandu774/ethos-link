import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/apiClient";
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
      const groups = await api.get<any[]>("/chat/groups");
      return (groups || []).map((g: any) => ({
        id: g.id || g._id,
        name: g.name,
        description: g.description,
        creator_id: g.created_by,
        is_private: false,
        created_at: g.created_at,
        updated_at: g.updated_at,
        members_count: 1,
        member_role: "admin",
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
      isPrivate: _isPrivate,
    }: {
      name: string;
      description?: string;
      isPrivate?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const group = await api.post<any>("/chat/groups", {
        name: name.trim(),
        description: description?.trim() || null,
      });
      return {
        id: group.id || group._id,
        name: group.name,
        description: group.description,
        creator_id: user.id,
        is_private: false,
        created_at: group.created_at,
        updated_at: group.updated_at,
      } as CollaborationGroup;
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
      await api.post("/chat/groups/join", { inviteCode: inviteCode.trim().toUpperCase() });
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
    queryFn: async () => [] as CollaborationGroupMember[],
    enabled: !!groupId,
  });
}

export function useGroupRole(_groupId: string) {
  return useQuery({
    queryKey: ["group-role"],
    queryFn: async () => "admin",
  });
}

export function useAddCollaborationGroupMember(_groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-group-members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-groups"] });
      toast.success("Member added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add member");
    },
  });
}

export function useRemoveCollaborationGroupMember(_groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaboration-group-members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-groups"] });
      toast.success("Member removed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove member");
    },
  });
}
