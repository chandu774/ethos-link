import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isValidUsername, USERNAME_LIMITS } from "@/lib/utils";

export function useUpdateProfile() {
  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      name?: string;
      interests?: string[];
      joined_communities?: string[];
      bio?: string | null;
      avatar_url?: string | null;
    }) => {
      await api.patch("/auth/profile", updates);
    },
    onSuccess: () => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Profile updated!");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });
}

export function useUpdateUsername() {
  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      const normalized = username.trim().toLowerCase();
      if (normalized.length < USERNAME_LIMITS.min) {
        throw new Error(`Username must be at least ${USERNAME_LIMITS.min} characters`);
      }

      if (normalized.length > USERNAME_LIMITS.max) {
        throw new Error(`Username must be ${USERNAME_LIMITS.max} characters or less`);
      }

      if (!isValidUsername(normalized)) {
        throw new Error("Username can only contain lowercase letters, numbers, and underscores");
      }

      await api.patch("/auth/profile", { username: normalized });
    },
    onSuccess: () => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Username updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update username");
    },
  });
}

export function useToggleCommunity() {
  const { profile, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async (communityId: string) => {
      const currentCommunities = profile?.joined_communities || [];
      const isJoined = currentCommunities.includes(communityId);

      const newCommunities = isJoined
        ? currentCommunities.filter((id: string) => id !== communityId)
        : [...currentCommunities, communityId];

      await api.patch("/auth/profile", { joined_communities: newCommunities });
    },
    onSuccess: () => {
      refreshProfile();
    },
    onError: () => {
      toast.error("Failed to update community");
    },
  });
}
