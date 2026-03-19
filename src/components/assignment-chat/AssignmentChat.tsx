import { useEffect, useRef } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAssignmentChat, useSendAssignmentMessage } from "@/hooks/useAssignmentChat";
import { MessageBubble } from "@/components/assignment-chat/MessageBubble";
import { MessageInput } from "@/components/assignment-chat/MessageInput";

interface AssignmentChatProps {
  assignmentId: string;
}

export function AssignmentChat({ assignmentId }: AssignmentChatProps) {
  const { user } = useAuth();
  const chatQuery = useAssignmentChat(assignmentId);
  const sendMessage = useSendAssignmentMessage(assignmentId);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [chatQuery.messages.length]);

  return (
    <Card className="border-border/60 bg-card/85">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Assignment Discussion</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {chatQuery.hasNextPage ? (
          <div className="px-3 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => chatQuery.fetchNextPage()}
              disabled={chatQuery.isFetchingNextPage}
            >
              {chatQuery.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load older messages"}
            </Button>
          </div>
        ) : null}

        <div ref={scrollRef} className="max-h-[340px] min-h-[240px] space-y-2 overflow-y-auto px-3 pb-3">
          {chatQuery.isLoading ? (
            <div className="flex h-44 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : chatQuery.isError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {chatQuery.error instanceof Error ? chatQuery.error.message : "Failed to load discussion."}
            </div>
          ) : chatQuery.messages.length > 0 ? (
            chatQuery.messages.map((message) => (
              <MessageBubble key={message.id} message={message} isOwn={message.user_id === user?.id} />
            ))
          ) : (
            <div className="flex h-44 flex-col items-center justify-center text-center text-muted-foreground">
              <MessageCircle className="mb-2 h-6 w-6" />
              <p className="text-sm">No discussion yet. Start the conversation 🚀</p>
            </div>
          )}
        </div>

        <MessageInput
          onSend={(text) => sendMessage.mutate(text)}
          isSending={sendMessage.isPending}
        />
      </CardContent>
    </Card>
  );
}
