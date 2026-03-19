import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isValidUsername, USERNAME_LIMITS } from "@/lib/utils";

// Public profile type - limited fields exposed via the secure view
interface PublicProfile {
  id: string;
  name: string;
  username: string | null;
  bio?: string | null;
  avatar_url: string | null;
  interests: string[] | null;
  joined_communities: string[] | null;
  created_at: string;
}

export function useProfiles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      // Use the secure public view that excludes sensitive fields like email
      const { data, error } = await supabase
        .from("profiles_public")
        .select("*")
        .neq("id", user?.id ?? "");

      if (error) throw error;
      return data as PublicProfile[];
    },
    enabled: !!user,
  });
}

export function useProfilesInCommunity(communityId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profiles", "community", communityId],
    queryFn: async () => {
      // Use the secure public view for community profile browsing
      const { data, error } = await supabase
        .from("profiles_public")
        .select("*")
        .neq("id", user?.id ?? "")
        .contains("joined_communities", [communityId]);

      if (error) throw error;
      return data as PublicProfile[];
    },
    enabled: !!user && !!communityId,
  });
}


// Search users by username with debouncing handled at component level
export function useSearchUsers(searchQuery: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["search-users", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      const query = searchQuery.toLowerCase().trim();
      
      // Search by username only (case-insensitive) - partial matches
      const { data, error } = await supabase
        .from("profiles_public")
        .select("*")
        .neq("id", user?.id ?? "")
        .ilike("username", `%${query}%`)
        .limit(20);

      if (error) throw error;
      return data as PublicProfile[];
    },
    enabled: !!user && searchQuery.trim().length >= 2,
    staleTime: 30000, // Cache results for 30 seconds
  });
}

// Check if username is available
export function useCheckUsername(username: string) {
  return useQuery({
    queryKey: ["check-username", username],
    queryFn: async () => {
      const normalized = username.trim();
      if (!normalized || normalized.length < USERNAME_LIMITS.min) {
        return { available: false, reason: `Username must be at least ${USERNAME_LIMITS.min} characters` };
      }

      if (normalized.length > USERNAME_LIMITS.max) {
        return { available: false, reason: `Username must be ${USERNAME_LIMITS.max} characters or less` };
      }

      // Validate username format (lowercase letters, numbers, underscores only)
      if (!isValidUsername(normalized)) {
        return { available: false, reason: "Username can only contain lowercase letters, numbers, and underscores" };
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", normalized)
        .maybeSingle();

      if (error) throw error;
      
      return { 
        available: !data, 
        reason: data ? "Username already taken. Please choose another." : null 
      };
    },
    enabled: username.trim().length >= USERNAME_LIMITS.min,
    staleTime: 5000,
  });
}
