import { cn } from "@/lib/utils";
import type { AssignmentMessageItem } from "@/hooks/useAssignmentChat";

interface MessageBubbleProps {
  message: AssignmentMessageItem;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const sender = message.user?.name || message.user?.username || "Member";

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          isOwn
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border/50 bg-muted text-foreground"
        )}
      >
        {!isOwn ? <p className="mb-1 text-xs text-muted-foreground">{sender}</p> : null}
        <p className="whitespace-pre-wrap break-words">{message.message}</p>
        <p className={cn("mt-1 text-[11px]", isOwn ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
