import { Download, FileText, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  return note.uploader?.name || note.uploader?.username || "Classmate";
}

interface NoteCardProps {
  note: NoteItem;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: (note: NoteItem) => void;
}

export function NoteCard({ note, canDelete, isDeleting, onDelete }: NoteCardProps) {
  return (
    <Card className="border-border/50 bg-card/85 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <Badge variant="outline" className="text-[10px] font-semibold">
              {note.subject}
            </Badge>
            <CardTitle className="line-clamp-1 text-base">{note.title}</CardTitle>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/70 p-2 text-muted-foreground shrink-0">
            <FileText className="h-4 w-4" />
          </div>
        </div>
        {note.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {note.description}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">Uploaded by {getUploaderLabel(note)}</p>
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border/30 pt-2.5">
          <p className="text-[11px] text-muted-foreground">
            {new Date(note.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {canDelete ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={isDeleting} className="flex-1 sm:flex-none h-8 px-2.5">
                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the note for your classroom.
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
            <Button asChild size="sm" variant="outline" disabled={!note.download_url} className="flex-1 sm:flex-none h-8 text-xs">
              <a href={note.download_url || "#"} target="_blank" rel="noreferrer">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
