import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Check,
  ClipboardList,
  Loader2,
  MessageSquare,
  UserPlus,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications, useMarkNotificationRead } from "@/hooks/useNotifications";
import { usePendingRequests, useRespondToRequest } from "@/hooks/useConnections";
import { useUserGroups } from "@/hooks/useGroups";
import { cn, formatUsername } from "@/lib/utils";

const NOTIFICATION_TYPES_TO_SHOW = new Set(["connection_request", "new_assignment", "new_note"]);

type FeedItem = {
  kind: "notification";
  id: string;
  createdAt: string;
  title: string;
  description: string;
  unread: boolean;
  type: string;
  actionHref: string | null;
  notificationId: string;
  actionLabel: string | null;
  contextLabel: string | null;
  requestId?: string | null;
  requestStillPending?: boolean;
};

function getNotificationPresentation(notification: {
  type: string;
  content: string;
  id: string;
  is_read: boolean;
  created_at: string;
  group_id: string | null;
  assignment_id: string | null;
  metadata: Record<string, unknown>;
}) {
  if (notification.type === "connection_request") {
    return {
      title: "New connection request",
      actionHref: null,
      actionLabel: null,
    };
  }

  if (notification.type === "new_assignment") {
    return {
      title: "New assignment",
      actionHref: notification.assignment_id ? `/assignments/${notification.assignment_id}` : "/assignments",
      actionLabel: "Open assignment",
    };
  }

  if (notification.type === "new_note") {
    return {
      title: "New note uploaded",
      actionHref: "/notes",
      actionLabel: "Open notes",
    };
  }

  if (notification.type === "new_message") {
    return {
      title: "New group message",
      actionHref: notification.group_id ? `/chat?group=${notification.group_id}` : "/chat",
      actionLabel: "Open chat",
    };
  }

  if (notification.type === "task_assigned") {
    return {
      title: "Task assigned",
      actionHref: "/dashboard",
      actionLabel: "Open dashboard",
    };
  }

  return {
    title: "Notification",
    actionHref: null,
    actionLabel: null,
  };
}

function getNotificationIcon(type: string) {
  if (type === "new_assignment") return ClipboardList;
  if (type === "new_note") return BookOpen;
  if (type === "new_message") return MessageSquare;
  return Bell;
}

export default function Notifications() {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading: loadingNotifications } = useNotifications(100);
  const { data: pendingRequests = [], isLoading: loadingRequests } = usePendingRequests();
  const { data: groups = [] } = useUserGroups(undefined);
  const markNotificationRead = useMarkNotificationRead();
  const respondToRequest = useRespondToRequest();

  const groupMap = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups]
  );

  const pendingRequestMap = useMemo(
    () => new Map(pendingRequests.map((request) => [request.id, request])),
    [pendingRequests]
  );

  const feedItems = useMemo<FeedItem[]>(() => {
    return notifications
      .filter((notification) => NOTIFICATION_TYPES_TO_SHOW.has(notification.type))
      .map((notification) => {
      const presentation = getNotificationPresentation(notification);
      const contextLabel = notification.group_id ? groupMap.get(notification.group_id) || null : null;
      const metadata =
        notification.metadata && typeof notification.metadata === "object" && !Array.isArray(notification.metadata)
          ? (notification.metadata as Record<string, unknown>)
          : {};
      const requestId =
        typeof metadata.connection_id === "string" ? metadata.connection_id : null;
      const pendingRequest = requestId ? pendingRequestMap.get(requestId) : undefined;
      const description =
        notification.type === "connection_request" && pendingRequest
          ? `${formatUsername(
              pendingRequest.requester?.username || null,
              pendingRequest.requester?.name || "New classmate"
            ).display} wants to connect with you.`
          : notification.content;

      return {
        kind: "notification",
        id: `notification-${notification.id}`,
        createdAt: notification.created_at,
        title: presentation.title,
        description,
        unread: !notification.is_read,
        type: notification.type,
        actionHref: presentation.actionHref,
        actionLabel: presentation.actionLabel,
        notificationId: notification.id,
        contextLabel,
        requestId,
        requestStillPending: Boolean(requestId && pendingRequest),
      };
      });
  }, [groupMap, notifications, pendingRequestMap]);

  const sortedFeedItems = useMemo(
    () =>
      [...feedItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [feedItems]
  );

  const unreadCount = sortedFeedItems.filter((item) => item.unread).length;

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="hidden border-border/60 bg-card/85 shadow-card backdrop-blur sm:block">
          <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gradient-neural shadow-sm">
                  <Bell className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    See connection requests, note uploads, and new assignments in one place.
                  </p>
                </div>
              </div>
              <div className="self-end sm:self-start">
                <Badge variant="secondary" className="h-9 rounded-full px-3 text-sm">
                  {unreadCount} unread
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pt-5 sm:pt-6">
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription>Everything that needs your attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingNotifications || loadingRequests ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : sortedFeedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">You're all caught up.</p>
            ) : (
              sortedFeedItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl border p-4 transition-colors",
                    item.unread ? "border-primary/30 bg-primary/5" : "border-border/60 bg-background/40"
                  )}
                >
                  {item.type === "connection_request" ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                          <UserPlus className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{item.title}</p>
                            <Badge>Request</Badge>
                            {!item.requestStillPending && <Badge variant="secondary">Handled</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (item.unread) {
                              markNotificationRead.mutate(item.notificationId);
                            }
                            if (!item.requestId) return;
                            respondToRequest.mutate({
                              connectionId: item.requestId,
                              status: "rejected",
                            });
                          }}
                          disabled={respondToRequest.isPending || !item.requestStillPending}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (item.unread) {
                              markNotificationRead.mutate(item.notificationId);
                            }
                            if (!item.requestId) return;
                            respondToRequest.mutate({
                              connectionId: item.requestId,
                              status: "accepted",
                            });
                          }}
                          disabled={respondToRequest.isPending || !item.requestStillPending}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between"
                      onClick={() => {
                        if (item.unread) {
                          markNotificationRead.mutate(item.notificationId);
                        }
                        if (item.actionHref) {
                          navigate(item.actionHref);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                          {(() => {
                            const Icon = getNotificationIcon(item.type);
                            return <Icon className="h-4 w-4" />;
                          })()}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{item.title}</p>
                            <Badge variant={item.unread ? "default" : "secondary"}>{item.type}</Badge>
                            {item.contextLabel && <Badge variant="outline">{item.contextLabel}</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {item.actionLabel && (
                        <span className="text-sm font-medium text-primary">{item.actionLabel}</span>
                      )}
                    </button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
