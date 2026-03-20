import { FileStack, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/notes/NoteCard";
import type { NoteItem } from "@/hooks/useNotes";

interface NotesGridProps {
  notes: NoteItem[];
  currentUserId?: string;
  deletingNoteId?: string | null;
  onDeleteNote: (note: NoteItem) => void;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  isError: boolean;
  errorMessage?: string;
}

export function NotesGrid({
  notes,
  currentUserId,
  deletingNoteId,
  onDeleteNote,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  isError,
  errorMessage,
}: NotesGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {errorMessage || "Failed to load notes."}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-gradient-to-br from-card/80 to-background/60 py-12 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileStack className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">No notes here yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload the first note for this space to make study material easier for everyone to find.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            canDelete={currentUserId === note.user_id}
            isDeleting={deletingNoteId === note.id}
            onDelete={onDeleteNote}
          />
        ))}
      </div>

      {hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
