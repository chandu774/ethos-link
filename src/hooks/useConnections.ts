import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PublicProfile {
  id: string;
  name: string;
  username?: string;
  avatar_url?: string;
}

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at?: string;
  updated_at?: string;
}

export interface ConnectionWithProfile extends Connection {
  requester: PublicProfile | null;
  receiver: PublicProfile | null;
}

export function useConnections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["connections", user?.id],
    queryFn: async () => {
      const data = await api.get<any[]>("/chat/connections");
      const accepted = (data || []).filter((c) => c.status === "accepted");

      return accepted.map((c: any) => {
        const reqObj = typeof c.requester_id === "object" ? c.requester_id : null;
        const recObj = typeof c.receiver_id === "object" ? c.receiver_id : null;

        return {
          id: c.id || c._id,
          requester_id: reqObj?._id || reqObj?.id || c.requester_id,
          receiver_id: recObj?._id || recObj?.id || c.receiver_id,
          status: c.status,
          created_at: c.created_at,
          updated_at: c.updated_at,
          requester: reqObj
            ? {
                id: reqObj._id || reqObj.id,
                name: reqObj.name || "Student",
                username: reqObj.roll_number,
                avatar_url: reqObj.avatar_url,
              }
            : null,
          receiver: recObj
            ? {
                id: recObj._id || recObj.id,
                name: recObj.name || "Student",
                username: recObj.roll_number,
                avatar_url: recObj.avatar_url,
              }
            : null,
        } as ConnectionWithProfile;
      });
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
      const data = await api.get<any[]>("/chat/connections");
      return (data || []).map((c: any) => ({
        id: c.id || c._id,
        requester_id: c.requester_id?._id || c.requester_id?.id || c.requester_id,
        receiver_id: c.receiver_id?._id || c.receiver_id?.id || c.receiver_id,
        status: c.status,
      })) as Connection[];
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
      const data = await api.get<any[]>("/chat/connections");
      const pending = (data || []).filter(
        (c) =>
          c.status === "pending" &&
          (c.receiver_id?._id === user?.id || c.receiver_id === user?.id)
      );

      return pending.map((c: any) => {
        const reqObj = typeof c.requester_id === "object" ? c.requester_id : null;
        return {
          id: c.id || c._id,
          requester_id: reqObj?._id || reqObj?.id || c.requester_id,
          receiver_id: user?.id,
          status: "pending",
          requester: reqObj
            ? {
                id: reqObj._id || reqObj.id,
                name: reqObj.name || "Student",
                username: reqObj.roll_number,
                avatar_url: reqObj.avatar_url,
              }
            : null,
          receiver: null,
        } as ConnectionWithProfile;
      });
    },
    enabled: !!user,
  });
}

export function useSentRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sent-requests", user?.id],
    queryFn: async () => {
      const data = await api.get<any[]>("/chat/connections");
      const sent = (data || []).filter(
        (c) =>
          c.status === "pending" &&
          (c.requester_id?._id === user?.id || c.requester_id === user?.id)
      );

      return sent.map((c: any) => ({
        id: c.id || c._id,
        requester_id: user?.id,
        receiver_id: c.receiver_id?._id || c.receiver_id?.id || c.receiver_id,
        status: "pending",
      })) as Connection[];
    },
    enabled: !!user,
  });
}

export function useSendConnectionRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ receiverId }: { receiverId: string; communityId?: string }) => {
      await api.post("/chat/connections", { receiver_id: receiverId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sent-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-connection-statuses"] });
      toast.success("Connection request sent!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send request");
    },
  });
}

export function useRespondToRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, status }: { connectionId: string; status: "accepted" | "rejected" }) => {
      await api.patch(`/chat/connections/${connectionId}`, { status });
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
      await api.patch(`/chat/connections/${connectionId}`, { status: "rejected" });
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
