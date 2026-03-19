import { NotesGrid } from "@/components/profile/NotesGrid";
import type { ProfileNoteItem } from "@/hooks/useProfileInsights";

interface NotesTabContentProps {
  notes: ProfileNoteItem[];
}

export function NotesTabContent({ notes }: NotesTabContentProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Uploaded Notes</h3>
      <NotesGrid notes={notes} />
    </section>
  );
}
