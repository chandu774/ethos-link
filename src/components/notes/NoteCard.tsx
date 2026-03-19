import { Download, FileText, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { NoteItem } from "@/hooks/useNotes";

function isImage(fileRef: string) {
  return /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileRef);
}

function isPdf(fileRef: string) {
  return /\.pdf$/i.test(fileRef);
}

function getUploaderLabel(note: NoteItem) {
  return note.uploader?.name || note.uploader?.username || "Group member";
}

interface NoteCardProps {
  note: NoteItem;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: (note: NoteItem) => void;
}

export function NoteCard({ note, canDelete, isDeleting, onDelete }: NoteCardProps) {
  return (
    <Card className="border-border/50 bg-card/85 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="line-clamp-1 text-base">{note.title}</CardTitle>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{note.subject}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/70 p-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Uploaded by {getUploaderLabel(note)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {note.download_url && isImage(note.file_url) ? (
          <img
            src={note.download_url}
            alt={note.title}
            className="h-36 w-full rounded-lg border border-border/40 object-cover"
            loading="lazy"
          />
        ) : null}
        {note.download_url && isPdf(note.file_url) ? (
          <iframe
            title={note.title}
            src={note.download_url}
            className="h-36 w-full rounded-lg border border-border/40 bg-background"
          />
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {new Date(note.created_at).toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            {canDelete ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the note for everyone in the group.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(note)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            <Button asChild size="sm" variant="outline" disabled={!note.download_url}>
              <a href={note.download_url || "#"} target="_blank" rel="noreferrer">
                <Download className="mr-1 h-4 w-4" />
                Download
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
