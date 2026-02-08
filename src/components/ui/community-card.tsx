import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommunityCardProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  imageUrl?: string | null;
  category?: string | null;
  members: number;
  description: string;
  isJoined?: boolean;
  onToggle: (id: string) => void;
}

export function CommunityCard({
  id,
  name,
  icon,
  color,
  imageUrl,
  category,
  members,
  description,
  isJoined = false,
  onToggle,
}: CommunityCardProps) {
  return (
    <Card
      className={cn(
        "group overflow-hidden shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1",
        isJoined && "ring-2 ring-primary/50"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br text-2xl",
              color
            )}
          >
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              icon
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate">{name}</h3>
              {isJoined && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
            {category && (
              <p className="mt-1 text-xs text-muted-foreground/80">{category}</p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{members.toLocaleString()} members</span>
              </div>
              <Button
                size="sm"
                variant={isJoined ? "outline" : "default"}
                onClick={() => onToggle(id)}
                className={cn(
                  "h-8",
                  !isJoined && "gradient-neural text-primary-foreground"
                )}
              >
                {isJoined ? "Joined" : "Join"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
