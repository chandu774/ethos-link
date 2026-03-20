import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AssignmentCard } from "@/components/AssignmentCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAssignments, useCreateAssignment } from "@/hooks/useAssignments";
import { useDashboardGroups } from "@/hooks/useCollaborationGroups";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, CalendarClock, FileText, Loader2, Plus, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AssignmentsPage() {
  const { data: groups = [] } = useDashboardGroups();
  const createAssignment = useCreateAssignment();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);

  useEffect(() => {
    if (!newGroupId && groups.length > 0) {
      setNewGroupId(groups[0].id);
    }
  }, [groups, newGroupId]);

  const {
    data: assignments = [],
    error: assignmentsError,
    isError: hasAssignmentsError,
  } = useAssignments(null);

  const assignmentsTableMissing =
    hasAssignmentsError &&
    (assignmentsError as Error & { code?: string })?.code === "42P01";

  const assignmentsByGroup = useMemo(() => {
    const groupMap = new Map(groups.map((group) => [group.id, group.name]));
    return assignments.reduce<Record<string, number>>((acc, assignment) => {
      const label = groupMap.get(assignment.group_id) || "Ungrouped";
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});
  }, [assignments, groups]);

  return (
    <AppLayout>
      <div className="space-y-5 md:space-y-6">
        <Card className="overflow-hidden border-border/50 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_hsl(var(--accent)/0.12),_transparent_28%),linear-gradient(135deg,_hsl(var(--card)/0.96),_hsl(var(--background)/0.92))] shadow-card">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                  Deadline center
                </Badge>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Assignments</h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    Keep deadlines, submission materials, and assignment context in one place instead of scattered
                    across chat and files.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-semibold text-foreground">{assignments.length}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Assignments</p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-semibold text-foreground">{groups.length}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Active groups</p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-semibold text-foreground">{Object.keys(assignmentsByGroup).length}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Groups with work</p>
                </div>
              </div>
            </div>

            {Object.keys(assignmentsByGroup).length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {Object.entries(assignmentsByGroup).map(([groupName, count]) => (
                  <div
                    key={groupName}
                    className="rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">{groupName}</span>
                    <span className="ml-2">{count} item{count === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {assignmentsTableMissing && (
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-medium">Assignments table not created in Supabase.</p>
              </div>
              <p className="text-xs text-amber-100/90">
                Run migrations from project root:
                <span className="ml-1 rounded bg-black/20 px-2 py-0.5 font-mono">supabase db push</span>
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))}
          {assignments.length === 0 && (
            <Card className="border-dashed border-border/60 bg-gradient-to-br from-card/80 to-background/60 md:col-span-2 xl:col-span-3">
              <CardContent className="py-12 text-center">
                <div className="mx-auto max-w-md space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">No assignments yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create the first assignment to give your group a shared deadline, description, and attachment space.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 h-12 w-12 rounded-full shadow-xl transition-transform duration-300 hover:scale-105 sm:bottom-6 sm:right-6"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Assignment</DialogTitle>
              <DialogDescription>Create a new assignment for any group.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Assignment title"
              />
              <Select value={newGroupId} onValueChange={setNewGroupId}>
                <SelectTrigger>
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
              <Input
                type="datetime-local"
                value={newDeadline}
                onChange={(event) => setNewDeadline(event.target.value)}
              />
              <Textarea
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                placeholder="Description (optional)"
              />
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
                onChange={(event) => setNewFile(event.target.files?.[0] || null)}
              />
              {newFile ? (
                <p className="text-xs text-muted-foreground">Selected file: {newFile.name}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  createAssignment.mutate(
                    {
                      groupId: newGroupId,
                      title: newTitle,
                      description: newDescription,
                      deadline: new Date(newDeadline).toISOString(),
                      file: newFile,
                    },
                    {
                      onSuccess: () => {
                        setShowCreateDialog(false);
                        setNewTitle("");
                        setNewDescription("");
                        setNewDeadline("");
                        setNewGroupId(groups[0]?.id || "");
                        setNewFile(null);
                      },
                    }
                  );
                }}
                disabled={createAssignment.isPending || !newTitle.trim() || !newDeadline || !newGroupId}
              >
                {createAssignment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Assignment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
