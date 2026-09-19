import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Subtitles,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  Filter,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  lectureService,
  LectureItem,
  RelatedQuizItem,
} from "@/services/lectureService";
import { cn } from "@/lib/utils";

export default function Lectures() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>(searchParams.get("subject") || "ALL");
  const [selectedTopic, setSelectedTopic] = useState<string>(searchParams.get("topic") || "ALL");
  const [activeWatchLecture, setActiveWatchLecture] = useState<LectureItem | null>(null);

  // 1. Fetch Student's Classroom Lectures
  const { data, isLoading } = useQuery({
    queryKey: ["student-classroom-lectures", user?.id],
    queryFn: async () => {
      if (!user?.id) return { lectures: [] };
      return await lectureService.getStudentClassroomLectures(user.id);
    },
    enabled: !!user?.id,
  });

  const lectures = data?.lectures || [];
  const classroomName = data?.classroomName || "Your Classroom";

  // Derive unique subjects from lectures
  const subjects = useMemo(() => {
    const set = new Set<string>();
    lectures.forEach((l) => set.add(l.subjectName));
    return Array.from(set);
  }, [lectures]);

  // Derive unique topics based on selected subject
  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    lectures.forEach((l) => {
      if (selectedSubject === "ALL" || l.subjectName === selectedSubject) {
        set.add(l.topic);
      }
    });
    return Array.from(set);
  }, [lectures, selectedSubject]);

  // Filter lectures
  const filteredLectures = useMemo(() => {
    return lectures.filter((lec) => {
      if (selectedSubject !== "ALL" && lec.subjectName !== selectedSubject) {
        return false;
      }
      if (selectedTopic !== "ALL" && lec.topic !== selectedTopic) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          lec.title.toLowerCase().includes(q) ||
          lec.topic.toLowerCase().includes(q) ||
          lec.subjectName.toLowerCase().includes(q) ||
          (lec.facultyName && lec.facultyName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [lectures, selectedSubject, selectedTopic, searchQuery]);

  // 2. Fetch Related Quiz when a lecture modal is opened
  const { data: relatedQuiz } = useQuery({
    queryKey: [
      "lecture-related-quiz",
      activeWatchLecture?.subjectName,
      activeWatchLecture?.topic,
      activeWatchLecture?.teachingAssignmentId,
    ],
    queryFn: async () => {
      if (!activeWatchLecture) return null;
      return await lectureService.getRelatedQuizForLecture(
        activeWatchLecture.subjectName,
        activeWatchLecture.topic,
        activeWatchLecture.teachingAssignmentId
      );
    },
    enabled: !!activeWatchLecture,
  });

  const handleOpenLecture = (lec: LectureItem) => {
    setActiveWatchLecture(lec);
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Classroom Lectures
              </Badge>
              <span className="text-xs text-muted-foreground">• Enrolled Cohort: {classroomName}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Course Video Lectures
            </h1>
            <p className="text-sm text-muted-foreground">
              Educational lectures posted by your subject faculty. Watch video explanations and reinforce your understanding with linked practice quizzes.
            </p>
          </div>
        </div>

        {/* Filters & Search Row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Subject Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={selectedSubject === "ALL" ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => {
                setSelectedSubject("ALL");
                setSelectedTopic("ALL");
              }}
            >
              All Subjects ({lectures.length})
            </Button>
            {subjects.map((sub) => {
              const count = lectures.filter((l) => l.subjectName === sub).length;
              const isSelected = selectedSubject === sub;
              return (
                <Button
                  key={sub}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => {
                    setSelectedSubject(sub);
                    setSelectedTopic("ALL");
                  }}
                >
                  {sub} ({count})
                </Button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic or faculty..."
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* Topic Filters (if subject selected or topics exist) */}
        {availableTopics.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl border border-border/40 bg-muted/20">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
              <Filter className="h-3 w-3" /> Topic:
            </span>
            <Badge
              variant={selectedTopic === "ALL" ? "default" : "outline"}
              className="cursor-pointer text-[11px]"
              onClick={() => setSelectedTopic("ALL")}
            >
              All Topics
            </Badge>
            {availableTopics.map((top) => (
              <Badge
                key={top}
                variant={selectedTopic === top ? "default" : "outline"}
                className="cursor-pointer text-[11px]"
                onClick={() => setSelectedTopic(top)}
              >
                {top}
              </Badge>
            ))}
          </div>
        )}

        {/* Lectures Content Grid */}
        {isLoading ? (
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
              No lectures available for your classroom yet
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
              When your faculty posts course lectures for {classroomName}, they will automatically appear here with integrated practice quizzes.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLectures.map((lec) => (
              <Card
                key={lec.id}
                className="flex flex-col justify-between overflow-hidden border border-border/60 bg-card/80 transition-all duration-200 hover:border-primary/40 hover:shadow-md group"
              >
                {/* Thumbnail Header */}
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  <img
                    src={lec.thumbnailUrl || `https://img.youtube.com/vi/${lec.youtubeVideoId}/hqdefault.jpg`}
                    alt={lec.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${lec.youtubeVideoId}/hqdefault.jpg`;
                    }}
                  />

                  {/* Play Overlay */}
                  <button
                    type="button"
                    onClick={() => handleOpenLecture(lec)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-90 transition hover:bg-black/20 hover:opacity-100"
                    aria-label={`Play ${lec.title}`}
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

                  {/* Subject Tag */}
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-primary/90 text-primary-foreground text-[10px] font-semibold">
                      {lec.subjectName}
                    </Badge>
                  </div>
                </div>

                {/* Card Body */}
                <CardContent className="flex flex-1 flex-col justify-between p-4 space-y-3">
                  <div className="space-y-1.5">
                    {/* Topic Badge */}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        Topic: {lec.topic}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(lec.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      className="text-sm font-bold text-foreground line-clamp-2 hover:text-primary cursor-pointer transition pt-1"
                      onClick={() => handleOpenLecture(lec)}
                    >
                      {lec.title}
                    </h3>

                    {/* Faculty Attribution */}
                    <p className="text-xs text-muted-foreground">
                      Posted by <strong className="text-foreground">{lec.facultyName || "Faculty"}</strong>
                    </p>

                    {lec.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed pt-1">
                        {lec.description}
                      </p>
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white font-medium"
                      onClick={() => handleOpenLecture(lec)}
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Watch Lecture</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Embedded Video Player Modal with Quiz Practice Checkpoint */}
        <Dialog
          open={!!activeWatchLecture}
          onOpenChange={(open) => !open && setActiveWatchLecture(null)}
        >
          <DialogContent className="max-w-3xl w-full p-0 overflow-hidden bg-card border-border/60">
            {activeWatchLecture && (
              <div className="flex flex-col">
                {/* Header */}
                <DialogHeader className="p-4 sm:p-5 border-b border-border/40 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground text-[10px]">
                      {activeWatchLecture.subjectName}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {activeWatchLecture.topic}
                    </Badge>
                  </div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground mt-1">
                    {activeWatchLecture.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                    <span>Posted by <strong className="text-foreground">{activeWatchLecture.facultyName || "Faculty"}</strong></span>
                    <span>•</span>
                    {activeWatchLecture.channelName && (
                      <>
                        <span>Channel: <strong className="text-foreground">{activeWatchLecture.channelName}</strong></span>
                        <span>•</span>
                      </>
                    )}
                    <span>Duration: {activeWatchLecture.duration || "15:00"}</span>
                  </DialogDescription>
                </DialogHeader>

                {/* Embedded YouTube Iframe Player */}
                <div className="relative aspect-video w-full bg-black">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${activeWatchLecture.youtubeVideoId}?autoplay=1&enablejsapi=1`}
                    title={activeWatchLecture.title}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>

                {/* Body Details & Practice Quiz Checkpoint */}
                <div className="p-4 sm:p-5 space-y-4 bg-card">
                  {activeWatchLecture.description && (
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground font-semibold block mb-1">
                        Lecture Overview & Study Guidance:
                      </strong>
                      {activeWatchLecture.description}
                    </div>
                  )}

                  {/* Section 13 & 14: Practice this topic Checkpoint */}
                  {relatedQuiz ? (
                    <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                            RECOMMENDED CHECKPOINT
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {relatedQuiz.durationMinutes} mins • {relatedQuiz.difficulty}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground">
                          Practice {activeWatchLecture.topic}: {relatedQuiz.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Test and reinforce your concept mastery on this topic right after watching.
                        </p>
                      </div>

                      <Button
                        size="sm"
                        className="gap-1.5 bg-primary text-primary-foreground font-semibold shrink-0"
                        onClick={() => {
                          setActiveWatchLecture(null);
                          navigate(`/student/quizzes/${relatedQuiz.id}`);
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Start Practice Quiz</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/40 bg-muted/20 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Want to test yourself? Check classroom assessments for {activeWatchLecture.subjectName}.
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setActiveWatchLecture(null);
                          navigate("/student/quizzes");
                        }}
                      >
                        Browse Quizzes
                      </Button>
                    </div>
                  )}

                  {/* Footer Links */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
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
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
}
