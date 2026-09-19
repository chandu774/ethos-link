import { useState, useEffect } from "react";
import { Loader2, Plus, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { useUploadNote } from "@/hooks/useNotes";

interface SubjectOption {
  id: string;
  name: string;
}

interface UploadNoteModalProps {
  classroomName?: string;
  classroomId?: string;
  subjects: SubjectOption[];
  disabled?: boolean;
}

export function UploadNoteModal({
  classroomName = "Your Classroom",
  classroomId,
  subjects,
  disabled = false,
}: UploadNoteModalProps) {
  const uploadNote = useUploadNote();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!subject && subjects.length > 0) {
      setSubject(subjects[0].name);
    }
  }, [subject, subjects]);

  const reset = () => {
    setTitle("");
    setDescription("");
    if (subjects.length > 0) {
      setSubject(subjects[0].name);
    } else {
      setSubject("");
    }
    setFile(null);
  };

  const hasNoClassroom = !classroomId;
  const hasNoSubjects = subjects.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          disabled={disabled || hasNoClassroom}
          title={hasNoClassroom ? "Classroom not assigned" : "Upload Note"}
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 h-12 w-12 rounded-full shadow-xl transition-transform duration-300 hover:scale-105 sm:bottom-6 sm:right-6"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Note</DialogTitle>
          <DialogDescription>
            Share lecture notes and study material with your classroom cohort.
          </DialogDescription>
        </DialogHeader>

        {hasNoClassroom ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            Your classroom has not been assigned yet. Please contact your administrator.
          </div>
        ) : (
          <div className="space-y-3.5 pt-1">
            {/* Read-Only Classroom Context (Informational Only) */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>Sharing with:</span>
              </div>
              <span className="font-semibold text-foreground">{classroomName}</span>
            </div>

            {/* Subject Selector connected to Classroom Teaching Assignments */}
            <div className="space-y-1.5">
              <Label htmlFor="note-subject" className="text-xs font-semibold">Subject</Label>
              {hasNoSubjects ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  Your subjects have not been assigned yet.
                </div>
              ) : (
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="note-subject" className="w-full">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((sub) => (
                      <SelectItem key={sub.id} value={sub.name}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="note-title" className="text-xs font-semibold">Title</Label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Normalization & 2NF Summary"
              />
            </div>

            {/* Description (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="note-description" className="text-xs font-semibold">
                Description <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="note-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key lecture points, formula sheet, or practice problems covered..."
                rows={2}
                className="resize-none text-xs"
              />
            </div>

            {/* File Attachment */}
            <div className="space-y-1.5">
              <Label htmlFor="note-file" className="text-xs font-semibold">File</Label>
              <Input
                id="note-file"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="text-xs file:text-xs"
              />
              {file ? (
                <p className="text-[11px] text-muted-foreground truncate">
                  Selected: <strong>{file.name}</strong> ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Supports PDF, DOCX, PPTX, TXT, and Images (up to 15MB)
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              uploadNote.isPending ||
              hasNoClassroom ||
              hasNoSubjects ||
              !title.trim() ||
              !subject.trim() ||
              !file
            }
            onClick={() => {
              if (!file || !classroomId) return;
              uploadNote.mutate(
                {
                  title,
                  description,
                  subject,
                  classroomId,
                  file,
                },
                {
                  onSuccess: () => {
                    reset();
                    setOpen(false);
                  },
                }
              );
            }}
          >
            {uploadNote.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Note"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
