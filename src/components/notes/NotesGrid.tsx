import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/notes/NoteCard";
import type { NoteItem } from "@/hooks/useNotes";

interface NotesGridProps {
  notes: NoteItem[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  isError: boolean;
  errorMessage?: string;
}

export function NotesGrid({
  notes,
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
      <div className="rounded-xl border border-dashed border-border/60 bg-card/40 py-12 text-center">
        <p className="text-sm text-muted-foreground">No notes yet. Upload the first one with the + button.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} />
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
