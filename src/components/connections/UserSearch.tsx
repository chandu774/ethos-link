import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, User, UserPlus, Loader2, X, AtSign } from "lucide-react";
import { useProfileWithSimilarity, useSearchUsers } from "@/hooks/useProfiles";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/contexts/AuthContext";
import { formatUsername } from "@/lib/utils";
import { useSendConnectionRequest, useConnections, usePendingRequests } from "@/hooks/useConnections";

interface UserSearchProps {
  onClose?: () => void;
}

export function UserSearch({ onClose }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  const { user, profile } = useAuth();
  const { data: profiles, isLoading: loadingProfiles } = useProfileWithSimilarity();
  const { data: searchResults, isLoading: isSearching } = useSearchUsers(debouncedQuery);
  const { data: connections } = useConnections();
  const { data: pendingRequests } = usePendingRequests();
  const sendRequest = useSendConnectionRequest();

  // Get all connected user IDs
  const connectedUserIds = useMemo(() => {
    const ids = new Set<string>();
    connections?.forEach((conn) => {
      ids.add(conn.requester_id === user?.id ? conn.receiver_id : conn.requester_id);
    });
    return ids;
  }, [connections, user]);

  // Get all pending request user IDs (sent by current user)
  const pendingSentIds = useMemo(() => {
    const ids = new Set<string>();
    pendingRequests?.forEach((req) => {
      if (req.requester_id === user?.id) {
        ids.add(req.receiver_id);
      }
    });
    return ids;
  }, [pendingRequests, user]);

  // Determine which results to show
  const displayedProfiles = useMemo(() => {
    if (debouncedQuery.trim().length >= 2 && searchResults) {
      return searchResults;
    }
    // Show top matches by similarity when no search
    return profiles?.slice(0, 10) || [];
  }, [debouncedQuery, searchResults, profiles]);

  const isLoading = loadingProfiles || (debouncedQuery.trim().length >= 2 && isSearching);

  const handleSendRequest = (receiverId: string) => {
    sendRequest.mutate({ 
      receiverId, 
      communityId: profile?.mode === "personal" ? profile?.joined_communities?.[0] || undefined : undefined 
    });
  };

  const getConnectionStatus = (profileId: string): "connected" | "pending" | "none" => {
    if (connectedUserIds.has(profileId)) return "connected";
    if (pendingSentIds.has(profileId)) return "pending";
    return "none";
  };

  return (
    <Card className="shadow-elevated">
      <CardContent className="p-4">
        {/* Search Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by @username or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search hint */}
        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-sm text-muted-foreground mb-4">
            Type at least 2 characters to search...
          </p>
        )}

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : displayedProfiles.length > 0 ? (
            displayedProfiles.map((p) => {
              const status = getConnectionStatus(p.id);
              const similarity = 'similarity' in p ? (p as any).similarity : null;
              
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{p.name}</span>
                        {similarity !== null && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {similarity}% match
                          </Badge>
                        )}
                      </div>
                      {p.username && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <AtSign className="h-3 w-3" />
                          {(() => {
                            const formatted = formatUsername(p.username);
                            return (
                              <span className="truncate" title={formatted.raw}>
                                {formatted.display}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                      {p.interests && p.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.interests.slice(0, 3).map((interest, idx) => (
                            <span key={interest} className="text-xs text-muted-foreground">
                              {interest}
                              {idx < 2 && p.interests!.length > 1 && idx < p.interests!.length - 1 && " -"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {status === "connected" ? (
                      <Badge variant="outline" className="text-primary">
                        Connected
                      </Badge>
                    ) : status === "pending" ? (
                      <Badge variant="secondary">
                        Pending
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendRequest(p.id)}
                        disabled={sendRequest.isPending}
                      >
                        {sendRequest.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Connect
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center">
              <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {debouncedQuery.trim().length >= 2 
                  ? "No matching users found"
                  : "Start typing to search users"}
              </p>
              <p className="text-sm text-muted-foreground">
                {debouncedQuery.trim().length >= 2 
                  ? "Try a different username or name"
                  : "Search by @username or display name"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
