import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Info, Send, Sparkles, Loader2, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { useAIConversations, useCurrentConversation, Message } from "@/hooks/useAIConversations";

// Deprecated: AI tools are now embedded in class groups (Chat page).
export default function AIChat() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { 
    conversations, 
    createConversation, 
    updateConversation, 
    initialMessage 
  } = useAIConversations();
  
  const { data: currentConversation, isLoading } = useCurrentConversation(currentConversationId);

  // On mount, always start with a new chat (fresh session)
  useEffect(() => {
    if (user && !currentConversationId && conversations !== undefined) {
      // Start fresh - don't auto-select any previous conversation
      setLocalMessages([initialMessage]);
    }
  }, [user, conversations]);

  // Sync local messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      setLocalMessages(currentConversation.messages);
    }
  }, [currentConversation]);

  const messages = localMessages.length > 0 ? localMessages : [initialMessage];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleNewChat = async () => {
    setCurrentConversationId(null);
    setLocalMessages([initialMessage]);
    setShowSidebar(false);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setShowSidebar(false);
  };

  const streamChat = async (userContent: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
    };

    const messagesWithUser = [...messages, userMessage];
    setLocalMessages(messagesWithUser);

    // Create conversation if it doesn't exist
    let convId = currentConversationId;
    if (!convId) {
      try {
        const newConv = await createConversation.mutateAsync();
        convId = newConv.id;
        setCurrentConversationId(convId);
      } catch (error) {
        console.error("Failed to create conversation:", error);
        toast({
          title: "Error",
          description: "Failed to start conversation. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsStreaming(true);
    setStreamingContent("");

    try {
      // Prepare messages for AI (only recent messages for context, limit to last 20)
      const recentMessages = messagesWithUser.slice(-20);
      const apiMessages = recentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.post<{ reply: string }>("/ai/chat", {
        messages: apiMessages,
        conversationId: convId,
      });

      const replyText = res?.reply || "I'm here to help!";

      // Progressive reveal animation for natural assistant conversation feel
      const step = Math.max(1, Math.floor(replyText.length / 25));
      for (let i = 1; i <= replyText.length; i += step) {
        setStreamingContent(replyText.slice(0, i));
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      setStreamingContent(replyText);

      // Save complete assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: replyText,
      };

      const finalMessages = [...messagesWithUser, assistantMessage];
      setLocalMessages(finalMessages);

      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });

      // Analyze mindset traits from user message
      if (profile) {
        await analyzeMindset(userContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const analyzeMindset = async (message: string) => {
    const lowerMessage = message.toLowerCase();
    const adjustments: Record<string, number> = {
      analytical: 0,
      creative: 0,
      emotional: 0,
      logical: 0,
      risk_taking: 0,
      collaborative: 0,
    };

    if (/data|analyze|research|evidence|facts|statistics/i.test(lowerMessage)) {
      adjustments.analytical += 2;
      adjustments.logical += 1;
    }

    if (/imagine|create|idea|innovative|different|design|art/i.test(lowerMessage)) {
      adjustments.creative += 2;
    }

    if (/feel|people|care|empathy|help|support|heart/i.test(lowerMessage)) {
      adjustments.emotional += 2;
      adjustments.collaborative += 1;
    }

    if (/logic|reason|systematic|process|step|plan|strategy/i.test(lowerMessage)) {
      adjustments.logical += 2;
      adjustments.analytical += 1;
    }

    if (/risk|try|chance|bold|adventure|experiment|dare/i.test(lowerMessage)) {
      adjustments.risk_taking += 2;
    }

    if (/team|together|collaborate|share|discuss|group|we/i.test(lowerMessage)) {
      adjustments.collaborative += 2;
    }

    const hasAdjustments = Object.values(adjustments).some((v) => v !== 0);

    if (hasAdjustments && profile) {
      const currentTraits = (profile.mindset_traits as Record<string, number>) || {};
      const newTraits = { ...currentTraits };

      Object.entries(adjustments).forEach(([trait, adjustment]) => {
        if (adjustment !== 0) {
          const currentValue = newTraits[trait] || 50;
          newTraits[trait] = Math.max(0, Math.min(100, currentValue + adjustment));
        }
      });

      await api.patch("/auth/profile", { mindset_traits: newTraits });

      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["profiles", "with-similarity"] });
    }
  };

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const content = input;
    setInput("");
    streamChat(content);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        {/* Mobile sidebar toggle */}
        <div className="mb-4 lg:hidden">
          <Button
            variant="outline"
            onClick={() => setShowSidebar(!showSidebar)}
            className="w-full sm:w-auto"
          >
            {showSidebar ? <X className="h-4 w-4 mr-2" /> : <Menu className="h-4 w-4 mr-2" />}
            {showSidebar ? "Close" : "Chat History"}
          </Button>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar - Desktop always visible, mobile conditional */}
          <div className={cn(
            "w-64 shrink-0 rounded-xl overflow-hidden shadow-card bg-card",
            "hidden lg:block",
            showSidebar && "!block fixed inset-0 z-50 w-full lg:relative lg:w-64"
          )}>
            <ChatSidebar
              currentConversationId={currentConversationId}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
            />
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 space-y-6">
            {/* Chat Area */}
            <Card className="shadow-elevated">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-neural">
                    <Brain className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Synapse AI</CardTitle>
                  </div>
                  <Sparkles className="ml-auto h-5 w-5 text-accent animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Messages */}
                <div className="h-[400px] space-y-4 overflow-x-hidden overflow-y-auto p-3 sm:p-4">
                  {isLoading && currentConversationId ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            message.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[80%]",
                              message.role === "user"
                                ? "gradient-neural text-primary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            )}
                          >
                            {message.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed">{message.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Streaming message */}
                      {isStreaming && (
                        <div className="flex justify-start">
                          <div className="max-w-[90%] rounded-2xl bg-muted px-4 py-3 text-foreground rounded-bl-md sm:max-w-[80%]">
                            {streamingContent ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{streamingContent}</ReactMarkdown>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">Thinking...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="border-t p-3 sm:p-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex flex-col gap-3 sm:flex-row"
                  >
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask me anything..."
                      className="flex-1"
                      disabled={isStreaming}
                    />
                    <Button 
                      type="submit" 
                      className="w-full gradient-neural text-primary-foreground sm:w-auto"
                      disabled={isStreaming || !input.trim()}
                    >
                      {isStreaming ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
