import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isPreviewableFile } from "@/lib/collaboration";
import type { CollaborationMessage } from "@/lib/collaboration";

export function MessageList({
  messages,
  typingCount = 0,
}: {
  messages: CollaborationMessage[];
  typingCount?: number;
}) {
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <Card key={message.id} className="border-border/60 bg-card/80 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {message.sender?.username || message.sender?.name || "Member"}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(message.created_at))}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {message.type}
            </Badge>
          </div>
          <p className="text-sm leading-6 text-foreground">{message.content}</p>
          {message.file_url && (
            <div className="mt-3">
              {isPreviewableFile(message.file_url) ? (
                <a
                  href={message.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Preview attachment
                </a>
              ) : (
                <a
                  href={message.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Download file
                </a>
              )}
            </div>
          )}
        </Card>
      ))}
      {typingCount > 0 && (
        <p className="px-2 text-xs text-muted-foreground">
          {typingCount} {typingCount === 1 ? "person is" : "people are"} typing...
        </p>
      )}
    </div>
  );
}
