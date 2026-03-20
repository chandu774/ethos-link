import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Connection = Tables<"connections">;
type PublicProfile = Tables<"profiles_public">;

interface ConnectionWithProfile extends Connection {
  requester: PublicProfile | null;
  receiver: PublicProfile | null;
}

export function useConnections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["connections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(`requester_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .eq("status", "accepted");

      if (error) throw error;
      const connections = data as Connection[];
      if (connections.length === 0) return [] as ConnectionWithProfile[];

      const uniqueConnections = Array.from(
        connections
          .reduce((map, connection) => {
            const partnerId =
              connection.requester_id === user?.id ? connection.receiver_id : connection.requester_id;
            const existing = map.get(partnerId);

            if (!existing) {
              map.set(partnerId, connection);
              return map;
            }

            const existingUpdatedAt = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
            const nextUpdatedAt = connection.updated_at ? new Date(connection.updated_at).getTime() : 0;

            if (nextUpdatedAt >= existingUpdatedAt) {
              map.set(partnerId, connection);
            }

            return map;
          }, new Map<string, Connection>())
          .values()
      );

      const profileIds = Array.from(
        new Set(uniqueConnections.flatMap((c) => [c.requester_id, c.receiver_id]))
      );
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles_public")
        .select("id, name, username, avatar_url")
        .in("id", profileIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      return uniqueConnections.map((connection) => ({
        ...connection,
        requester: profileMap.get(connection.requester_id) || null,
        receiver: profileMap.get(connection.receiver_id) || null,
      })) as ConnectionWithProfile[];
    },
    enabled: !!user,
  });
}

// Get all connections for checking status
export function useAllConnectionStatuses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-connection-statuses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(`requester_id.eq.${user?.id},receiver_id.eq.${user?.id}`);

      if (error) throw error;
      return data as Connection[];
    },
    enabled: !!user,
  });
}

// Helper to determine connection status with a specific user
export function useConnectionStatus(targetUserId: string) {
  const { user } = useAuth();
  const { data: allConnections } = useAllConnectionStatuses();

  if (!user || !allConnections) {
    return { status: "none" as const, connectionId: null };
  }

  const connection = allConnections.find(
    (c) =>
      (c.requester_id === user.id && c.receiver_id === targetUserId) ||
      (c.receiver_id === user.id && c.requester_id === targetUserId)
  );

  if (!connection) {
    return { status: "none" as const, connectionId: null };
  }

  if (connection.status === "accepted") {
    return { status: "connected" as const, connectionId: connection.id };
  }

  if (connection.status === "pending") {
    if (connection.requester_id === user.id) {
      return { status: "pending_sent" as const, connectionId: connection.id };
    } else {
      return { status: "pending_received" as const, connectionId: connection.id };
    }
  }

  return { status: "none" as const, connectionId: null };
}

export function usePendingRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pending-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .eq("receiver_id", user?.id)
        .eq("status", "pending");

      if (error) throw error;
      const pending = data as Connection[];
      if (pending.length === 0) return [] as ConnectionWithProfile[];

      const requesterIds = Array.from(new Set(pending.map((request) => request.requester_id)));
      const { data: requesters, error: requestersError } = await supabase
        .from("profiles_public")
        .select("id, name, username, avatar_url")
        .in("id", requesterIds);

      if (requestersError) throw requestersError;

      const requesterMap = new Map((requesters || []).map((profile) => [profile.id, profile]));
      return pending.map((request) => ({
        ...request,
        requester: requesterMap.get(request.requester_id) || null,
        receiver: null,
      })) as ConnectionWithProfile[];
    },
    enabled: !!user,
  });
}

export function useSentRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sent-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .eq("requester_id", user?.id)
        .eq("status", "pending");

      if (error) throw error;
      return data as Connection[];
    },
    enabled: !!user,
  });
}

export function useSendConnectionRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ receiverId, communityId }: { receiverId: string; communityId?: string }) => {
      const { error } = await supabase.from("connections").insert({
        requester_id: user!.id,
        receiver_id: receiverId,
        community_id: communityId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sent-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-connection-statuses"] });
      toast.success("Connection request sent!");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Connection request already sent");
      } else {
        toast.error("Failed to send request");
      }
    },
  });
}

export function useRespondToRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, status }: { connectionId: string; status: "accepted" | "rejected" }) => {
      const { error } = await supabase
        .from("connections")
        .update({ status })
        .eq("id", connectionId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pending-requests"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["all-connection-statuses"] });
      toast.success(variables.status === "accepted" ? "Connection accepted!" : "Request declined");
    },
    onError: () => {
      toast.error("Failed to respond to request");
    },
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sent-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-connection-statuses"] });
      toast.success("Request cancelled");
    },
    onError: () => {
      toast.error("Failed to cancel request");
    },
  });
}
