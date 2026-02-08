import { Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type GroupAvatarSize = "sm" | "md" | "lg";

interface GroupAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  className?: string;
  size?: GroupAvatarSize;
  fallbackClassName?: string;
}

// Visual spec: avatar container size comes from `className`.
// `sm` (32px): text 14px, icon 16px, weight 600.
// `md` (40-48px): text 16px, icon 20px, weight 600.
// `lg` (64px): text 20px, icon 28px, weight 600.
const sizeStyles: Record<GroupAvatarSize, { text: string; icon: string; weight: string }> = {
  sm: { text: "text-sm", icon: "h-4 w-4", weight: "font-semibold" },
  md: { text: "text-base", icon: "h-5 w-5", weight: "font-semibold" },
  lg: { text: "text-xl", icon: "h-7 w-7", weight: "font-semibold" },
};

const getInitial = (trimmedName: string) => {
  if (!trimmedName) return null;
  const initial = trimmedName.charAt(0).toUpperCase();
  return /[A-Z0-9]/i.test(initial) ? initial : null;
};

const getColorFromName = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} var(--group-avatar-saturation) var(--group-avatar-lightness))`;
};

export function GroupAvatar({
  name,
  avatarUrl,
  className,
  size = "md",
  fallbackClassName,
}: GroupAvatarProps) {
  const trimmedName = (name ?? "").trim();
  const initial = getInitial(trimmedName);
  const fallbackStyle = initial ? { backgroundColor: getColorFromName(trimmedName) } : undefined;
  const { text, icon, weight } = sizeStyles[size];

  return (
    <Avatar className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name || "Group"} /> : null}
      <AvatarFallback
        className={cn(
          "rounded-full",
          initial ? `text-white ${weight}` : "bg-muted text-muted-foreground",
          text,
          fallbackClassName
        )}
        style={fallbackStyle}
      >
        {initial ? initial : <Users className={icon} />}
      </AvatarFallback>
    </Avatar>
  );
}
