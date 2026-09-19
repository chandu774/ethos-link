import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
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
  Sparkles,
  Lock,
  GraduationCap,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSynapse } from "@/hooks/useSynapse";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DBTask {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  priority: string | null;
  subject: string | null;
  is_official: boolean | null;
  assignment_id: string | null;
  created_at: string;
  assigned_to: string | null;
  created_by: string;
}

export default function TasksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const synapse = useSynapse();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "completed">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "official" | "personal">("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for Personal task
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Self Study");
  const [newDescription, setNewDescription] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newPriority, setNewPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("HIGH");

  // Fetch real database tasks
  const {
    data: dbTasks = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["student-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching tasks:", error);
        throw error;
      }
      return (data || []) as DBTask[];
    },
    enabled: !!user?.id,
  });

  const handleCreatePersonalTask = async () => {
    if (!newTitle.trim()) {
      toast.error("Please provide a task title");
      return;
    }
    if (!user) {
      toast.error("You must be signed in to add tasks");
      return;
    }

    setIsSubmitting(true);
    try {
      const deadlineIso = newDeadline ? new Date(newDeadline).toISOString() : null;

      const { error } = await supabase.from("tasks").insert({
        title: newTitle.trim(),
        subject: newSubject.trim() || "Self Study",
        description: newDescription.trim() || null,
        deadline: deadlineIso,
        priority: newPriority,
        status: "todo",
        is_official: false,
        created_by: user.id,
        assigned_to: user.id,
      });

      if (error) throw error;

      toast.success("Personal task created successfully");
      setNewTitle("");
      setNewDescription("");
      setNewDeadline("");
      setShowAddDialog(false);
      refetch();
    } catch (err: any) {
      toast.error("Failed to create task: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;

      refetch();
      if (newStatus === "completed") {
        toast.success("Task completed! Keep up the momentum.");
      } else {
        toast.success(`Task status updated to ${newStatus}`);
      }
    } catch (err: any) {
      toast.error("Failed to update task: " + (err.message || "Unknown error"));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      toast.success("Task removed");
      refetch();
    } catch (err: any) {
      toast.error("Failed to delete task: " + (err.message || "Unknown error"));
    }
  };

  const formatTaskDeadline = (deadlineStr: string | null) => {
    if (!deadlineStr) return "No deadline specified";
    try {
      const d = new Date(deadlineStr);
      if (isNaN(d.getTime())) return deadlineStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return deadlineStr;
    }
  };

  const isTaskOverdue = (deadlineStr: string | null, status: string) => {
    if (!deadlineStr || status === "completed") return false;
    try {
      const d = new Date(deadlineStr);
      return !isNaN(d.getTime()) && d.getTime() < Date.now();
    } catch {
      return false;
    }
  };

  // Subjects for filtering
  const availableSubjects = Array.from(
    new Set(dbTasks.map((t) => t.subject).filter(Boolean))
  ) as string[];

  const filteredTasks = dbTasks.filter((t) => {
    const isCompleted = t.status === "completed";
    if (activeFilter === "pending" && isCompleted) return false;
    if (activeFilter === "completed" && !isCompleted) return false;

    if (selectedSubject !== "all" && t.subject !== selectedSubject) return false;

    if (sourceFilter === "official" && !t.is_official) return false;
    if (sourceFilter === "personal" && t.is_official) return false;

    return true;
  });

  const pendingTasks = dbTasks.filter((t) => t.status !== "completed");
  const completedTasks = dbTasks.filter((t) => t.status === "completed");
  const urgentTasks = pendingTasks.filter((t) => t.priority === "HIGH");

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Workload & To-Do Intelligence
              </Badge>
              <span className="text-xs text-muted-foreground">• Auto-Synchronized</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Tasks & Deadlines
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Official faculty assignments automatically appear here as tasks with tracked deadlines, alongside your personal study goals.
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
                  Personal tasks help you manage revisions and self-study. Official coursework assignments are synced automatically from your teachers.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3 text-xs">
                <div>
                  <label className="text-xs font-medium text-foreground">Task Title *</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Solve 10 questions on Normal Forms"
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Subject / Topic</label>
                    <Input
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="e.g. DBMS or Algorithms"
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
                        <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                        <SelectItem value="LOW">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Target Deadline</label>
                  <Input
                    type="datetime-local"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Notes / Study Material (Optional)</label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Reference chapters, formula sheets, key concepts..."
                    className="mt-1 text-xs min-h-[60px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreatePersonalTask}
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground font-medium"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
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
              <span className="text-xs text-muted-foreground block">Active Tasks Due</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{pendingTasks.length}</span>
                <span className="text-xs text-muted-foreground">tasks to complete</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {completedTasks.length} completed so far
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 shadow-sm">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground block">High Priority Tasks</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-destructive">{urgentTasks.length}</span>
                <span className="text-xs text-muted-foreground">urgent deadlines</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {urgentTasks.length > 0 ? "Requires immediate student focus" : "All high-priority items resolved"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-accent/10 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Assignment Sync Engine</span>
              </div>
              <p className="mt-1 text-xs text-foreground font-medium">
                Live Two-Way Deadline Tracking
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                When instructors post or reschedule assignments, deadlines update here automatically. Submitting marks them completed.
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
                    activeFilter === filter
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
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
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition",
                  sourceFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                All Sources
              </button>
              <button
                onClick={() => setSourceFilter("official")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition flex items-center gap-1",
                  sourceFilter === "official" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                <GraduationCap className="h-3 w-3 text-primary" />
                <span>Official Coursework</span>
              </button>
              <button
                onClick={() => setSourceFilter("personal")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition",
                  sourceFilter === "personal" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                Personal Study
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {availableSubjects.length > 0 && (
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-8 w-40 text-xs bg-card">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {availableSubjects.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const isCompleted = task.status === "completed";
              const isHigh = task.priority === "HIGH";
              const isOfficial = !!task.is_official;
              const overdue = isTaskOverdue(task.deadline, task.status);

              return (
                <Card
                  key={task.id}
                  className={cn(
                    "border transition-all duration-150",
                    isCompleted
                      ? "border-border/40 bg-muted/20 opacity-75"
                      : isOfficial
                      ? "border-primary/40 bg-card/90 shadow-sm"
                      : "border-border/60 bg-card/80 hover:shadow-sm"
                  )}
                >
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        className="mt-0.5 text-muted-foreground hover:text-primary transition"
                        onClick={() => {
                          const nextStatus = isCompleted ? "todo" : "completed";
                          handleStatusChange(task.id, nextStatus);
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
                          <span
                            className={cn(
                              "text-sm font-semibold text-foreground",
                              isCompleted && "line-through text-muted-foreground"
                            )}
                          >
                            {task.title}
                          </span>

                          {task.subject && (
                            <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
                              {task.subject}
                            </Badge>
                          )}

                          <Badge
                            variant={isHigh ? "destructive" : "secondary"}
                            className="text-[9px] uppercase font-bold"
                          >
                            {task.priority || "NORMAL"}
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

                          {overdue && (
                            <Badge variant="destructive" className="text-[9px] flex items-center gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              <span>Overdue</span>
                            </Badge>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                          <span
                            className={cn(
                              "flex items-center gap-1",
                              overdue && "text-destructive font-medium"
                            )}
                          >
                            <Calendar className="h-3 w-3" /> Due:{" "}
                            <strong className="text-foreground">
                              {formatTaskDeadline(task.deadline)}
                            </strong>
                          </span>

                          {task.assignment_id && (
                            <>
                              <span>•</span>
                              <button
                                type="button"
                                className="text-primary hover:underline font-medium flex items-center gap-1"
                                onClick={() => navigate("/student/assignments")}
                              >
                                <span>Go to Assignment & Submit PDF</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Select
                        value={isCompleted ? "completed" : task.status === "in_progress" ? "in_progress" : "todo"}
                        onValueChange={(val) => handleStatusChange(task.id, val)}
                      >
                        <SelectTrigger className="h-7 w-28 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>

                      {!isOfficial && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted-foreground">
                <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm font-medium text-foreground">No tasks found</p>
                <p className="text-xs text-muted-foreground">
                  All caught up! When faculty posts an assignment or you add a task, it will appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
