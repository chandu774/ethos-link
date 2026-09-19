import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Video,
  Clock,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  FileText,
  Search,
  Volume2,
  Loader2,
  Play,
  RotateCcw,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lectureService } from "@/services/lectureService";
import {
  lectureTranscriptService,
  LectureTranscript,
} from "@/services/lectureTranscriptService";
import { useVoiceAssistant } from "@/contexts/VoiceAssistantContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { toast } from "sonner";

export default function LectureDetail() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { registerLectureHandlers, speak } = useVoiceAssistant();
  const { preferences } = useAccessibility();

  const [searchQuery, setSearchQuery] = useState("");
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 1. Fetch real lecture by ID
  const { data: lecture, isLoading } = useQuery({
    queryKey: ["lecture-detail", lectureId],
    queryFn: async () => {
      if (!lectureId) return null;
      return await lectureService.getLectureById(lectureId);
    },
    enabled: !!lectureId,
  });

  // 2. Fetch cached transcript from database
  const { data: transcript, isLoading: isTranscriptLoading } = useQuery({
    queryKey: ["lecture-transcript", lectureId],
    queryFn: async () => {
      if (!lectureId) return null;
      return await lectureTranscriptService.getTranscript(lectureId);
    },
    enabled: !!lectureId,
  });

  // 3. Fetch related practice quiz
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

  // Seek video player to specific second
  const handleSeekTo = (seconds: number) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seconds, true],
        }),
        "*"
      );
      toast.info(`Jumped to ${lectureTranscriptService.formatTime(seconds)}`);
    }
  };

  // Generate on-demand transcript
  const handleGenerateTranscript = async () => {
    if (!lecture) return;
    setIsGeneratingTranscript(true);
    toast.info("Analyzing lecture audio and generating transcript...");

    try {
      const generated = await lectureTranscriptService.generateTranscript({
        id: lecture.id,
        youtubeVideoId: lecture.youtubeVideoId,
        subjectName: lecture.subjectName,
        topic: lecture.topic,
        title: lecture.title,
      });

      queryClient.setQueryData(["lecture-transcript", lecture.id], generated);
      toast.success("Lecture transcript generated successfully!");
    } catch (err: any) {
      console.error("Transcript generation error:", err);
      toast.error(err.message || "Failed to generate lecture transcript");
    } finally {
      setIsGeneratingTranscript(false);
    }
  };

  // Register voice assistant lecture handlers
  useEffect(() => {
    registerLectureHandlers({
      generateTranscript: handleGenerateTranscript,
      readSummary: () => {
        if (transcript?.summary) {
          speak(transcript.summary);
        } else {
          speak("No transcript summary is available yet. Please generate a transcript first.");
        }
      },
      seekTo: handleSeekTo,
    });

    return () => {
      registerLectureHandlers(null);
    };
  }, [lecture, transcript, registerLectureHandlers, speak]);

  // Filter segments by search keyword
  const filteredSegments = useMemo(() => {
    if (!transcript?.transcript_segments) return [];
    if (!searchQuery.trim()) return transcript.transcript_segments;

    const q = searchQuery.toLowerCase();
    return transcript.transcript_segments.filter((seg) =>
      seg.text.toLowerCase().includes(q)
    );
  }, [transcript?.transcript_segments, searchQuery]);

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
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
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
              ref={iframeRef}
              id="synapse-lecture-iframe"
              src={`https://www.youtube-nocookie.com/embed/${lecture.youtubeVideoId}?autoplay=1&enablejsapi=1`}
              title={lecture.title}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </Card>

        {/* Lecture Meta & Details */}
        <div className="space-y-5">
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

          {/* ======================================================== */}
          {/* ACCESSIBILITY: ON-DEMAND LECTURE TRANSCRIPTS & CHAPTERS */}
          {/* ======================================================== */}
          <Card className="border border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Lecture Transcript & Chapter Navigation</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Full text accessibility transcripts with clickable timestamp bookmarks.
                  </CardDescription>
                </div>

                {!transcript && (
                  <Button
                    size="sm"
                    onClick={handleGenerateTranscript}
                    disabled={isGeneratingTranscript || isTranscriptLoading}
                    className="gap-1.5 bg-primary text-primary-foreground font-semibold text-xs shrink-0 shadow-sm"
                  >
                    {isGeneratingTranscript ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Generate Transcript</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {isTranscriptLoading ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading transcript...
                </div>
              ) : !transcript ? (
                <div className="py-8 text-center space-y-3">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="text-sm font-semibold">No Transcript Generated Yet</h4>
                    <p className="text-xs text-muted-foreground">
                      To optimize processing, transcripts are created on-demand. Click "Generate Transcript" or say "Give me the transcript" to generate full text and timestamps.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateTranscript}
                    disabled={isGeneratingTranscript}
                    className="text-xs gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Generate On-Demand</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Box */}
                  {transcript.summary && (
                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Executive Summary</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1 text-primary hover:text-primary"
                          onClick={() => speak(transcript.summary)}
                        >
                          <Volume2 className="h-3 w-3" />
                          <span>Listen</span>
                        </Button>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {transcript.summary}
                      </p>
                    </div>
                  )}

                  {/* Key Concepts */}
                  {transcript.key_concepts && transcript.key_concepts.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Key Concepts Covered
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {transcript.key_concepts.map((kc, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-[11px] px-2.5 py-0.5 font-medium"
                          >
                            {kc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search lecture transcript..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-xs h-9"
                    />
                  </div>

                  {/* Segments List */}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {filteredSegments.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        No transcript segments matched your search query.
                      </div>
                    ) : (
                      filteredSegments.map((seg, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-2.5 rounded-lg border bg-card/60 hover:bg-muted/40 transition-colors text-xs group"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSeekTo(seg.start)}
                            className="h-6 px-2 text-[10px] font-mono shrink-0 gap-1 bg-background hover:bg-primary hover:text-primary-foreground border-primary/30"
                            title={`Jump video to ${lectureTranscriptService.formatTime(seg.start)}`}
                          >
                            <Play className="h-2.5 w-2.5 fill-current" />
                            <span>{lectureTranscriptService.formatTime(seg.start)}</span>
                          </Button>
                          <p className="text-foreground/90 leading-relaxed pt-0.5">
                            {seg.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
