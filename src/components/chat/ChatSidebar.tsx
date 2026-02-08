import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  MessageSquare, 
  Search, 
  Trash2, 
  Loader2 
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
  summary: string | null;
}

interface ChatSidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ 
  currentConversationId, 
  onSelectConversation, 
  onNewChat 
}: ChatSidebarProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["ai-conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data.map((conv) => ({
        ...conv,
        messages: (conv.messages as unknown as Message[]) || [],
      })) as Conversation[];
    },
    enabled: !!user,
  });

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    
    try {
      await supabase.from("ai_conversations").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      
      if (currentConversationId === id) {
        onNewChat();
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const getConversationPreview = (conv: Conversation): string => {
    if (conv.summary) return conv.summary;
    const firstUserMessage = conv.messages.find((m) => m.role === "user");
    if (firstUserMessage) {
      return firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "");
    }
    return "New conversation";
  };

  const filteredConversations = conversations?.filter((conv) => {
    if (!searchQuery) return true;
    const preview = getConversationPreview(conv).toLowerCase();
    return preview.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full border-r bg-muted/30">
      {/* New Chat Button */}
      <div className="p-3 border-b">
        <Button 
          onClick={onNewChat}
          className="w-full gradient-neural text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filteredConversations && filteredConversations.length > 0 ? (
          <div className="p-2 space-y-1">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group",
                  currentConversationId === conv.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-sm">
                  {getConversationPreview(conv)}
                </span>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                  disabled={deletingId === conv.id}
                >
                  {deletingId === conv.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  )}
                </button>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery ? "No matching chats" : "No past chats"}
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
