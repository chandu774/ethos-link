import { useParams, useNavigate } from "react-router-dom";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Clock,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { lectureService } from "@/services/lectureService";

export default function LectureDetail() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const navigate = useNavigate();

  // 1. Fetch real lecture by ID
  const { data: lecture, isLoading } = useQuery({
    queryKey: ["lecture-detail", lectureId],
    queryFn: async () => {
      if (!lectureId) return null;
      return await lectureService.getLectureById(lectureId);
    },
    enabled: !!lectureId,
  });

  // 2. Fetch related practice quiz
  const { data: relatedQuiz } = useQuery({
    queryKey: [
      "lecture-detail-quiz",
      lecture?.subjectName,
      lecture?.topic,
      lecture?.teachingAssignmentId,
    ],
    queryFn: async () => {
      if (!lecture) return null;
      return await lectureService.getRelatedQuizForLecture(
        lecture.subjectName,
        lecture.topic,
        lecture.teachingAssignmentId
      );
    },
    enabled: !!lecture,
  });

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="aspect-video w-full bg-muted rounded-xl animate-pulse" />
        </div>
      </StudentLayout>
    );
  }

  if (!lecture) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto py-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Video className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Lecture Not Found</h2>
          <p className="text-xs text-muted-foreground">
            This lecture does not exist, was archived, or you do not have permission to view it.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="text-xs mt-2"
            onClick={() => navigate("/student/lectures")}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Lectures
          </Button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/student/lectures")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Lectures</span>
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {lecture.classroomName}
            </Badge>
            <Badge className="bg-primary text-primary-foreground text-xs">
              {lecture.subjectName}
            </Badge>
          </div>
        </div>

        {/* Embedded YouTube Player */}
        <Card className="overflow-hidden border-border/60 bg-black shadow-lg">
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${lecture.youtubeVideoId}?autoplay=1&enablejsapi=1`}
              title={lecture.title}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </Card>

        {/* Lecture Meta & Details */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-semibold">
                  Topic: {lecture.topic}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {lecture.duration || "15:00"}
                </span>
                {lecture.hasCaptions && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[10px]">
                    CC Available
                  </Badge>
                )}
              </div>
              <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {lecture.title}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Posted by <strong className="text-foreground">{lecture.facultyName}</strong>
                {lecture.channelName && ` • Channel: ${lecture.channelName}`} •{" "}
                {new Date(lecture.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <a
              href={lecture.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline self-start sm:self-auto"
            >
              <span>Watch on YouTube</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {lecture.description && (
            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overview & Instructions
              </h3>
              <p className="text-xs text-foreground/90 leading-relaxed pt-1">
                {lecture.description}
              </p>
            </div>
          )}

          {/* Practice Quiz Checkpoint */}
          {relatedQuiz && (
            <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                    RECOMMENDED PRACTICE CHECKPOINT
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {relatedQuiz.durationMinutes} mins • {relatedQuiz.difficulty}
                  </span>
                </div>
                <h4 className="text-base font-bold text-foreground">
                  Practice {lecture.topic}: {relatedQuiz.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Reinforce your concept mastery on this topic right after watching.
                </p>
              </div>

              <Button
                className="gap-1.5 bg-primary text-primary-foreground font-semibold shrink-0"
                onClick={() => navigate(`/student/quizzes/${relatedQuiz.id}`)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Start Practice Quiz</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
