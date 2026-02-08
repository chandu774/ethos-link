import { useState, useEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLocation, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useConnections, usePendingRequests, useRespondToRequest } from "@/hooks/useConnections";
import { useMessages, useSendMessage, useMessageReactions, useToggleMessageReaction } from "@/hooks/useMessages";
import { useQuery } from "@tanstack/react-query";
import { 
  useUserGroups, 
  useGroupMessages, 
  useSendGroupMessage, 
  useCreateGroup,
  useGroupMembers,
  useLeaveGroup,
  useGroupDetails,
  useUpdateGroup,
  useIsGroupAdmin,
  useGroupMessageReactions,
  useToggleGroupMessageReaction
} from "@/hooks/useGroups";
import { useAuth } from "@/contexts/AuthContext";
import { 
  MessageCircle, 
  Send, 
  User, 
  Users, 
  X, 
  Check, 
  Loader2, 
  Bell, 
  Plus,
  Crown,
  Search,
  AtSign,
  LogOut,
  Reply
} from "lucide-react";
import { UserSearch } from "@/components/connections/UserSearch";
import { cn, formatUsername } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GroupAvatar } from "@/components/ui/group-avatar";
import { uploadAvatarFile } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

type ChatType = "direct" | "group";

interface ChatItem {
  type: ChatType;
  id: string;
  name: string;
  partnerId?: string;
  communityId?: string | null;
  avatarUrl?: string | null;
  lastActivity?: string;
  memberCount?: number;
}

