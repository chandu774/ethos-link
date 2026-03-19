import { ArrowUpRight, Lock, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CollaborationGroup } from "@/lib/collaboration";

interface GroupCardProps {
  group: CollaborationGroup & { members_count?: number; member_role?: string | null };
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Card className="border-border/40 bg-card/85 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {group.description || "No description yet."}
          </p>
        </div>
        {group.is_private ? (
          <Badge variant="secondary" className="shrink-0 gap-1">
            <Lock className="h-3 w-3" />
            Private
          </Badge>
        ) : (
          <Badge variant="outline" className="shrink-0">
            Public
          </Badge>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {group.members_count ?? 0} members
          {group.member_role ? <span className="capitalize">· {group.member_role}</span> : null}
        </div>
        <Button asChild size="sm" variant="ghost" className="h-7 px-2">
          <a href={`/groups/${group.id}`}>
            Open
            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </Card>
  );
}

