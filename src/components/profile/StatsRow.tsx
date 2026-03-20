import { Flame, FileCheck2, NotebookTabs, Users } from "lucide-react";

interface StatsRowProps {
  notesUploaded: number;
  assignmentsSubmitted: number;
  groupsJoined: number;
  activityStreak: number;
}

const statsConfig = [
  { key: "notesUploaded", label: "Notes Uploaded", icon: NotebookTabs },
  { key: "assignmentsSubmitted", label: "Assignments Submitted", icon: FileCheck2 },
  { key: "groupsJoined", label: "Groups Joined", icon: Users },
  { key: "activityStreak", label: "Activity Streak", icon: Flame, suffix: " days" },
] as const satisfies ReadonlyArray<{
  key: "notesUploaded" | "assignmentsSubmitted" | "groupsJoined" | "activityStreak";
  label: string;
  icon: typeof NotebookTabs;
  suffix?: string;
}>;

export function StatsRow({ notesUploaded, assignmentsSubmitted, groupsJoined, activityStreak }: StatsRowProps) {
  const values = {
    notesUploaded,
    assignmentsSubmitted,
    groupsJoined,
    activityStreak,
  };

  return (
    <section className="grid gap-3 sm:grid-cols-2">
      {statsConfig.map((stat) => {
        const Icon = stat.icon;
        const value = values[stat.key];
        return (
          <article
            key={stat.key}
            className="rounded-xl bg-card/90 p-3.5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-4"
          >
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-lg font-semibold text-foreground sm:text-xl">
              {value}
              {"suffix" in stat ? stat.suffix : ""}
            </p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
          </article>
        );
      })}
    </section>
  );
}
