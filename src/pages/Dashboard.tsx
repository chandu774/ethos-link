import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useAssignments } from "@/hooks/useAssignments";
import { useDashboardGroups } from "@/hooks/useCollaborationGroups";
import { useCreateTask, useTasks, useUpdateTaskStatus } from "@/hooks/useTasks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";

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
  const { data: assignments = [] } = useAssignments(null);
  const { data: tasks = [] } = useTasks(null);
  const updateTaskStatus = useUpdateTaskStatus();
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");

  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  const createTask = useCreateTask(selectedGroupId || "");

  const assignmentsCount = useMemo(() => assignments.length, [assignments]);

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== "completed").length,
    [tasks]
  );
  const name = profile?.name?.split(" ")[0] || user?.email?.split("@")[0] || "Student";

  return (
    <AppLayout>
      <Suspense fallback={<SectionSkeleton className="h-44" />}>
        <DashboardLayout>
          <Suspense fallback={<SectionSkeleton className="h-52" />}>
            <HeroSection
              name={name}
              assignmentsCount={assignmentsCount}
              openTasks={openTasks}
            />
          </Suspense>

          <Suspense fallback={<SectionSkeleton className="h-[320px]" />}>
            <TaskBoard
              tasks={tasks}
              onStatusChange={(taskId, status) => updateTaskStatus.mutate({ taskId, status })}
            />
          </Suspense>
        </DashboardLayout>
      </Suspense>

      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-xl transition-transform duration-300 hover:scale-105"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add a new task to one of your groups.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="dashboard-task-group">Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger id="dashboard-task-group">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Task title"
            />
            <Textarea
              value={taskDescription}
              onChange={(event) => setTaskDescription(event.target.value)}
              placeholder="Description (optional)"
            />
            <Input
              type="datetime-local"
              value={taskDeadline}
              onChange={(event) => setTaskDeadline(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTaskDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={createTask.isPending || !taskTitle.trim() || !selectedGroupId}
              onClick={() => {
                createTask.mutate(
                  {
                    title: taskTitle,
                    description: taskDescription,
                    assignedTo: user?.id || null,
                    deadline: taskDeadline ? new Date(taskDeadline).toISOString() : null,
                  },
                  {
                    onSuccess: () => {
                      setShowCreateTaskDialog(false);
                      setTaskTitle("");
                      setTaskDescription("");
                      setTaskDeadline("");
                    },
                  }
                );
              }}
            >
              {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
