import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Info, Send, Sparkles, Loader2, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { useAIConversations, useCurrentConversation, Message } from "@/hooks/useAIConversations";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

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

    // Update DB with user message
    await supabase
      .from("ai_conversations")
      .update({ 
        messages: messagesWithUser as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", convId);

    setIsStreaming(true);
    setStreamingContent("");

    try {
      // Prepare messages for AI (only recent messages for context, limit to last 20)
      const recentMessages = messagesWithUser.slice(-20);
      const apiMessages = recentMessages.map(m => ({ 
        role: m.role, 
        content: m.content 
      }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        
        if (resp.status === 429) {
          toast({
            title: "Rate limit exceeded",
            description: "Please wait a moment and try again.",
            variant: "destructive",
          });
          throw new Error("Rate limited");
        }
        
        if (resp.status === 402) {
          toast({
            title: "Credits exhausted", 
            description: "Please add credits to continue using AI chat.",
            variant: "destructive",
          });
          throw new Error("Payment required");
        }
        
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setStreamingContent(assistantContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final buffer flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setStreamingContent(assistantContent);
            }
          } catch { /* ignore partial */ }
        }
      }

      // Save complete assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent,
      };

      const finalMessages = [...messagesWithUser, assistantMessage];
      setLocalMessages(finalMessages);

      // Generate summary from first user message
      const firstUserMsg = finalMessages.find(m => m.role === "user");
      const summary = firstUserMsg 
        ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? "..." : "")
        : null;
      
      await supabase
        .from("ai_conversations")
        .update({ 
          messages: finalMessages as unknown as Json,
          summary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", convId);

      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });

      // Analyze mindset traits from user message
      if (profile) {
        await analyzeMindset(userContent);
      }

    } catch (error) {
      console.error("Chat error:", error);
      if (!(error instanceof Error && (error.message === "Rate limited" || error.message === "Payment required"))) {
        toast({
          title: "Error",
          description: "Failed to get response. Please try again.",
          variant: "destructive",
        });
      }
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

    const hasAdjustments = Object.values(adjustments).some(v => v !== 0);
    
    if (hasAdjustments && profile) {
      const currentTraits = profile.mindset_traits as Record<string, number> || {};
      const newTraits = { ...currentTraits };
      
      Object.entries(adjustments).forEach(([trait, adjustment]) => {
        if (adjustment !== 0) {
          const currentValue = newTraits[trait] || 50;
          newTraits[trait] = Math.max(0, Math.min(100, currentValue + adjustment));
        }
      });

      await supabase
        .from("profiles")
        .update({ mindset_traits: newTraits })
        .eq("id", user!.id);

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
        <div className="lg:hidden mb-4">
          <Button
            variant="outline"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? <X className="h-4 w-4 mr-2" /> : <Menu className="h-4 w-4 mr-2" />}
            {showSidebar ? "Close" : "Chat History"}
          </Button>
        </div>

        <div className="flex gap-6">
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
                <div className="h-[400px] overflow-y-auto p-4 space-y-4">
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
                              "max-w-[80%] rounded-2xl px-4 py-3",
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
                          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-muted text-foreground rounded-bl-md">
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
                <div className="border-t p-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-3"
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
                      className="gradient-neural text-primary-foreground"
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
