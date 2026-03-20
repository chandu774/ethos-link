import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AssignmentChat } from "@/components/assignment-chat/AssignmentChat";
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
  useAssignmentDetails,
  useDeleteAssignment,
  useAssignmentSubmissions,
  useRemoveAssignmentAttachment,
  useRemoveSubmissionFile,
  useSubmitAssignment,
} from "@/hooks/useAssignments";
import { formatDeadline } from "@/lib/collaboration";
import { useAuth } from "@/contexts/AuthContext";
import { useGroupRole } from "@/hooks/useCollaborationGroups";
import { openStorageFile } from "@/lib/storageFiles";

export default function AssignmentDetail() {
  const { assignmentId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: assignment, isLoading } = useAssignmentDetails(assignmentId);
  const { data: submissions = [], isLoading: loadingSubmissions } = useAssignmentSubmissions(assignmentId);
  const deleteAssignment = useDeleteAssignment(assignment?.group_id || "");
  const { data: groupRole } = useGroupRole(assignment?.group_id || "");
  const submitAssignment = useSubmitAssignment(assignmentId);
  const removeAssignmentAttachment = useRemoveAssignmentAttachment();
  const removeSubmissionFile = useRemoveSubmissionFile(assignmentId);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");

  const uploadedFiles = [
    ...(assignment?.attachment_url
      ? [
          {
            id: `assignment-${assignment.id}`,
            source: "assignment" as const,
            source_id: assignment.id,
            file_url: assignment.attachment_url,
            file_name: assignment.attachment_name || "Assignment file",
            bucket: "assignment-files" as const,
            submitted_at: assignment.created_at,
            owner_name: "Assignment Creator",
            avatar_url: null as string | null,
            comment: assignment.description,
            can_delete: assignment.created_by === user?.id,
          },
        ]
      : []),
    ...submissions
      .filter((submission) => !!submission.file_url)
      .map((submission) => ({
        id: submission.id,
        source: "submission" as const,
        source_id: submission.id,
        file_url: submission.file_url!,
        file_name: submission.file_name || "Uploaded file",
        bucket: "submission-files" as const,
        submitted_at: submission.submitted_at || submission.updated_at,
        owner_name: submission.user?.name || submission.user?.username || "Group Member",
        avatar_url: submission.user?.avatar_url || null,
        comment: submission.comment,
        can_delete: submission.user_id === user?.id,
      })),
  ];
  const canDeleteAssignment =
    assignment && (assignment.created_by === user?.id || groupRole === "admin" || groupRole === "moderator");

  const openFile = async ({
    bucket,
    fileRef,
    fileName,
  }: {
    bucket: "assignment-files" | "submission-files";
    fileRef: string;
    fileName: string;
  }) => {
    try {
      await openStorageFile({
        bucket,
        fileRef,
        fileName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to open file";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!assignment) {
    return (
      <AppLayout>
        <Card className="mx-auto max-w-2xl border-border/60 bg-card/85">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Assignment not found or access denied.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/assignments")}>
              Back to Assignments
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{assignment.title}</h1>
            <p className="text-sm text-muted-foreground">
              Due {formatDeadline(assignment.deadline)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canDeleteAssignment ? (
              <Button
                variant="destructive"
                onClick={() => {
                  const confirmed = window.confirm("Delete this assignment? This will remove all submissions too.");
                  if (!confirmed) return;
                  deleteAssignment.mutate(assignment.id, {
                    onSuccess: () => navigate("/assignments"),
                  });
                }}
                disabled={deleteAssignment.isPending}
              >
                {deleteAssignment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Assignment"}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => navigate("/assignments")}>
              Back
            </Button>
          </div>
        </div>

        <Card className="border-border/60 bg-card/85">
          <CardHeader>
            <CardTitle className="text-base">Assignment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {assignment.description || "No description provided."}
            </p>
            {assignment.attachment_url ? (
              <button
                type="button"
                className="inline-block text-sm text-primary underline-offset-4 hover:underline"
                onClick={() =>
                  openFile({
                    bucket: "assignment-files",
                    fileRef: assignment.attachment_url!,
                    fileName: assignment.attachment_name || "Assignment file",
                  })
                }
              >
                {assignment.attachment_name || "Open assignment attachment"}
              </button>
            ) : null}
          </CardContent>
        </Card>

        <AssignmentChat assignmentId={assignment.id} />

        <Card className="border-border/60 bg-card/85">
          <CardHeader>
            <CardTitle className="text-base">Uploaded Files (Group Access)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingSubmissions ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : uploadedFiles.length > 0 ? (
              uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/50 p-3"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      {file.avatar_url ? (
                        <AvatarImage src={file.avatar_url} alt={file.owner_name} />
                      ) : null}
                      <AvatarFallback>
                        {file.owner_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {file.owner_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.submitted_at).toLocaleString()}
                      </p>
                      {file.comment ? (
                        <p className="mt-1 text-xs text-muted-foreground">{file.comment}</p>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-primary underline-offset-4 hover:underline"
                    onClick={() =>
                      openFile({
                        bucket: file.bucket,
                        fileRef: file.file_url,
                        fileName: file.file_name,
                      })
                    }
                  >
                    {file.file_name}
                  </button>
                  {file.can_delete ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (file.source === "assignment") {
                          removeAssignmentAttachment.mutate(file.source_id);
                          return;
                        }
                        removeSubmissionFile.mutate(file.source_id);
                      }}
                      disabled={removeAssignmentAttachment.isPending || removeSubmissionFile.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No files uploaded yet. Upload the first file above.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
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
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Upload images, PDFs, and docs so everyone in the group can access them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Add a short comment (optional)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                submitAssignment.mutate(
                  { file: selectedFile, comment },
                  {
                    onSuccess: () => {
                      setSelectedFile(null);
                      setComment("");
                      setShowUploadDialog(false);
                    },
                  }
                )
              }
              disabled={submitAssignment.isPending || !selectedFile}
            >
              {submitAssignment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
