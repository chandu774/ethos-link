import { useEffect, useMemo, useState } from "react";
import { CalendarClock, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { CollaborationTask } from "@/lib/collaboration";

type TaskStatus = "todo" | "in_progress" | "completed";

interface AssigneeInfo {
  name: string;
  avatar_url: string | null;
}

interface TaskBoardProps {
  tasks: CollaborationTask[];
  assignees?: Record<string, AssigneeInfo>;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
}

const columns: Array<{ key: TaskStatus; title: string; tint: string }> = [
  { key: "todo", title: "Todo", tint: "from-slate-500/20 to-slate-500/5" },
  { key: "completed", title: "Completed", tint: "from-emerald-500/20 to-emerald-500/5" },
];

export function TaskBoard({ tasks, assignees = {}, onStatusChange }: TaskBoardProps) {
  const [boardTasks, setBoardTasks] = useState<CollaborationTask[]>(tasks);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [activeTodoTaskId, setActiveTodoTaskId] = useState<string | null>(null);

  useEffect(() => {
    setBoardTasks(tasks);
  }, [tasks]);

  const groupedTasks = useMemo(
    () =>
      columns.reduce<Record<string, CollaborationTask[]>>(
        (acc, column) => {
          acc[column.key] = boardTasks.filter((task) => {
            if (column.key === "todo") {
              return task.status === "todo" || task.status === "in_progress";
            }
            return task.status === column.key;
          });
          return acc;
        },
        { todo: [], completed: [] }
      ),
    [boardTasks]
  );

  const moveTask = (taskId: string, status: TaskStatus) => {
    setBoardTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task))
    );
    onStatusChange?.(taskId, status);
  };

  return (
    <section className="space-y-3 animate-in fade-in-0 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Task Board</h3>
          <p className="mt-1 text-sm text-muted-foreground">Private tasks created by you, organized with a cleaner board.</p>
        </div>
        <p className="hidden rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground sm:block">
          Drag cards across columns
        </p>
      </div>
      {tasks.length === 0 ? (
        <Card className="rounded-[28px] border border-dashed border-border/60 bg-gradient-to-br from-card/90 via-card/70 to-background/80 p-8 text-center shadow-card">
          <div className="mx-auto max-w-md space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-glow">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">No active tasks yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a task from the dashboard action button to give your group a clear next step and keep work moving.
              </p>
            </div>
          </div>
        </Card>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {columns.map((column) => (
          <Card
            key={column.key}
            className={cn(
              "min-h-[320px] rounded-[28px] border border-border/40 bg-gradient-to-b p-3 sm:p-4 shadow-card transition-colors",
              column.tint
            )}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = event.dataTransfer.getData("task-id");
              if (taskId) {
                moveTask(taskId, column.key);
              }
              setDraggingTaskId(null);
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold tracking-wide text-foreground">{column.title}</p>
              <span className="rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-xs text-muted-foreground">
                {groupedTasks[column.key].length}
              </span>
            </div>

            <div className="space-y-2">
              {groupedTasks[column.key].map((task) => {
                const assignee = task.assigned_to ? assignees[task.assigned_to] : undefined;
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("task-id", task.id);
                      setDraggingTaskId(task.id);
                    }}
                    onDragEnd={() => setDraggingTaskId(null)}
                    onClick={() => {
                      if (column.key !== "todo") return;
                      setActiveTodoTaskId((current) => (current === task.id ? null : task.id));
                    }}
                    className={cn(
                      "rounded-2xl border border-border/50 bg-card/95 p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated",
                      column.key === "todo" ? "cursor-pointer" : "",
                      draggingTaskId === task.id ? "scale-[1.02] opacity-80" : ""
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <GripVertical className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    {task.description ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted-foreground">{task.description}</p>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-background/55 px-2.5 py-1 text-xs text-muted-foreground">
                        <CalendarClock className="h-3 w-3" />
                        {task.deadline
                          ? new Date(task.deadline).toLocaleDateString()
                          : "No deadline"}
                      </div>
                      <Avatar className="h-6 w-6 border border-border/40">
                        {assignee?.avatar_url ? <AvatarImage src={assignee.avatar_url} alt={assignee.name} /> : null}
                        <AvatarFallback className="text-[10px]">
                          {assignee?.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    {column.key === "todo" && activeTodoTaskId === task.id && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={(event) => {
                            event.stopPropagation();
                            moveTask(task.id, "completed");
                            setActiveTodoTaskId(null);
                          }}
                        >
                          Mark completed
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {groupedTasks[column.key].length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 p-6 text-center text-xs text-muted-foreground">
                  {column.key === "todo" ? "Drop active work here" : "Move completed work here"}
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
