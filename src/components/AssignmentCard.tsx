import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDeadline } from "@/lib/collaboration";
import type { CollaborationAssignment } from "@/lib/collaboration";
import { openStorageFile } from "@/lib/storageFiles";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export function AssignmentCard({
  assignment,
  onSubmit,
}: {
  assignment: CollaborationAssignment;
  onSubmit?: (assignment: CollaborationAssignment) => void;
}) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer border-border/60 bg-[linear-gradient(180deg,_hsl(var(--card)/0.96),_hsl(var(--background)/0.92))] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-card"
      onClick={() => navigate(`/assignments/${assignment.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/assignments/${assignment.id}`);
        }
      }}
    >
      <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div className="min-w-0">
          <CardTitle className="text-base">{assignment.title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{formatDeadline(assignment.deadline)}</p>
        </div>
        <Badge variant="secondary">Assignment</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {assignment.description || "No description provided."}
        </p>
        {assignment.attachment_url && (
          <button
            type="button"
            className="block text-sm text-primary underline-offset-4 hover:underline"
            onClick={async (event) => {
              event.stopPropagation();
              try {
                await openStorageFile({
                  bucket: "assignment-files",
                  fileRef: assignment.attachment_url,
                  fileName: assignment.attachment_name,
                });
              } catch (error) {
                const message = error instanceof Error ? error.message : "Unable to open attachment";
                toast.error(message);
              }
            }}
          >
            {assignment.attachment_name || "Open attachment"}
          </button>
        )}
        {onSubmit && (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onSubmit(assignment);
            }}
          >
            Submit work
          </Button>
        )}
        {!onSubmit ? (
          <div className="flex items-center text-sm font-medium text-primary">
            Open details
            <ArrowRight className="ml-2 h-4 w-4" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
