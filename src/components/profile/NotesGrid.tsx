import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProfileNoteItem } from "@/hooks/useProfileInsights";

interface NotesGridProps {
  notes: ProfileNoteItem[];
}

const PAGE_SIZE = 6;

export function NotesGrid({ notes }: NotesGridProps) {
  const [page, setPage] = useState(1);
  const visible = useMemo(() => notes.slice(0, page * PAGE_SIZE), [notes, page]);

  if (!notes.length) {
    return (
      <div className="rounded-xl bg-card/80 p-8 text-center text-sm text-muted-foreground shadow-sm">
        No notes uploaded yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((note) => (
          <article key={note.id} className="rounded-xl bg-card/90 p-4 shadow-sm transition-transform hover:-translate-y-0.5">
            <p className="font-medium text-foreground">{note.title}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{note.subject}</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{new Date(note.created_at).toLocaleDateString()}</p>
              <Button asChild size="sm" variant="outline" disabled={!note.download_url}>
                <a href={note.download_url || "#"} target="_blank" rel="noreferrer">
                  <Download className="mr-1 h-4 w-4" />
                  Download
                </a>
              </Button>
            </div>
          </article>
        ))}
      </div>

      {visible.length < notes.length ? (
        <Button variant="outline" onClick={() => setPage((prev) => prev + 1)}>
          Load More
        </Button>
      ) : null}
    </div>
  );
}
