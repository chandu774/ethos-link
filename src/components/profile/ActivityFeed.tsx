import { CheckSquare, NotebookText, Users } from "lucide-react";
import type { ProfileActivityItem } from "@/hooks/useProfileInsights";

interface ActivityFeedProps {
  items: ProfileActivityItem[];
  emptyLabel?: string;
}

function iconForType(type: ProfileActivityItem["type"]) {
  if (type === "note") return NotebookText;
  if (type === "assignment") return CheckSquare;
  return Users;
}

export function ActivityFeed({ items, emptyLabel = "No activity yet." }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-card/80 p-8 text-center text-sm text-muted-foreground shadow-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = iconForType(item.type);
        return (
          <article key={item.id} className="rounded-xl bg-card/90 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="line-clamp-1 text-sm text-muted-foreground">{item.subtitle}</p>
              </div>
              <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
