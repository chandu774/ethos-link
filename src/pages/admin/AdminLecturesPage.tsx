import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Video,
  Play,
  Clock,
  Search,
  Archive,
  ArchiveRestore,
  Trash2,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lectureService, LectureItem } from "@/services/lectureService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminLecturesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeWatchLecture, setActiveWatchLecture] = useState<LectureItem | null>(null);

  const { data: lectures = [], isLoading } = useQuery({
    queryKey: ["admin-institutional-lectures"],
    queryFn: async () => {
      return await lectureService.getAllInstitutionalLectures();
    },
  });

  const handleToggleStatus = async (lec: LectureItem) => {
    const newStatus = lec.status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED";
    const ok = await lectureService.adminUpdateLectureStatus(lec.id, newStatus);
    if (ok) {
      toast.success(`Lecture status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["admin-institutional-lectures"] });
    } else {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (lec: LectureItem) => {
    if (!confirm(`Delete "${lec.title}" permanently across the institution?`)) return;
    const ok = await lectureService.adminDeleteLecture(lec.id);
    if (ok) {
      toast.success("Lecture deleted permanently");
      queryClient.invalidateQueries({ queryKey: ["admin-institutional-lectures"] });
    } else {
      toast.error("Failed to delete lecture");
    }
  };

  const filteredLectures = lectures.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      l.topic.toLowerCase().includes(q) ||
      l.subjectName.toLowerCase().includes(q) ||
      (l.facultyName && l.facultyName.toLowerCase().includes(q)) ||
      (l.classroomName && l.classroomName.toLowerCase().includes(q))
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-xs font-semibold text-rose-600 dark:text-rose-400">
                Institutional Oversight
              </Badge>
              <span className="text-xs text-muted-foreground">• Video Curriculum</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Course Video Lectures
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor, review, and manage academic YouTube lectures posted by faculty members across all institutional classrooms.
            </p>
          </div>
        </div>

        {/* Stats and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Total Lectures: {lectures.length}
            </Badge>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-xs">
              Published: {lectures.filter((l) => l.status === "PUBLISHED").length}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Archived: {lectures.filter((l) => l.status === "ARCHIVED").length}
            </Badge>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, faculty, subject..."
              className="pl-8 h-9 text-xs"
            />
          </div>
        </div>

        {/* Table View */}
        <Card className="border-border/60 bg-card/80 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Video</TableHead>
                <TableHead>Subject & Classroom</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Posted Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    Loading institutional lectures...
                  </TableCell>
                </TableRow>
              ) : filteredLectures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    No lectures found. Faculty will post lectures from their teaching assignments.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLectures.map((lec) => (
                  <TableRow key={lec.id} className="text-xs">
                    {/* Thumbnail & Title */}
                    <TableCell className="font-medium max-w-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className="relative h-12 w-20 shrink-0 overflow-hidden rounded bg-black cursor-pointer group"
                          onClick={() => setActiveWatchLecture(lec)}
                        >
                          <img
                            src={lec.thumbnailUrl || `https://img.youtube.com/vi/${lec.youtubeVideoId}/hqdefault.jpg`}
                            alt={lec.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20">
                            <Play className="h-3.5 w-3.5 fill-white text-white" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p
                            className="font-bold text-foreground truncate hover:text-primary cursor-pointer"
                            onClick={() => setActiveWatchLecture(lec)}
                          >
                            {lec.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {lec.channelName || "YouTube"} • {lec.duration}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Subject & Classroom */}
                    <TableCell>
                      <div>
                        <Badge variant="outline" className="text-[10px]">
                          {lec.subjectName}
                        </Badge>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {lec.classroomName}
                        </p>
                      </div>
                    </TableCell>

                    {/* Faculty */}
                    <TableCell>
                      <span className="font-semibold text-foreground">{lec.facultyName}</span>
                    </TableCell>

                    {/* Topic */}
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {lec.topic}
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          lec.status === "PUBLISHED"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {lec.status}
                      </Badge>
                    </TableCell>

                    {/* Posted Date */}
                    <TableCell className="text-muted-foreground text-[11px]">
                      {new Date(lec.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Watch Lecture"
                          onClick={() => setActiveWatchLecture(lec)}
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title={lec.status === "PUBLISHED" ? "Archive lecture" : "Restore lecture"}
                          onClick={() => handleToggleStatus(lec)}
                        >
                          {lec.status === "PUBLISHED" ? (
                            <Archive className="h-3.5 w-3.5" />
                          ) : (
                            <ArchiveRestore className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete lecture"
                          onClick={() => handleDelete(lec)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Watch Modal */}
        <Dialog
          open={!!activeWatchLecture}
          onOpenChange={(open) => !open && setActiveWatchLecture(null)}
        >
          <DialogContent className="max-w-3xl w-full p-0 overflow-hidden bg-card border-border/60">
            {activeWatchLecture && (
              <div>
                <DialogHeader className="p-4 sm:p-5 border-b border-border/40 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-600 text-white text-[10px]">
                      {activeWatchLecture.subjectName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {activeWatchLecture.classroomName} • Faculty: {activeWatchLecture.facultyName}
                    </span>
                  </div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground mt-1">
                    {activeWatchLecture.title}
                  </DialogTitle>
                </DialogHeader>

                <div className="relative aspect-video w-full bg-black">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${activeWatchLecture.youtubeVideoId}?autoplay=1&enablejsapi=1`}
                    title={activeWatchLecture.title}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>

                <div className="p-4 sm:p-5 flex items-center justify-between border-t border-border/40">
                  <a
                    href={activeWatchLecture.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <span>Open in YouTube</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveWatchLecture(null)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
