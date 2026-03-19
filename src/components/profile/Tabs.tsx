import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ProfileTabKey = "overview" | "notes" | "assignments" | "activity";

interface ProfileTabsProps {
  value: ProfileTabKey;
  onValueChange: (value: ProfileTabKey) => void;
}

export function ProfileTabs({ value, onValueChange }: ProfileTabsProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onValueChange(next as ProfileTabKey)}>
      <TabsList className="grid w-full grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 sm:grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="assignments">Assignments</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
