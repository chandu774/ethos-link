import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { isValidUsername, USERNAME_LIMITS } from "@/lib/utils";

export interface PublicProfile {
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
      const data = await api.get<any[]>("/users/search");
      return (data || []).map((u: any) => ({
        id: u.id || u._id,
        name: u.name,
        username: u.roll_number || null,
        bio: u.bio || null,
        avatar_url: u.avatar_url || null,
        interests: null,
        joined_communities: null,
        created_at: u.created_at || new Date().toISOString(),
      })) as PublicProfile[];
    },
    enabled: !!user,
  });
}

export function useProfilesInCommunity(_communityId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profiles", "community", _communityId],
    queryFn: async () => {
      const data = await api.get<any[]>("/users/search");
      return (data || []).map((u: any) => ({
        id: u.id || u._id,
        name: u.name,
        username: u.roll_number || null,
        bio: u.bio || null,
        avatar_url: u.avatar_url || null,
        interests: null,
        joined_communities: null,
        created_at: u.created_at || new Date().toISOString(),
      })) as PublicProfile[];
    },
    enabled: !!user,
  });
}

export function useSearchUsers(searchQuery: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["search-users", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const data = await api.get<any[]>(`/users/search?query=${encodeURIComponent(searchQuery.trim())}`);
      return (data || []).map((u: any) => ({
        id: u.id || u._id,
        name: u.name,
        username: u.roll_number || null,
        bio: u.bio || null,
        avatar_url: u.avatar_url || null,
        interests: null,
        joined_communities: null,
        created_at: u.created_at || new Date().toISOString(),
      })) as PublicProfile[];
    },
    enabled: !!user && searchQuery.trim().length >= 2,
    staleTime: 30000,
  });
}

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

      if (!isValidUsername(normalized)) {
        return { available: false, reason: "Username can only contain lowercase letters, numbers, and underscores" };
      }

      return { available: true };
    },
    enabled: !!username && username.trim().length >= USERNAME_LIMITS.min,
  });
}
