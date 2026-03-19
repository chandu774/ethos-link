import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProfileAssignmentItem } from "@/hooks/useProfileInsights";

interface AssignmentListProps {
  items: ProfileAssignmentItem[];
}

const PAGE_SIZE = 8;

export function AssignmentList({ items }: AssignmentListProps) {
  const [page, setPage] = useState(1);
  const visible = useMemo(() => items.slice(0, page * PAGE_SIZE), [items, page]);

  if (!items.length) {
    return (
      <div className="rounded-xl bg-card/80 p-8 text-center text-sm text-muted-foreground shadow-sm">
        No assignment submissions yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map((item) => (
        <article key={item.id} className="rounded-xl bg-card/90 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">{item.assignment_title}</p>
              <p className="text-xs text-muted-foreground">
                {item.assignment_deadline
                  ? `Due ${new Date(item.assignment_deadline).toLocaleDateString()}`
                  : "No deadline"}
              </p>
            </div>
            <Badge variant={item.status === "submitted" ? "default" : "secondary"}>
              {item.status}
            </Badge>
          </div>
        </article>
      ))}

      {visible.length < items.length ? (
        <Button variant="outline" onClick={() => setPage((prev) => prev + 1)}>
          Load More
        </Button>
      ) : null}
    </div>
  );
}
