import { useEffect, useState } from "react";
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
import { AlertTriangle, Loader2, Plus } from "lucide-react";

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Assignments</h1>
          <p className="text-sm text-muted-foreground">
            Review and manage all assignments in one place.
          </p>
        </div>
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
            <Card className="border-dashed border-border/60 bg-card/50 md:col-span-2 xl:col-span-3">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No assignments yet. Create the first assignment above.
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
