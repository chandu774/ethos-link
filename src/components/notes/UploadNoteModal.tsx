import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface GroupOption {
  id: string;
  name: string;
}

interface UploadNoteModalProps {
  groups: GroupOption[];
}

export function UploadNoteModal({ groups }: UploadNoteModalProps) {
  const uploadNote = useUploadNote();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [groupId, setGroupId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!groupId && groups.length) {
      setGroupId(groups[0].id);
    }
  }, [groupId, groups]);

  const reset = () => {
    setTitle("");
    setSubject("");
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <DialogTitle>Upload Note</DialogTitle>
          <DialogDescription>Share notes with your group (PDF, images, docs).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" />
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (e.g., Math)" />
          <Select value={groupId} onValueChange={setGroupId}>
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
          <div className="space-y-1">
            <Label htmlFor="note-file">File</Label>
            <Input
              id="note-file"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            {file ? <p className="text-xs text-muted-foreground">{file.name}</p> : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={uploadNote.isPending || !title.trim() || !subject.trim() || !groupId || !file}
            onClick={() => {
              if (!file) return;
              uploadNote.mutate(
                {
                  title,
                  subject,
                  groupId,
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
            {uploadNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
