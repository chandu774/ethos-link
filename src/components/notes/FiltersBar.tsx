import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface FiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  subject: string;
  onSubjectChange: (value: string) => void;
  sortBy: "recent" | "popular";
  onSortChange: (value: "recent" | "popular") => void;
  subjects: string[];
}

export function FiltersBar({
  search,
  onSearchChange,
  subject,
  onSubjectChange,
  sortBy,
  onSortChange,
  subjects,
}: FiltersBarProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-border/40 bg-card/85 p-4 shadow-sm md:grid-cols-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search notes by title..."
          className="pl-9 text-xs"
        />
      </div>

      <Select value={subject} onValueChange={onSubjectChange}>
        <SelectTrigger className="text-xs">
          <SelectValue placeholder="All Subjects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Subjects</SelectItem>
          {subjects.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={(value) => onSortChange(value as "recent" | "popular")}>
        <SelectTrigger className="text-xs">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Most Recent</SelectItem>
          <SelectItem value="popular">Most Popular</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
