import { useState, useEffect } from "react";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  Plus,
  Play,
  Clock,
  Subtitles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  Loader2,
  BookOpen,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  lectureService,
  LectureItem,
  TeachingAssignmentOption,
} from "@/services/lectureService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FacultyLecturesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeWatchLecture, setActiveWatchLecture] = useState<LectureItem | null>(null);
  const [editingLecture, setEditingLecture] = useState<LectureItem | null>(null);

  // Form State for Add Lecture
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [topic, setTopic] = useState("");
  const [lectureTitle, setLectureTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [metaPreview, setMetaPreview] = useState<{
    videoId: string;
    title: string;
    channelName: string;
    thumbnailUrl: string;
    duration: string;
    hasCaptions: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter
  const [selectedFilterAssignment, setSelectedFilterAssignment] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch Faculty's Authorized Teaching Assignments
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["faculty-teaching-assignments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await lectureService.getFacultyTeachingAssignments(user.id);
    },
    enabled: !!user?.id,
  });

  // 2. Fetch Faculty's Posted Lectures
  const { data: lectures = [], isLoading: isLoadingLectures } = useQuery({
    queryKey: ["faculty-lectures", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await lectureService.getFacultyLectures(user.id);
    },
    enabled: !!user?.id,
  });

  // Automatically select first assignment when opened
  useEffect(() => {
    if (assignments.length > 0 && !selectedAssignmentId) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [assignments, selectedAssignmentId]);

  // Handle YouTube URL blur or change: fetch metadata preview
  const handleUrlBlur = async () => {
    const trimmed = youtubeUrl.trim();
    if (!trimmed) {
      setMetaPreview(null);
      return;
    }

    const videoId = lectureService.extractYouTubeVideoId(trimmed);
    if (!videoId) {
      toast.error("Please enter a valid YouTube URL (e.g. youtube.com/watch?v=... or youtu.be/...)");
      setMetaPreview(null);
      return;
    }

    setIsFetchingMeta(true);
    try {
      const meta = await lectureService.fetchYouTubeMetadata(trimmed, lectureTitle);
      if (meta.success && meta.videoId) {
        setMetaPreview({
          videoId: meta.videoId,
          title: meta.title || "YouTube Lecture",
          channelName: meta.channelName || "YouTube Channel",
          thumbnailUrl: meta.thumbnailUrl || `https://img.youtube.com/vi/${meta.videoId}/hqdefault.jpg`,
          duration: meta.duration || "15:00",
          hasCaptions: meta.hasCaptions || false,
        });

        // Prefill title if empty
        if (!lectureTitle.trim() && meta.title) {
          setLectureTitle(meta.title);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch preview metadata:", err);
    } finally {
      setIsFetchingMeta(false);
    }
  };

  // Submit Add Lecture
  const handlePostLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!selectedAssignmentId) {
      toast.error("Please select a teaching assignment (Subject & Classroom).");
      return;
    }
    if (!topic.trim()) {
      toast.error("Please enter a topic name.");
      return;
    }
    if (!youtubeUrl.trim()) {
      toast.error("Please enter a valid YouTube video URL.");
      return;
    }

    const videoId = lectureService.extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      toast.error("Invalid YouTube URL. Please enter a valid YouTube link.");
      return;
    }

    const assignment = assignments.find((a) => a.id === selectedAssignmentId);
    if (!assignment) {
      toast.error("Selected teaching assignment is unauthorized or invalid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await lectureService.createFacultyLecture({
        teachingAssignmentId: assignment.id,
        facultyId: user.id,
        classroomId: assignment.classroomId,
        subjectName: assignment.subjectName,
        subjectCode: assignment.subjectCode,
        topic: topic.trim(),
        title: lectureTitle.trim() || metaPreview?.title || `${assignment.subjectName}: ${topic.trim()}`,
        description: description.trim() || null,
        youtubeUrl: youtubeUrl.trim(),
      });

      if (res.error) {
        toast.error(`Could not post lecture: ${res.error}`);
      } else {
        toast.success(`Lecture posted successfully to ${assignment.classroomName}!`);
        queryClient.invalidateQueries({ queryKey: ["faculty-lectures", user.id] });
        setIsAddOpen(false);
        // Reset form
        setTopic("");
        setLectureTitle("");
        setYoutubeUrl("");
        setDescription("");
        setMetaPreview(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to post lecture");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive / Unarchive
  const handleToggleArchive = async (lec: LectureItem) => {
    if (!user?.id) return;
    const newStatus = lec.status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED";
    const res = await lectureService.archiveFacultyLecture(lec.id, user.id, newStatus);
    if (res.success) {
      toast.success(
        newStatus === "ARCHIVED"
          ? "Lecture archived (hidden from students)."
          : "Lecture restored to PUBLISHED."
      );
      queryClient.invalidateQueries({ queryKey: ["faculty-lectures", user.id] });
    } else {
      toast.error(res.error || "Failed to update lecture status");
    }
  };

  // Delete
  const handleDeleteLecture = async (lec: LectureItem) => {
    if (!user?.id) return;
    if (!confirm(`Delete "${lec.title}" permanently?`)) return;

    const res = await lectureService.deleteFacultyLecture(lec.id, user.id);
    if (res.success) {
      toast.success("Lecture deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["faculty-lectures", user.id] });
    } else {
      toast.error(res.error || "Failed to delete lecture");
    }
  };

  // Edit Submit
  const handleUpdateLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !editingLecture) return;

    const res = await lectureService.updateFacultyLecture(editingLecture.id, user.id, {
      title: editingLecture.title,
      topic: editingLecture.topic,
      description: editingLecture.description,
    });

    if (res.success) {
      toast.success("Lecture details updated.");
      queryClient.invalidateQueries({ queryKey: ["faculty-lectures", user.id] });
      setEditingLecture(null);
    } else {
      toast.error(res.error || "Failed to update lecture");
    }
  };

  // Filtered lectures
  const filteredLectures = lectures.filter((lec) => {
    if (selectedFilterAssignment !== "ALL" && lec.teachingAssignmentId !== selectedFilterAssignment) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        lec.title.toLowerCase().includes(q) ||
        lec.topic.toLowerCase().includes(q) ||
        lec.subjectName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <FacultyLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Lectures
            </h1>
          </div>

          <Button
            onClick={() => setIsAddOpen(true)}
            className="gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Lecture</span>
          </Button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Classroom & Subject:</span>
            <Select
              value={selectedFilterAssignment}
              onValueChange={setSelectedFilterAssignment}
            >
              <SelectTrigger className="w-[280px] h-9 text-xs">
                <SelectValue placeholder="All Teaching Assignments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Teaching Assignments ({lectures.length})</SelectItem>
                {assignments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.subjectName} • {a.classroomName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic or title..."
              className="pl-8 h-9 text-xs"
            />
          </div>
        </div>

        {/* Lecture Grid */}
        {isLoadingLectures ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-border/50 bg-card/60 p-4 space-y-3">
                <div className="aspect-video w-full rounded-lg bg-muted" />
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : filteredLectures.length === 0 ? (
          <Card className="border-border/60 bg-card/50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Video className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-foreground">
              No lectures posted yet
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              {assignments.length === 0
                ? "You do not have any teaching assignments assigned by an administrator yet."
                : "You haven't posted any lectures yet. Click '+ Add Lecture' to paste a YouTube link and share it with your assigned classroom."}
            </p>
            {assignments.length > 0 && (
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() => setIsAddOpen(true)}
                  className="text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add First Lecture</span>
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLectures.map((lec) => {
              const isArchived = lec.status === "ARCHIVED";

              return (
                <Card
                  key={lec.id}
                  className={cn(
                    "flex flex-col justify-between overflow-hidden border transition duration-200 hover:shadow-md",
                    isArchived ? "opacity-60 border-dashed border-border" : "border-border/60 bg-card/80"
                  )}
                >
                  {/* Thumbnail and badges */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black">
                    <img
                      src={lec.thumbnailUrl || `https://img.youtube.com/vi/${lec.youtubeVideoId}/hqdefault.jpg`}
                      alt={lec.title}
                      className="h-full w-full object-cover transition duration-300 hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${lec.youtubeVideoId}/hqdefault.jpg`;
                      }}
                    />

                    {/* Play Button Overlay */}
                    <button
                      type="button"
                      onClick={() => setActiveWatchLecture(lec)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-80 transition hover:opacity-100 group"
                      aria-label="Play video"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition group-hover:scale-110">
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      </div>
                    </button>

                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                      <Clock className="h-3 w-3" />
                      <span>{lec.duration || "15:00"}</span>
                    </div>

                    {/* Captions Badge */}
                    {lec.hasCaptions && (
                      <div className="absolute top-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 backdrop-blur-sm">
                        CC
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge
                        variant={isArchived ? "secondary" : "default"}
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          !isArchived && "bg-emerald-600 hover:bg-emerald-600 text-white"
                        )}
                      >
                        {lec.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Body Content */}
                  <CardContent className="flex flex-1 flex-col justify-between p-4 space-y-3">
                    <div className="space-y-1.5">
                      {/* Subject & Classroom */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {lec.subjectName}
                        </Badge>
                        <span className="font-semibold text-foreground text-[11px]">
                          {lec.classroomName}
                        </span>
                      </div>

                      {/* Topic */}
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Topic: {lec.topic}
                      </p>

                      {/* Lecture Title */}
                      <h3
                        className="text-sm font-bold text-foreground line-clamp-2 hover:text-primary cursor-pointer"
                        onClick={() => setActiveWatchLecture(lec)}
                      >
                        {lec.title}
                      </h3>

                      {lec.channelName && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span>Channel:</span>
                          <strong className="text-foreground">{lec.channelName}</strong>
                        </p>
                      )}

                      {lec.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed pt-1">
                          {lec.description}
                        </p>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        Posted {new Date(lec.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit lecture"
                          onClick={() => setEditingLecture(lec)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title={isArchived ? "Restore to published" : "Archive lecture"}
                          onClick={() => handleToggleArchive(lec)}
                        >
                          {isArchived ? (
                            <ArchiveRestore className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Archive className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete lecture"
                          onClick={() => handleDeleteLecture(lec)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal Dialog: + Add Lecture */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                  New Resource
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold">Post YouTube Lecture</DialogTitle>
              <DialogDescription className="text-xs">
                Select your assigned Subject and Classroom, paste a YouTube link, and share with enrolled students.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePostLecture} className="space-y-4 pt-2">
              {/* Teaching Assignment Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Teaching Assignment (Subject & Classroom) *
                </label>
                <Select
                  value={selectedAssignmentId}
                  onValueChange={setSelectedAssignmentId}
                  disabled={assignments.length === 0}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Teaching Assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.subjectName} ({a.subjectCode}) → {a.classroomName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignments.length === 0 && (
                  <p className="text-[11px] text-destructive">
                    No teaching assignments found. An administrator must assign you to a classroom first.
                  </p>
                )}
              </div>

              {/* Topic */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Curriculum Topic *
                </label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Normalization, Process Scheduling, Binary Search Trees"
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* YouTube Video URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  YouTube Video URL *
                </label>
                <div className="relative">
                  <Input
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    onBlur={handleUrlBlur}
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    className="h-9 text-xs pr-8"
                    required
                  />
                  {isFetchingMeta && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Supports standard watch, youtu.be, or embed formats. Video metadata will be fetched automatically.
                </p>
              </div>

              {/* Preview Card if metadata fetched */}
              {metaPreview && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex gap-3 items-center">
                  <img
                    src={metaPreview.thumbnailUrl}
                    alt={metaPreview.title}
                    className="h-16 w-24 object-cover rounded-lg shrink-0 bg-black"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-bold text-foreground truncate">
                      {metaPreview.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {metaPreview.channelName} • {metaPreview.duration}
                      {metaPreview.hasCaptions && " • CC available"}
                    </p>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[10px]">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Valid YouTube Video
                    </Badge>
                  </div>
                </div>
              )}

              {/* Custom Lecture Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Lecture Title (Customizable) *
                </label>
                <Input
                  value={lectureTitle}
                  onChange={(e) => setLectureTitle(e.target.value)}
                  placeholder="e.g. Database Normalization Explained (1NF to BCNF)"
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Description / Study Guidance (Optional)
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key takeaways, relevant textbook sections, or concepts to focus on..."
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || assignments.length === 0}
                  className="bg-primary text-primary-foreground font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Post Lecture"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Dialog: Embedded Video Player */}
        <Dialog
          open={!!activeWatchLecture}
          onOpenChange={(open) => !open && setActiveWatchLecture(null)}
        >
          <DialogContent className="max-w-3xl w-full p-0 overflow-hidden bg-card border-border/60">
            {activeWatchLecture && (
              <div>
                <DialogHeader className="p-4 sm:p-5 border-b border-border/40 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-600 text-white text-[10px]">
                      {activeWatchLecture.subjectName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {activeWatchLecture.classroomName} • Topic: {activeWatchLecture.topic}
                    </span>
                  </div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground mt-1">
                    {activeWatchLecture.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
                    {activeWatchLecture.channelName && (
                      <span>Channel: <strong className="text-foreground">{activeWatchLecture.channelName}</strong></span>
                    )}
                    <span>• Duration: {activeWatchLecture.duration}</span>
                  </DialogDescription>
                </DialogHeader>

                {/* Video Player */}
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

        {/* Modal Dialog: Edit Lecture */}
        <Dialog
          open={!!editingLecture}
          onOpenChange={(open) => !open && setEditingLecture(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Edit Lecture Details</DialogTitle>
              <DialogDescription className="text-xs">
                Update the title, curriculum topic, or study guidance.
              </DialogDescription>
            </DialogHeader>

            {editingLecture && (
              <form onSubmit={handleUpdateLecture} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Lecture Title</label>
                  <Input
                    value={editingLecture.title}
                    onChange={(e) => setEditingLecture({ ...editingLecture, title: e.target.value })}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Topic</label>
                  <Input
                    value={editingLecture.topic}
                    onChange={(e) => setEditingLecture({ ...editingLecture, topic: e.target.value })}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Description</label>
                  <Textarea
                    value={editingLecture.description || ""}
                    onChange={(e) => setEditingLecture({ ...editingLecture, description: e.target.value })}
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingLecture(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FacultyLayout>
  );
}
