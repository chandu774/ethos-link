import { useMemo, useState } from "react";
import { FileStack, BookOpen, Users, Loader2, Search } from "lucide-react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UploadNoteModal } from "@/components/notes/UploadNoteModal";
import { NotesGrid } from "@/components/notes/NotesGrid";
import { FiltersBar } from "@/components/notes/FiltersBar";
import { useDeleteNote, useNotes, type NoteItem } from "@/hooks/useNotes";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { studentAnalyticsService, StudentAcademicContext } from "@/services/studentAnalyticsService";

export default function NotesPage() {
  const { user } = useAuth();
  const deleteNote = useDeleteNote();

  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");

  // Fetch logged-in student's authentic academic cohort and registered subjects
  const { data: academicContext, isLoading: contextLoading } = useQuery<StudentAcademicContext | null>({
    queryKey: ["student-academic-context", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await studentAnalyticsService.getStudentAcademicContext(user.id);
    },
    enabled: !!user?.id,
  });

  const classroomId = academicContext?.classroomId || null;
  const classroomName = academicContext?.classroomName || "Enrolled Classroom";
  const subjects = useMemo(
    () => (academicContext?.subjects || []).map((s) => ({ id: s.id, name: s.subjectName })),
    [academicContext?.subjects]
  );
  const subjectNames = useMemo(() => subjects.map((s) => s.name), [subjects]);

  // Query notes scoped strictly to the student's classroom
  const notesQuery = useNotes({
    classroomId,
    subject: activeSubject === "all" ? null : activeSubject,
  });

  const rawNotes = useMemo(
    () => notesQuery.data?.pages.flat() || [],
    [notesQuery.data?.pages]
  );

  // Client-side search and sort filtering
  const filteredNotes = useMemo(() => {
    let result = [...rawNotes];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.subject.toLowerCase().includes(q) ||
          (n.description && n.description.toLowerCase().includes(q))
      );
    }

    if (sortBy === "popular") {
      result.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [rawNotes, search, sortBy]);

  const deletingNoteId = deleteNote.isPending ? deleteNote.variables?.id || null : null;

  const handleDeleteNote = (note: NoteItem) => {
    deleteNote.mutate(note);
  };

  const hasNoClassroom = !contextLoading && !classroomId;

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header Hero */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Classroom Knowledge Base
              </Badge>
              <span className="text-xs text-muted-foreground">• Shared Peer Material</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
              <FileStack className="h-7 w-7 text-primary" />
              Notes Hub
            </h1>
            <p className="text-sm text-muted-foreground">
              {classroomId
                ? `Access and share verified study notes for ${classroomName}.`
                : "Browse classroom notes and lecture summaries."}
            </p>
          </div>

          {classroomId && (
            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Classroom:</span>
                <strong className="text-foreground font-semibold">{classroomName}</strong>
              </div>
            </div>
          )}
        </div>

        {contextLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">Detecting your classroom cohort...</p>
          </div>
        ) : hasNoClassroom ? (
          /* Honest Empty State: No classroom assigned */
          <Card className="border-dashed p-12 text-center bg-muted/20">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Classroom Not Assigned</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
              Your classroom has not been assigned yet. Please contact your administrator to be enrolled in your academic cohort.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Filters Bar: Search, Subject Dropdown, Sort */}
            <FiltersBar
              search={search}
              onSearchChange={setSearch}
              subject={activeSubject}
              onSubjectChange={setActiveSubject}
              sortBy={sortBy}
              onSortChange={setSortBy}
              subjects={subjectNames}
            />

            {/* Notes Content Grid */}
            <NotesGrid
              notes={filteredNotes}
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
          </div>
        )}
      </div>

      {/* Upload Note Modal with Automatic Classroom Detection */}
      <UploadNoteModal
        classroomName={classroomName}
        classroomId={classroomId || undefined}
        subjects={subjects}
        disabled={hasNoClassroom}
      />
    </StudentLayout>
  );
}
