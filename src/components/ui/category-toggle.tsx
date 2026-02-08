import { Briefcase, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryToggleProps {
  value: "Professional" | "Personal";
  onChange: (value: "Professional" | "Personal") => void;
}

export function CategoryToggle({ value, onChange }: CategoryToggleProps) {
  return (
    <div className="flex rounded-xl bg-muted p-1.5">
      <button
        onClick={() => onChange("Professional")}
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
          value === "Professional"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Briefcase className="h-4 w-4" />
        <span>Professional</span>
      </button>
      <button
        onClick={() => onChange("Personal")}
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
          value === "Personal"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Heart className="h-4 w-4" />
        <span>Personal</span>
      </button>
    </div>
  );
}
