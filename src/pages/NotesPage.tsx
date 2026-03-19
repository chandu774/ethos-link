import { useEffect, useMemo, useState } from "react";
import { FileStack } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadNoteModal } from "@/components/notes/UploadNoteModal";
import { NotesGrid } from "@/components/notes/NotesGrid";
import { useDashboardGroups } from "@/hooks/useCollaborationGroups";
import { useNotes } from "@/hooks/useNotes";

export default function NotesPage() {
  const { data: groups = [] } = useDashboardGroups();
  const [activeGroupId, setActiveGroupId] = useState<string>("all");

  useEffect(() => {
    if (activeGroupId === "all" && groups.length > 0) {
      setActiveGroupId(groups[0].id);
    }
  }, [activeGroupId, groups]);

  const notesQuery = useNotes({
    groupId: activeGroupId === "all" ? null : activeGroupId,
  });

  const notes = useMemo(
    () => notesQuery.data?.pages.flat() || [],
    [notesQuery.data?.pages]
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card className="border-border/50 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileStack className="h-5 w-5 text-primary" />
                Notes Hub
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload and access group notes in one place.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <Select value={activeGroupId} onValueChange={setActiveGroupId}>
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
            </div>
          </CardHeader>
          <CardContent>
            <NotesGrid
              notes={notes}
              isLoading={notesQuery.isLoading}
              isFetchingNextPage={notesQuery.isFetchingNextPage}
              hasNextPage={!!notesQuery.hasNextPage}
              onLoadMore={() => notesQuery.fetchNextPage()}
              isError={notesQuery.isError}
              errorMessage={notesQuery.error instanceof Error ? notesQuery.error.message : undefined}
            />
          </CardContent>
        </Card>
      </div>

      <UploadNoteModal groups={groups.map((group) => ({ id: group.id, name: group.name }))} />
    </AppLayout>
  );
}
