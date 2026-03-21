import { useEffect, useMemo, useState } from "react";
import { FileStack } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadNoteModal } from "@/components/notes/UploadNoteModal";
import { NotesGrid } from "@/components/notes/NotesGrid";
import { useDashboardGroups } from "@/hooks/useCollaborationGroups";
import { useDeleteNote, useNotes, type NoteItem } from "@/hooks/useNotes";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

export default function NotesPage() {
  const { user } = useAuth();
  const { data: groups = [] } = useDashboardGroups();
  const deleteNote = useDeleteNote();
  const [activeGroupId, setActiveGroupId] = useState<string>("all");

  const notesQuery = useNotes({
    groupId: activeGroupId === "all" ? null : activeGroupId,
  });

  const notes = useMemo(
    () => notesQuery.data?.pages.flat() || [],
    [notesQuery.data?.pages]
  );

  const deletingNoteId = deleteNote.isPending ? deleteNote.variables?.id || null : null;

  const handleDeleteNote = (note: NoteItem) => {
    deleteNote.mutate(note);
  };

  return (
    <AppLayout>
      <div className="space-y-5 md:space-y-6">
        <Card className="overflow-hidden border-border/50 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_22%),linear-gradient(135deg,_hsl(var(--card)/0.96),_hsl(var(--background)/0.92))] shadow-card">
          <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                Shared knowledge
              </Badge>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <FileStack className="h-5 w-5 text-primary" />
                Notes Hub
              </CardTitle>
            </div>
            <div className="w-full sm:max-w-xs">
              <Select value={activeGroupId} onValueChange={setActiveGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All groups</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-background/50 px-4 py-10 text-center">
                <p className="text-base font-medium text-foreground">No study groups yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Join or create a group first, then your shared notes will appear here.
                </p>
              </div>
            ) : (
            <NotesGrid
              notes={notes}
              currentUserId={user?.id}
              deletingNoteId={deletingNoteId}
              onDeleteNote={handleDeleteNote}
              isLoading={notesQuery.isLoading}
              isFetchingNextPage={notesQuery.isFetchingNextPage}
              hasNextPage={!!notesQuery.hasNextPage}
              onLoadMore={() => notesQuery.fetchNextPage()}
              isError={notesQuery.isError}
              errorMessage={notesQuery.error instanceof Error ? notesQuery.error.message : undefined}
            />
            )}
          </CardContent>
        </Card>
      </div>

      <UploadNoteModal groups={groups.map((group) => ({ id: group.id, name: group.name }))} />
    </AppLayout>
  );
}
