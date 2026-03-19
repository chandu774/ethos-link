import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CollaborationNotification } from "@/lib/collaboration";

export function NotificationPanel({
  notifications,
  onMarkRead,
}: {
  notifications: CollaborationNotification[];
  onMarkRead?: (notificationId: string) => void;
}) {
  return (
    <Card className="border-border/60 bg-card/85">
      <CardHeader>
        <CardTitle className="text-base">Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.length === 0 && (
          <p className="text-sm text-muted-foreground">You're all caught up.</p>
        )}
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-xl border p-3 ${
              notification.is_read ? "border-border/60 bg-background/20" : "border-primary/30 bg-primary/5"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Badge variant={notification.is_read ? "secondary" : "default"}>{notification.type}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(notification.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-foreground">{notification.content}</p>
            {!notification.is_read && onMarkRead && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 px-0 text-primary"
                onClick={() => onMarkRead(notification.id)}
              >
                Mark as read
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
