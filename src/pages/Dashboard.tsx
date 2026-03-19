import { Suspense, lazy, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAssignments } from "@/hooks/useAssignments";
import { useDashboardGroups, useCollaborationGroupMembers } from "@/hooks/useCollaborationGroups";
import { useTasks, useUpdateTaskStatus } from "@/hooks/useTasks";

const DashboardLayout = lazy(() =>
  import("@/components/dashboard/DashboardLayout").then((module) => ({ default: module.DashboardLayout }))
);
const HeroSection = lazy(() =>
  import("@/components/dashboard/HeroSection").then((module) => ({ default: module.HeroSection }))
);
const TaskBoard = lazy(() =>
  import("@/components/dashboard/TaskBoard").then((module) => ({ default: module.TaskBoard }))
);

const SectionSkeleton = ({ className = "" }: { className?: string }) => (
  <Card className={`animate-pulse border-border/40 bg-card/60 ${className}`} />
);

export default function Dashboard() {
  const { profile, user } = useAuth();
  const { data: groups = [] } = useDashboardGroups();
  const activeGroupId = groups[0]?.id ?? null;
  const { data: members = [] } = useCollaborationGroupMembers(activeGroupId || "");
  const { data: assignments = [] } = useAssignments(activeGroupId);
  const { data: tasks = [] } = useTasks(activeGroupId);
  const updateTaskStatus = useUpdateTaskStatus(activeGroupId || "");

  const assignmentsDue = useMemo(() => {
    const now = Date.now();
    const weekAhead = now + 1000 * 60 * 60 * 24 * 7;
    return assignments.filter((item) => {
      const due = new Date(item.deadline).getTime();
      return due >= now && due <= weekAhead;
    }).length;
  }, [assignments]);

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== "completed").length,
    [tasks]
  );
  const assigneeMap = useMemo(
    () =>
      members.reduce<Record<string, { name: string; avatar_url: string | null }>>((acc, member) => {
        if (!member.user_id) return acc;
        acc[member.user_id] = {
          name: member.profile?.name || member.profile?.username || "Member",
          avatar_url: member.profile?.avatar_url || null,
        };
        return acc;
      }, {}),
    [members]
  );

  const name = profile?.name?.split(" ")[0] || user?.email?.split("@")[0] || "Student";

  return (
    <AppLayout>
      <Suspense fallback={<SectionSkeleton className="h-44" />}>
        <DashboardLayout>
          <Suspense fallback={<SectionSkeleton className="h-52" />}>
            <HeroSection
              name={name}
              assignmentsDue={assignmentsDue}
              openTasks={openTasks}
            />
          </Suspense>

          <Suspense fallback={<SectionSkeleton className="h-[320px]" />}>
            <TaskBoard
              tasks={tasks}
              assignees={assigneeMap}
              onStatusChange={(taskId, status) => updateTaskStatus.mutate({ taskId, status })}
            />
          </Suspense>
        </DashboardLayout>
      </Suspense>
    </AppLayout>
  );
}
