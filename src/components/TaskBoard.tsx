import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CollaborationTask } from "@/lib/collaboration";

type TaskBoardStatus = "todo" | "completed";

const columns: Array<{ key: TaskBoardStatus; label: string }> = [
  { key: "todo", label: "Todo" },
  { key: "completed", label: "Completed" },
];

export function TaskBoard({
  tasks,
  onStatusChange,
}: {
  tasks: CollaborationTask[];
  onStatusChange?: (taskId: string, status: TaskBoardStatus) => void;
}) {
  const matchesColumn = (task: CollaborationTask, column: TaskBoardStatus) => {
    if (column === "todo") {
      return task.status === "todo" || task.status === "in_progress";
    }
    return task.status === "completed";
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {columns.map((column) => (
        <Card key={column.key} className="border-border/60 bg-card/85">
          <CardHeader>
            <CardTitle className="text-base">{column.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.filter((task) => matchesColumn(task, column.key)).map((task) => (
              <div key={task.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                <p className="font-medium text-foreground">{task.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {task.description || "No description"}
                </p>
                {task.deadline && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Due {new Date(task.deadline).toLocaleDateString()}
                  </p>
                )}
                {onStatusChange && column.key !== "completed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-3 px-0 text-primary"
                    onClick={() => onStatusChange(task.id, "completed")}
                  >
                    Mark completed
                  </Button>
                )}
              </div>
            ))}
            {!tasks.some((task) => matchesColumn(task, column.key)) && (
              <p className="text-sm text-muted-foreground">No tasks here yet.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
