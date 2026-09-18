import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckSquare,
  Clock,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Circle,
  PlayCircle,
  Sparkles,
  Layers,
  Filter,
  ArrowRight,
  Lock,
  GraduationCap,
  ExternalLink,
} from "lucide-react";
import { useSynapse } from "@/hooks/useSynapse";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function TasksPage() {
  const navigate = useNavigate();
  const synapse = useSynapse();

  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "completed">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "official" | "personal">("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Form state for Personal task
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("CS301");
  const [newDescription, setNewDescription] = useState("");
  const [newDeadline, setNewDeadline] = useState("Tomorrow, 5:00 PM");
  const [newPriority, setNewPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [newEffort, setNewEffort] = useState(30);

  const handleCreatePersonalTask = () => {
    if (!newTitle.trim()) {
      toast.error("Please provide a task title");
      return;
    }

    synapse.addTask(newTitle, newSubject, newDescription, newDeadline, newPriority, Number(newEffort));
    toast.success("Personal task created");
    setNewTitle("");
    setNewDescription("");
    setShowAddDialog(false);
  };

  const filteredTasks = synapse.tasks.filter((t) => {
    if (activeFilter === "pending" && t.status === "completed") return false;
    if (activeFilter === "completed" && t.status !== "completed") return false;
    if (selectedSubject !== "all" && t.subject !== selectedSubject) return false;
    if (sourceFilter === "official" && t.source !== "Official Classroom Assignment") return false;
    if (sourceFilter === "personal" && t.source === "Official Classroom Assignment") return false;
    return true;
  });

  const pendingTasks = synapse.tasks.filter((t) => t.status !== "completed");
  const totalEffortMinutes = pendingTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
  const urgentCount = pendingTasks.filter((t) => t.priority === "HIGH").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Workload Intelligence
              </Badge>
              <span className="text-xs text-muted-foreground">• Two-Way Classroom Sync</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Tasks & Workload
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Official classroom assignments synchronized with instructor deadlines alongside your personal study tasks.
            </p>
          </div>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 gap-1.5 bg-primary text-primary-foreground font-medium">
                <Plus className="h-4 w-4" />
                <span>Add Personal Task</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Add Personal Study Task</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Personal tasks are for self-study and revisions. Official classroom assignments are created by your instructors.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3 text-xs">
                <div>
                  <label className="text-xs font-medium text-foreground">Task Title *</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Read BCNF decomposition slides"
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Subject Code</label>
                    <Input
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="e.g. CS301"
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Priority</label>
                    <Select value={newPriority} onValueChange={(val: any) => setNewPriority(val)}>
                      <SelectTrigger className="mt-1 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIGH">High Priority</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Deadline</label>
                    <Input
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Est. Effort (Mins)</label>
                    <Input
                      type="number"
                      value={newEffort}
                      onChange={(e) => setNewEffort(Number(e.target.value))}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Notes (Optional)</label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Notes, links, or references..."
                    className="mt-1 text-xs min-h-[60px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreatePersonalTask} className="bg-primary text-primary-foreground font-medium">
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Workload Analysis Banner */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/50 bg-card/80 shadow-sm">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground block">Active Study Workload</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {Math.round(totalEffortMinutes / 60)}h {totalEffortMinutes % 60}m
                </span>
                <span className="text-xs text-muted-foreground">across all classes</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{pendingTasks.length} tasks remaining this week</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 shadow-sm">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground block">Urgent Deadlines</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-destructive">{urgentCount}</span>
                <span className="text-xs text-muted-foreground">due within 48h</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Prioritize DBMS Assignment 3</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-accent/10 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Recommended Priority</span>
              </div>
              <p className="mt-1 text-xs text-foreground font-medium">
                Today: 20m 2NF Review + 30m DBMS Assignment
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Balances concept mastery with upcoming class deadline.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Status Filter */}
            <div className="flex rounded-lg border border-border/60 bg-muted/40 p-0.5">
              {(["all", "pending", "completed"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium capitalize transition",
                    activeFilter === filter ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Source Distinction Filter */}
            <div className="flex rounded-lg border border-border/60 bg-muted/40 p-0.5">
              <button
                onClick={() => setSourceFilter("all")}
                className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition", sourceFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
              >
                All Sources
              </button>
              <button
                onClick={() => setSourceFilter("official")}
                className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition flex items-center gap-1", sourceFilter === "official" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
              >
                <GraduationCap className="h-3 w-3 text-primary" />
                <span>Official Coursework</span>
              </button>
              <button
                onClick={() => setSourceFilter("personal")}
                className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition", sourceFilter === "personal" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
              >
                Personal
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Subject:</span>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="h-8 w-36 text-xs bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="CS301">CS301: DBMS</SelectItem>
                <SelectItem value="CS302">CS302: OS</SelectItem>
                <SelectItem value="CS303">CS303: Networks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === "completed";
            const isHigh = task.priority === "HIGH";
            const isOfficial = task.source === "Official Classroom Assignment";

            return (
              <Card
                key={task.id}
                className={cn(
                  "border transition-all duration-150",
                  isCompleted ? "border-border/40 bg-muted/20 opacity-75" : isOfficial ? "border-primary/40 bg-card/90 shadow-sm" : "border-border/60 bg-card/80 hover:shadow-sm"
                )}
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="mt-0.5 text-muted-foreground hover:text-primary transition"
                      onClick={() => {
                        const nextStatus = isCompleted ? "pending" : "completed";
                        synapse.updateTaskStatus(task.id, nextStatus);
                        if (nextStatus === "completed") {
                          toast.success(`Completed: ${task.title}`);
                        }
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/20" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("text-sm font-semibold text-foreground", isCompleted && "line-through text-muted-foreground")}>
                          {task.title}
                        </span>
                        <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
                          {task.subject}
                        </Badge>
                        <Badge
                          variant={isHigh ? "destructive" : "secondary"}
                          className="text-[9px] uppercase font-bold"
                        >
                          {task.priority}
                        </Badge>

                        {isOfficial ? (
                          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[9px] font-semibold flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" />
                            <span>Official Assignment</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] text-muted-foreground">
                            Personal
                          </Badge>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Due: <strong className="text-foreground">{task.deadline}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> ~{task.estimatedMinutes}m effort
                        </span>
                        {task.classroomId && (
                          <>
                            <span>•</span>
                            <button
                              type="button"
                              className="text-primary hover:underline font-medium flex items-center gap-0.5"
                              onClick={() => navigate(`/classrooms/${task.classroomId}?tab=assignments`)}
                            >
                              <span>Open in Classroom</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Select
                      value={task.status}
                      onValueChange={(val) => synapse.updateTaskStatus(task.id, val as any)}
                    >
                      <SelectTrigger className="h-7 w-28 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted-foreground">
              <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-2 text-sm font-medium text-foreground">No tasks found</p>
              <p className="text-xs text-muted-foreground">All caught up, or adjust your active filters.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
