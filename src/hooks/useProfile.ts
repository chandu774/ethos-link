import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isValidUsername, USERNAME_LIMITS } from "@/lib/utils";

export function useUpdateProfile() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      name?: string;
      mode?: "professional" | "personal";
      interests?: string[];
      joined_communities?: string[];
      bio?: string | null;
      avatar_url?: string | null;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user!.id);

      if (error) throw error;
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
  const { user, refreshProfile } = useAuth();
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

      // Validate username format
      if (!isValidUsername(normalized)) {
        throw new Error("Username can only contain lowercase letters, numbers, and underscores");
      }

      const { error } = await supabase
        .from("profiles")
        .update({ username: normalized })
        .eq("id", user!.id);

      if (error) {
        if (error.code === '23505') {
          throw new Error("Username already taken. Please choose another.");
        }
        throw error;
      }
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string) => {
      const currentCommunities = profile?.joined_communities || [];
      const isJoined = currentCommunities.includes(communityId);
      
      const newCommunities = isJoined
        ? currentCommunities.filter((id) => id !== communityId)
        : [...currentCommunities, communityId];

      const { error } = await supabase
        .from("profiles")
        .update({ joined_communities: newCommunities })
        .eq("id", profile!.id);

      if (error) throw error;

      if (isJoined) {
        const { error: memberError } = await supabase
          .from("community_members")
          .delete()
          .eq("community_id", communityId)
          .eq("user_id", profile!.id);

        if (memberError) throw memberError;
      } else {
        const { error: memberError } = await supabase
          .from("community_members")
          .insert({ community_id: communityId, user_id: profile!.id });

        if (memberError) throw memberError;
      }

      return { isJoined, communityId };
    },
    onSuccess: (data) => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success(data.isJoined ? "Left community" : "Joined community!");
    },
    onError: () => {
      toast.error("Failed to update community membership");
    },
  });
}
