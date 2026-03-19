import {
  BellRing,
  CalendarCheck,
  MessageSquareText,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface ActivityItem {
  id: string;
  type: string;
  content: string;
  created_at: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

function iconForType(type: string) {
  if (type.includes("message")) return MessageSquareText;
  if (type.includes("assignment")) return CalendarCheck;
  if (type.includes("task")) return Sparkles;
  if (type.includes("join")) return UserPlus;
  return BellRing;
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card className="border-border/40 bg-card/85 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Activity Feed</h3>
        <span className="text-xs text-muted-foreground">Live updates</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-background/25 p-6 text-center">
          <p className="text-sm text-muted-foreground">No recent activity yet.</p>
          <a href="/groups" className="mt-2 inline-block text-xs text-primary hover:underline">
            Join or create a group
          </a>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const Icon = iconForType(item.type);
            return (
              <li
                key={item.id}
                className="animate-in fade-in-0 slide-in-from-right-2 rounded-xl border border-border/40 bg-background/30 p-3 duration-300"
                style={{ animationDelay: `${Math.min(index * 60, 240)}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{item.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