export default function Connections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [input, setInput] = useState("");
  const [showRequests, setShowRequests] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "direct" | "groups">("all");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showMemberProfile, setShowMemberProfile] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [openReactionForMessageId, setOpenReactionForMessageId] = useState<string | null>(null);
  const [reactionPickerPosition, setReactionPickerPosition] = useState<{ top: number; left: number } | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement | null>(null);
  const messageBubbleRefs = useRef(new Map<string, HTMLDivElement>());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openReactionForMessageId) {
      setReactionPickerPosition(null);
      return;
    }
    const bubbleEl = messageBubbleRefs.current.get(openReactionForMessageId);
    if (!bubbleEl) return;

    const computePosition = () => {
      const rect = bubbleEl.getBoundingClientRect();
      const pickerEl = reactionPickerRef.current;
      const pickerWidth = pickerEl?.offsetWidth ?? 220;
      const pickerHeight = pickerEl?.offsetHeight ?? 44;
      const spacing = 8;

      const availableAbove = rect.top - spacing;
      const availableBelow = window.innerHeight - rect.bottom - spacing;
      const top = availableAbove >= pickerHeight
        ? rect.top - pickerHeight - spacing
        : rect.bottom + spacing;

      const preferredLeft = rect.left + rect.width / 2 - pickerWidth / 2;
      const left = Math.min(
        Math.max(8, preferredLeft),
        window.innerWidth - pickerWidth - 8
      );

      setReactionPickerPosition({ top, left });
    };

    computePosition();
    const scrollEl = messagesScrollRef.current;
    scrollEl?.addEventListener("scroll", computePosition, { passive: true });
    window.addEventListener("resize", computePosition);
    const raf = requestAnimationFrame(computePosition);
    return () => {
      cancelAnimationFrame(raf);
      scrollEl?.removeEventListener("scroll", computePosition);
      window.removeEventListener("resize", computePosition);
    };
  }, [openReactionForMessageId]);

  const { data: connections, isLoading: loadingConnections } = useConnections();
  const { data: pendingRequests, isLoading: loadingRequests } = usePendingRequests();
  const { data: allUserGroups } = useUserGroups(undefined);
  const { data: directMessages, isLoading: loadingMessages } = useMessages(
    selectedChat?.type === "direct" ? selectedChat.partnerId || null : null
  );
  const { data: groupMessages, isLoading: loadingGroupMessages } = useGroupMessages(
    selectedChat?.type === "group" ? selectedChat.id : null
  );
  const { data: groupMembers } = useGroupMembers(
    selectedChat?.type === "group" ? selectedChat.id : ""
  );
  const { data: groupDetails } = useGroupDetails(
    selectedChat?.type === "group" ? selectedChat.id : null
  );
  const { data: isGroupAdmin } = useIsGroupAdmin(
    selectedChat?.type === "group" ? selectedChat.id : ""
  );
  
  const sendMessage = useSendMessage();
  const sendGroupMessage = useSendGroupMessage();
  const toggleGroupMessageReaction = useToggleGroupMessageReaction();
  const respondToRequest = useRespondToRequest();
  const createGroup = useCreateGroup();
  const leaveGroup = useLeaveGroup();
  const updateGroup = useUpdateGroup();

  // Handle chat and group query params
  useEffect(() => {
    const chatId = searchParams.get("chat");
    const groupId = searchParams.get("group");
    const tabParam = searchParams.get("tab");
    const requestsParam = searchParams.get("requests");

    if (tabParam === "all" || tabParam === "direct" || tabParam === "groups") {
      setActiveTab(tabParam);
    }

    if (location.pathname === "/requests" || requestsParam === "1" || requestsParam === "true") {
      setShowRequests(true);
    }

    if (!chatId && !groupId) {
      setSelectedChat(null);
      return;
    }
    
    // Handle group query param
    if (groupId && allUserGroups) {
      const group = allUserGroups.find((g) => g.id === groupId);
      if (group) {
        setSelectedChat({
          type: "group",
          id: group.id,
          name: group.name,
          communityId: group.community_id,
          avatarUrl: group.avatar_url,
        });
        return;
      } else {
        setSelectedChat(null);
      }
    }
    
    // Handle chat query param
    if (chatId && connections) {
      const connection = connections.find((c) => {
        const partnerId = c.requester_id === user?.id ? c.receiver_id : c.requester_id;
        return partnerId === chatId;
      });
      if (connection) {
        const partner = connection.requester_id === user?.id ? connection.receiver : connection.requester;
        const partnerName = partner.username || partner.name;
        setSelectedChat({
          type: "direct",
          id: connection.id,
          name: partnerName,
          partnerId: partner.id,
          avatarUrl: partner.avatar_url,
        });
      }
    }
  }, [searchParams, connections, allUserGroups, location.pathname, user]);

  // Build unified chat list
  const chatList: ChatItem[] = [
    ...(connections?.map((c) => {
      const isRequester = c.requester_id === user?.id;
      const partner = isRequester ? c.receiver : c.requester;
      const partnerName = partner.username || partner.name;
      return {
        type: "direct" as ChatType,
        id: c.id,
        name: partnerName,
        partnerId: partner.id,
        avatarUrl: partner.avatar_url,
        lastActivity: c.updated_at,
      };
    }) || []),
    ...(allUserGroups?.map((g) => ({
      type: "group" as ChatType,
      id: g.id,
      name: g.name,
      communityId: g.community_id,
      avatarUrl: g.avatar_url,
      lastActivity: g.updated_at,
      memberCount: 0, // Will be fetched separately
    })) || []),
  ].sort((a, b) => new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime());

  const filteredChatList = chatList.filter((chat) => {
    if (activeTab === "direct") return chat.type === "direct";
    if (activeTab === "groups") return chat.type === "group";
    return true;
  });

  const messages = selectedChat?.type === "direct" ? directMessages : groupMessages;
  const isLoadingMessages = selectedChat?.type === "direct" ? loadingMessages : loadingGroupMessages;
  const isGroupMember =
    selectedChat?.type === "group" && groupMembers?.some((member) => member.user_id === user?.id);
  const groupDisplayName =
    selectedChat?.type === "group" ? groupDetails?.name || selectedChat.name : null;
  const directMessageIds =
    selectedChat?.type === "direct" && messages ? messages.map((message) => message.id) : [];
  const { data: messageReactions } = useMessageReactions(directMessageIds);
  const groupMessageIds =
    selectedChat?.type === "group" && messages ? messages.map((message) => message.id) : [];
  const { data: groupMessageReactions } = useGroupMessageReactions(groupMessageIds);
  const toggleMessageReaction = useToggleMessageReaction();
  const toggleReactionForMessage = (messageId: string, emoji: string) => {
    if (!messageId || !user?.id) {
      if (import.meta.env.DEV) {
        console.error("Missing message or user id for reaction");
      }
      return;
    }
    if (selectedChat?.type === "direct") {
      toggleMessageReaction.mutate({ messageId, emoji });
    } else {
      toggleGroupMessageReaction.mutate({ messageId, emoji });
    }
  };

  const reactionsByMessage = (messageReactions || []).reduce(
    (acc, reaction) => {
      if (!acc[reaction.message_id]) {
        acc[reaction.message_id] = {};
      }
      const existing = acc[reaction.message_id][reaction.emoji] || { count: 0, reacted: false };
      acc[reaction.message_id][reaction.emoji] = {
        count: existing.count + 1,
        reacted: existing.reacted || reaction.user_id === user?.id,
      };
      return acc;
    },
    {} as Record<string, Record<string, { count: number; reacted: boolean }>>
  );
  const groupReactionsByMessage = (groupMessageReactions || []).reduce(
    (acc, reaction) => {
      if (!acc[reaction.message_id]) {
        acc[reaction.message_id] = {};
      }
      const existing = acc[reaction.message_id][reaction.emoji] || { count: 0, reacted: false };
      acc[reaction.message_id][reaction.emoji] = {
        count: existing.count + 1,
        reacted: existing.reacted || reaction.user_id === user?.id,
      };
      return acc;
    },
    {} as Record<string, Record<string, { count: number; reacted: boolean }>>
  );
  const messageById = new Map(messages?.map((message) => [message.id, message]) || []);
  const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉"];

  const showActionsForMessage = (messageId: string) =>
    hoveredMessageId === messageId || activeMessageId === messageId;

  const handleLongPress = (messageId: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      setActiveMessageId(messageId);
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const { data: selectedMemberProfile, isLoading: loadingMemberProfile } = useQuery({
    queryKey: ["member-profile", selectedMemberId],
    queryFn: async () => {
      if (!selectedMemberId) return null;
      const { data, error } = await supabase
        .from("profiles_public")
        .select("id, name, username, bio, avatar_url")
        .eq("id", selectedMemberId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedMemberId,
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (groupDetails?.name) {
      setEditingGroupName(groupDetails.name);
    }
  }, [groupDetails?.name]);

  useEffect(() => {
    setShowGroupInfo(false);
    setShowLeaveDialog(false);
    setShowMemberProfile(false);
    setSelectedMemberId(null);
    setReplyToMessageId(null);
    setHoveredMessageId(null);
    setActiveMessageId(null);
    setOpenReactionForMessageId(null);
  }, [selectedChat?.id, selectedChat?.type]);

  useEffect(() => {
    if (!user || selectedChat?.type !== "direct" || !selectedChat.partnerId) return;

    const channelId = [user.id, selectedChat.partnerId].sort().join(":");
    const channel = supabase.channel(`typing-${channelId}`);
    typingChannelRef.current = channel;

    channel.on("broadcast", { event: "typing" }, (payload) => {
      const data = payload.payload as { userId?: string; isTyping?: boolean };
      if (data?.userId === selectedChat.partnerId) {
        setIsPartnerTyping(!!data.isTyping);
      }
    });

    channel.subscribe();

    return () => {
      typingChannelRef.current = null;
      setIsPartnerTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [selectedChat?.partnerId, selectedChat?.type, user]);

  useEffect(() => {
    if (!user || selectedChat?.type !== "direct" || !selectedChat.partnerId || !messages?.length) return;

    const unseenIds = messages
      .filter(
        (message) =>
          message.receiver_id === user.id &&
          message.sender_id === selectedChat.partnerId &&
          !message.seen_at
      )
      .map((message) => message.id);

    if (unseenIds.length === 0) return;

    const now = new Date().toISOString();
    supabase
      .from("messages")
      .update({ status: "seen", seen_at: now, delivered_at: now })
      .in("id", unseenIds);
  }, [messages, selectedChat?.partnerId, selectedChat?.type, user]);

  const sendTypingStatus = (isTyping: boolean) => {
    if (selectedChat?.type !== "direct" || !selectedChat.partnerId || !user) return;
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, isTyping },
    });
  };

  const handleSendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || !selectedChat) return;
    
    if (selectedChat.type === "direct" && selectedChat.partnerId) {
      sendMessage.mutate(
        {
          receiverId: selectedChat.partnerId,
          content: trimmed,
          replyToMessageId,
        },
        {
          onSuccess: () => {
            setReplyToMessageId(null);
            setInput("");
            sendTypingStatus(false);
          },
        }
      );
    } else if (selectedChat.type === "group") {
      sendGroupMessage.mutate(
        {
          groupId: selectedChat.id,
          content: trimmed,
          replyToMessageId,
        },
        {
          onSuccess: () => {
            setReplyToMessageId(null);
            setInput("");
          },
        }
      );
    }
  };

  const handleAccept = (connectionId: string) => {
    respondToRequest.mutate({ connectionId, status: "accepted" });
  };

  const handleReject = (connectionId: string) => {
    respondToRequest.mutate({ connectionId, status: "rejected" });
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup.mutate(
      { name: newGroupName, description: newGroupDescription, communityId: null },
      {
        onSuccess: () => {
          setShowCreateGroup(false);
          setNewGroupName("");
          setNewGroupDescription("");
        },
      }
    );
  };

  const handleSelectChat = (chat: ChatItem) => {
    setSelectedChat(chat);
    setActiveTab(chat.type === "group" ? "groups" : "direct");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("chat");
      next.delete("group");
      if (chat.type === "direct" && chat.partnerId) {
        next.set("chat", chat.partnerId);
        next.set("tab", "direct");
      }
      if (chat.type === "group") {
        next.set("group", chat.id);
        next.set("tab", "groups");
      }
      return next;
    });
  };

  const handleTabChange = (value: "all" | "direct" | "groups") => {
    setActiveTab(value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", value);
      return next;
    });
  };

  const handleLeaveGroup = () => {
    if (!selectedChat || selectedChat.type !== "group") return;
    setShowLeaveDialog(false);
    setShowGroupInfo(false);
    leaveGroup.mutate(selectedChat.id, {
      onSuccess: () => {
        setSelectedChat(null);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("group");
          next.delete("chat");
          next.set("tab", "groups");
          return next;
        });
      },
    });
  };

  const handleUpdateGroupName = () => {
    if (!selectedChat || selectedChat.type !== "group") return;
    const trimmed = editingGroupName.trim();
    if (!trimmed) return;

    updateGroup.mutate(
      { groupId: selectedChat.id, name: trimmed },
      {
        onSuccess: () => {
          setSelectedChat((prev) =>
            prev && prev.type === "group" ? { ...prev, name: trimmed } : prev
          );
        },
      }
    );
  };

  const handleGroupAvatarUpload = async (file: File) => {
    if (!selectedChat || selectedChat.type !== "group") return;
    setIsUploadingGroupAvatar(true);
    try {
      const publicUrl = await uploadAvatarFile({
        bucket: "group-avatars",
        pathPrefix: selectedChat.id,
        file,
      });
      updateGroup.mutate(
        { groupId: selectedChat.id, avatarUrl: publicUrl },
        {
          onSuccess: () => {
            setSelectedChat((prev) =>
              prev && prev.type === "group" ? { ...prev, avatarUrl: publicUrl } : prev
            );
          },
        }
      );
    } finally {
      setIsUploadingGroupAvatar(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-neural">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Connections</h1>
              <p className="text-sm text-muted-foreground">
                Chat with your mindset-matched connections
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search Users Button */}
            <Button
              variant={showUserSearch ? "default" : "outline"}
              onClick={() => setShowUserSearch(!showUserSearch)}
            >
              <Search className="h-4 w-4 mr-2" />
              Find Users
            </Button>

            {/* Create Group Button */}
            <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Group Chat</DialogTitle>
                  <DialogDescription>
                    Create a professional group chat to collaborate with your connections.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name">Group Name</Label>
                    <Input
                      id="group-name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g., Product Strategists"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-description">Description (optional)</Label>
                    <Textarea
                      id="group-description"
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="What's this group about?"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateGroup} disabled={createGroup.isPending || !newGroupName.trim()}>
                    {createGroup.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create Group"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Pending Requests Toggle */}
            <Button
              variant={showRequests ? "default" : "outline"}
              onClick={() => setShowRequests(!showRequests)}
              className="relative"
            >
              <Bell className="h-4 w-4 mr-2" />
              Requests
              {pendingRequests && pendingRequests.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                  {pendingRequests.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Pending Requests Section */}
        {showRequests && (
          <Card className="mb-6 shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Pending Connection Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : pendingRequests && pendingRequests.length > 0 ? (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{request.requester.name}</h4>
                          <div className="flex items-center gap-2">
                          {(request.requester as any).username && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <AtSign className="h-3 w-3" />
                                {(() => {
                                  const formatted = formatUsername((request.requester as any).username);
                                  return (
                                    <span className="truncate" title={formatted.raw}>
                                      {formatted.display}
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                            {request.community_id && (
                              <span className="text-xs text-muted-foreground">
                                via {request.community_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request.id)}
                          disabled={respondToRequest.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(request.id)}
                          disabled={respondToRequest.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No pending requests
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Search Section */}
        {showUserSearch && (
          <div className="mb-6">
            <UserSearch onClose={() => setShowUserSearch(false)} />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chat List */}
          <Card className="shadow-card lg:col-span-1">
            <CardHeader className="pb-2">
              <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as typeof activeTab)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="direct">Direct</TabsTrigger>
                  <TabsTrigger value="groups">Groups</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              {loadingConnections ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredChatList.length > 0 ? (
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {filteredChatList.map((chat) => (
                    <button
                      key={`${chat.type}-${chat.id}`}
                      onClick={() => handleSelectChat(chat)}
                      className={cn(
                        "flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50",
                        selectedChat?.id === chat.id && selectedChat?.type === chat.type && "bg-primary/5"
                      )}
                    >
                      {chat.type === "group" ? (
                        <GroupAvatar
                          name={chat.name}
                          avatarUrl={chat.avatarUrl}
                          className="h-10 w-10 border border-border/40"
                          size="md"
                        />
                      ) : (
                        <Avatar className="h-10 w-10 border border-border/40">
                          {chat.avatarUrl ? <AvatarImage src={chat.avatarUrl} alt={chat.name} /> : null}
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                            <User className="h-5 w-5 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {chat.type === "direct" ? (
                            (() => {
                              const formatted = formatUsername(chat.name);
                              return (
                                <span className="font-medium text-foreground truncate" title={formatted.raw}>
                                  {formatted.display}
                                </span>
                              );
                            })()
                          ) : (
                            <span className="font-medium text-foreground truncate">{chat.name}</span>
                          )}
                          {chat.type === "group" && (
                            <Badge variant="secondary" className="text-xs">
                              Group
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {chat.type === "group" 
                            ? "Group chat" 
                            : "Direct message"}
                        </p>
                      </div>
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    {activeTab === "groups" ? "No groups yet" : "No connections yet"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === "groups" 
                      ? "Create a group to start chatting"
                      : "Send connection requests from the Dashboard"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card
            className="relative overflow-visible shadow-elevated lg:col-span-2"
            style={{ "--chat-header-height": "64px" } as CSSProperties}
          >
            {selectedChat ? (
              <>
                <CardHeader className="sticky top-0 z-20 h-16 border-b bg-card/95 p-4 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedChat.type === "group" ? (
                        <GroupAvatar
                          name={groupDisplayName || selectedChat.name}
                          avatarUrl={groupDetails?.avatar_url || selectedChat.avatarUrl || null}
                          className="h-10 w-10 border border-border/40"
                          size="md"
                        />
                      ) : (
                        <Avatar className="h-10 w-10 border border-border/40">
                          {selectedChat.avatarUrl ? (
                            <AvatarImage src={selectedChat.avatarUrl} alt={selectedChat.name} />
                          ) : null}
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                            <User className="h-5 w-5 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        {selectedChat.type === "direct" ? (
                          (() => {
                            const formatted = formatUsername(selectedChat.name);
                            return (
                              <CardTitle className="text-lg" title={formatted.raw}>
                                {formatted.display}
                              </CardTitle>
                            );
                          })()
                        ) : (
                          <button onClick={() => setShowGroupInfo(true)} className="text-left">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {groupDisplayName || selectedChat.name}
                            </CardTitle>
                          </button>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {selectedChat.type === "group" 
                            ? `${groupMembers?.length || 0} members`
                            : "Direct message"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedChat.type === "group" && groupMembers && (
                        <div className="flex -space-x-2">
                          {groupMembers.slice(0, 3).map((member) => (
                            <Avatar
                              key={member.id}
                              className="h-8 w-8 border-2 border-card"
                              title={member.profile?.username || member.profile?.name || ""}
                            >
                              {member.profile?.avatar_url ? (
                                <AvatarImage src={member.profile.avatar_url} alt={member.profile?.name || ""} />
                              ) : null}
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-xs font-semibold">
                                {member.role === "admin" ? (
                                  <Crown className="h-3 w-3 text-amber-600" />
                                ) : (
                                  (member.profile?.username || member.profile?.name)?.charAt(0) || "?"
                                )}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {groupMembers.length > 3 && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-semibold">
                              +{groupMembers.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedChat(null);
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            next.delete("chat");
                            next.delete("group");
                            return next;
                          });
                        }}
                        className="lg:hidden"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {selectedChat.type === "group" && (
                  <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Group info</DialogTitle>
                        <DialogDescription>Manage group details and members.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            <GroupAvatar
                              name={groupDisplayName || selectedChat.name}
                              avatarUrl={groupDetails?.avatar_url || selectedChat.avatarUrl || null}
                              className="h-16 w-16 border border-border/40"
                              size="lg"
                            />
                            <div>
                              <p className="text-sm text-muted-foreground">Members</p>
                              <p className="text-lg font-semibold text-foreground">
                                {groupMembers?.length ?? 0} members
                              </p>
                            </div>
                          </div>
                          {isGroupAdmin && (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) handleGroupAvatarUpload(file);
                                  event.currentTarget.value = "";
                                }}
                                disabled={isUploadingGroupAvatar}
                              />
                              <Button variant="outline" size="sm" disabled={isUploadingGroupAvatar}>
                                {isUploadingGroupAvatar ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Update photo"
                                )}
                              </Button>
                            </label>
                          )}
                        </div>

                      <div className="space-y-2">
                        <Label>Group name</Label>
                        {isGroupAdmin ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              value={editingGroupName}
                              onChange={(e) => setEditingGroupName(e.target.value)}
                              className="min-w-[220px] flex-1"
                            />
                            <Button
                              size="sm"
                              onClick={handleUpdateGroupName}
                              disabled={updateGroup.isPending || !editingGroupName.trim()}
                            >
                              {updateGroup.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Save"
                              )}
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-foreground">{groupDisplayName || selectedChat.name}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {groupDetails?.description?.trim() || "No description provided."}
                        </p>
                      </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-foreground">Members</h4>
                            {isGroupMember && (
                              <Button variant="outline" size="sm" onClick={() => setShowLeaveDialog(true)}>
                                <LogOut className="h-4 w-4 mr-2" />
                                Leave group
                              </Button>
                            )}
                          </div>
                          <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Leave this group?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  You will no longer receive messages from this group unless you join again.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleLeaveGroup}>
                                  Leave group
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <div className="max-h-[280px] space-y-2 overflow-y-auto pr-2">
                            {groupMembers && groupMembers.length > 0 ? (
                              groupMembers.map((member) => {
                                const formatted = formatUsername(member.profile?.username, member.profile?.name);
                                return (
                                  <button
                                    key={member.id}
                                    onClick={() => {
                                      if (member.user_id) {
                                        setSelectedMemberId(member.user_id);
                                        setShowMemberProfile(true);
                                      }
                                    }}
                                    className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <Avatar className="h-10 w-10 border border-border/40">
                                        {member.profile?.avatar_url ? (
                                          <AvatarImage src={member.profile.avatar_url} alt={formatted.raw} />
                                        ) : null}
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                                          {formatted.raw.charAt(0) || "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate" title={formatted.raw}>
                                          {formatted.display || "Member"}
                                        </p>
                                        {member.profile?.username && (
                                          <p className="text-xs text-muted-foreground">@{formatted.raw}</p>
                                        )}
                                      </div>
                                    </div>
                                    {member.role === "admin" && (
                                      <span className="text-xs font-medium text-amber-600">Admin</span>
                                    )}
                                  </button>
                                );
                              })
                            ) : (
                              <p className="text-sm text-muted-foreground">No members yet.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                <Dialog open={showMemberProfile} onOpenChange={setShowMemberProfile}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Profile</DialogTitle>
                    </DialogHeader>
                    {loadingMemberProfile ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : selectedMemberProfile ? (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <Avatar className="h-20 w-20 border border-border/40">
                          {selectedMemberProfile.avatar_url ? (
                            <AvatarImage
                              src={selectedMemberProfile.avatar_url}
                              alt={selectedMemberProfile.name || "Member"}
                            />
                          ) : null}
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                            {(selectedMemberProfile.name || "M").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-lg font-semibold text-foreground">
                            {selectedMemberProfile.name || "Member"}
                          </p>
                          {selectedMemberProfile.username && (
                            <p className="text-sm text-muted-foreground">
                              @{selectedMemberProfile.username}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedMemberProfile.bio || "No bio provided."}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Profile not available.</p>
                    )}
                  </DialogContent>
                </Dialog>
                <CardContent className="p-0">
                  {/* Messages */}
                  <div
                    ref={messagesScrollRef}
                    className="h-[350px] space-y-4 overflow-y-auto overflow-x-visible p-4 pt-[calc(1rem+env(safe-area-inset-top))]"
                  >
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : messages && messages.length > 0 ? (
                      <>
                        {messages.map((message) => {
                          const isOwnMessage = message.sender_id === user?.id;
                          const senderDisplay = selectedChat.type === "group"
                            ? formatUsername((message as any).sender?.username, (message as any).sender?.name)
                            : null;
                          const currentReactions =
                            selectedChat.type === "direct"
                              ? reactionsByMessage[message.id] || {}
                              : groupReactionsByMessage[message.id] || {};
                          const hasReactions = Object.keys(currentReactions).length > 0;
                          const handleToggleReaction = (emoji: string) => {
                            toggleReactionForMessage(message.id, emoji);
                          };
                          
                          return (
                            <div
                              key={message.id}
                              className={cn(
                                "flex items-start gap-2",
                                isOwnMessage ? "justify-end" : "justify-start"
                              )}
                              onMouseEnter={() => setHoveredMessageId(message.id)}
                              onMouseLeave={() => setHoveredMessageId((prev) => (prev === message.id ? null : prev))}
                              onTouchStart={() => handleLongPress(message.id)}
                              onTouchEnd={cancelLongPress}
                              onTouchCancel={cancelLongPress}
                            >
                              {selectedChat.type === "group" && !isOwnMessage && (
                                <Avatar className="h-7 w-7 border border-border/40">
                                  {(message as any).sender?.avatar_url ? (
                                    <AvatarImage
                                      src={(message as any).sender?.avatar_url}
                                      alt={senderDisplay?.raw || "Member"}
                                    />
                                  ) : null}
                                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-xs">
                                    {(senderDisplay?.raw || "M").charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className="relative max-w-[80%]">
                                {showActionsForMessage(message.id) && (
                                  <div
                                    className={cn(
                                      "absolute top-1/2 z-30 -translate-y-1/2 flex items-center gap-1 rounded-full border border-border/40 bg-background/90 px-2 py-1 shadow-sm transition-all",
                                      isOwnMessage ? "right-full mr-2" : "left-full ml-2"
                                    )}
                                  >
                                    <button
                                      type="button"
                                      className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenReactionForMessageId(
                                          openReactionForMessageId === message.id ? null : message.id
                                        );
                                      }}
                                    >
                                      🙂
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setReplyToMessageId(message.id);
                                      }}
                                    >
                                      <Reply className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                                <div
                                  className={cn(
                                    "rounded-2xl px-4 py-3",
                                    isOwnMessage
                                      ? "gradient-neural text-primary-foreground rounded-br-md"
                                      : "bg-muted text-foreground rounded-bl-md"
                                  )}
                                  ref={(node) => {
                                    if (!node) {
                                      messageBubbleRefs.current.delete(message.id);
                                      return;
                                    }
                                    messageBubbleRefs.current.set(message.id, node);
                                  }}
                                >
                                {selectedChat.type === "group" && !isOwnMessage && (
                                  <p className="text-xs font-medium opacity-70 mb-1">
                                    <span title={senderDisplay?.raw}>{senderDisplay?.display}</span>
                                  </p>
                                )}
                                {message.reply_to_message_id && (
                                  <div className="mb-2 rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-xs">
                                    <p className="text-muted-foreground">Replying to</p>
                                    <p className="truncate">
                                      {messageById.get(message.reply_to_message_id)?.content || "Message not available"}
                                    </p>
                                  </div>
                                )}
                                <p className="text-sm">{message.content}</p>
                                <div className="mt-1 flex items-center justify-between gap-2 text-xs opacity-70">
                                  <span>
                                    {new Date(message.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    {selectedChat.type === "direct" && isOwnMessage && (
                                      <span className="ml-2">
                                        {message.status === "seen"
                                          ? "Seen"
                                          : message.status === "delivered"
                                            ? "Delivered"
                                            : "Sent"}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                                {hasReactions && (
                                  <div
                                    className={cn(
                                      "mt-1 flex flex-wrap gap-1",
                                      isOwnMessage ? "justify-end" : "justify-start"
                                    )}
                                  >
                                    {Object.entries(currentReactions).map(([emoji, data]) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleToggleReaction(emoji);
                                        }}
                                        className={cn(
                                          "rounded-full border px-2 py-0.5 text-xs",
                                          data.reacted ? "border-primary text-primary" : "border-border/50"
                                        )}
                                      >
                                        {emoji} {data.count}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-center text-muted-foreground">
                          Start a conversation
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="border-t p-4">
                    {selectedChat.type === "direct" && isPartnerTyping && (
                      <p className="mb-2 text-xs text-muted-foreground">Typing...</p>
                    )}
                    {replyToMessageId && (
                      <div className="mb-3 flex items-center justify-between rounded-lg border border-border/40 bg-muted/40 px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <p className="text-muted-foreground">Replying to</p>
                          <p className="truncate">
                            {messageById.get(replyToMessageId)?.content || "Message not available"}
                          </p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => setReplyToMessageId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex gap-3"
                    >
                      <Input
                        value={input}
                        onChange={(e) => {
                          const value = e.target.value;
                          setInput(value);
                          if (selectedChat?.type !== "direct") return;
                          if (!value.trim()) {
                            sendTypingStatus(false);
                            return;
                          }
                          sendTypingStatus(true);
                          if (typingTimeoutRef.current) {
                            clearTimeout(typingTimeoutRef.current);
                          }
                          typingTimeoutRef.current = setTimeout(() => {
                            sendTypingStatus(false);
                          }, 1500);
                        }}
                        onBlur={() => sendTypingStatus(false)}
                        placeholder="Type a message..."
                        className="flex-1"
                        disabled={sendMessage.isPending || sendGroupMessage.isPending}
                      />
                      <Button 
                        type="submit" 
                        className="gradient-neural text-primary-foreground"
                        disabled={sendMessage.isPending || sendGroupMessage.isPending || !input.trim()}
                      >
                        {(sendMessage.isPending || sendGroupMessage.isPending) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                  </div>
                </CardContent>
                {openReactionForMessageId && reactionPickerPosition &&
                  createPortal(
                    <div
                      ref={reactionPickerRef}
                      className="fixed z-[9999] flex items-center gap-1 rounded-full border border-border/40 bg-background px-2 py-1 shadow-md"
                      style={{ top: reactionPickerPosition.top, left: reactionPickerPosition.left }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {reactionEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="rounded-full px-1 text-sm hover:bg-muted"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleReactionForMessage(openReactionForMessageId, emoji);
                            setOpenReactionForMessageId(null);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>,
                    document.body
                  )}
              </>
            ) : (
              <CardContent className="flex h-[450px] items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 font-medium text-foreground">No conversation selected</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a connection or group to start chatting
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
