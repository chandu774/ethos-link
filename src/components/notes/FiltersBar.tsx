import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GroupOption {
  id: string;
  name: string;
}

interface FiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  subject: string;
  onSubjectChange: (value: string) => void;
  groupId: string;
  onGroupChange: (value: string) => void;
  sortBy: "recent" | "popular";
  onSortChange: (value: "recent" | "popular") => void;
  groups: GroupOption[];
  subjects: string[];
}

export function FiltersBar({
  search,
  onSearchChange,
  subject,
  onSubjectChange,
  groupId,
  onGroupChange,
  sortBy,
  onSortChange,
  groups,
  subjects,
}: FiltersBarProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-border/40 bg-card/85 p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search notes by title..."
      />

      <Select value={groupId} onValueChange={onGroupChange}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by group" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Groups</SelectItem>
          {groups.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={subject} onValueChange={onSubjectChange}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by subject" />
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
        <SelectTrigger>
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

