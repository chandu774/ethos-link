import { AssignmentList } from "@/components/profile/AssignmentList";
import type { ProfileAssignmentItem } from "@/hooks/useProfileInsights";

interface AssignmentsTabContentProps {
  assignments: ProfileAssignmentItem[];
}

export function AssignmentsTabContent({ assignments }: AssignmentsTabContentProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Assignment Submissions</h3>
      <AssignmentList items={assignments} />
    </section>
  );
}
