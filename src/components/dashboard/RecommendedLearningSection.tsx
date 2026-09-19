import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  youtubeRecommendationService,
  LearningRecommendationItem,
} from "@/services/youtubeRecommendationService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  RotateCw,
  BookOpen,
  Subtitles,
  ArrowRight,
  AlertCircle,
  Video,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function RecommendedLearningSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [requireCaptions, setRequireCaptions] = useState(false);
  const [activeVideo, setActiveVideo] = useState<LearningRecommendationItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real personalized recommendations
  const {
    data: recommendations = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["student-youtube-recommendations", user?.id, requireCaptions],
    queryFn: async () => {
      if (!user?.id) return [];
      return await youtubeRecommendationService.getPersonalizedRecommendations(
        user.id,
        requireCaptions,
        false
      );
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const handleForceRefresh = async () => {
    if (!user?.id) return;
    setIsRefreshing(true);
    try {
      const refreshed = await youtubeRecommendationService.getPersonalizedRecommendations(
        user.id,
        requireCaptions,
        true
      );
      queryClient.setQueryData(
        ["student-youtube-recommendations", user?.id, requireCaptions],
        refreshed
      );
      toast.success("Learning recommendations refreshed with latest quiz and attendance signals.");
    } catch (err) {
      toast.error("Failed to refresh recommendations.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenVideo = (rec: LearningRecommendationItem) => {
    setActiveVideo(rec);
    if (user?.id) {
      // Track engagement status
      youtubeRecommendationService.trackVideoOpened(user.id, rec.id, rec.videoId);
      youtubeRecommendationService.trackVideoStarted(user.id, rec.id, rec.videoId);
    }
  };

  const handleMarkCompleted = async (rec: LearningRecommendationItem) => {
    if (!user?.id) return;
    await youtubeRecommendationService.trackVideoCompleted(user.id, rec.id, rec.videoId);
    // Optimistically update engagement status in UI
    queryClient.setQueryData<LearningRecommendationItem[]>(
      ["student-youtube-recommendations", user?.id, requireCaptions],
      (prev) =>
        (prev || []).map((item) =>
          item.id === rec.id ? { ...item, engagementStatus: "completed" } : item
        )
    );
    if (activeVideo?.id === rec.id) {
      setActiveVideo({ ...activeVideo, engagementStatus: "completed" });
    }
    toast.success("Marked as watched! Reinforce your learning by taking a practice quiz.");
  };

  const handlePracticeQuiz = (rec: LearningRecommendationItem) => {
    setActiveVideo(null);
    const searchParams = new URLSearchParams();
    if (rec.topic) searchParams.set("topic", rec.topic);
    if (rec.concept) searchParams.set("concept", rec.concept);
    navigate(`/student/quizzes?${searchParams.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="border-0 bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-semibold flex items-center gap-1">
              <Video className="h-3 w-3" />
              RECOMMENDED VIDEO LECTURES
            </Badge>
            <span className="text-xs text-muted-foreground">• Verified Academic Channels</span>
          </div>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Targeted Learning Catch-Up
          </h2>
          <p className="text-xs text-muted-foreground">
            Personalized video recommendations automatically triggered by quiz diagnostics & missed lectures.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={requireCaptions ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setRequireCaptions(!requireCaptions)}
          >
            <Subtitles className="h-3.5 w-3.5" />
            <span>{requireCaptions ? "Captions (CC) Only: ON" : "Captions (CC)"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={isRefreshing || isLoading}
            onClick={handleForceRefresh}
          >
            <RotateCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="border-border/50 bg-card/60 p-4 space-y-3">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <Card className="border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-foreground">
            Your Learning Progress is on Track!
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
            Synapse detected no critical weak concepts (accuracy &lt; 65%) or unrecovered missed lectures.
            Personalized educational videos will automatically appear here if gaps are identified in upcoming quizzes.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => navigate("/student/quizzes")}
            >
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Browse Quizzes
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {recommendations.map((rec) => {
            const isCompleted = rec.engagementStatus === "completed";
            const isOpened = rec.engagementStatus === "opened" || rec.engagementStatus === "started";

            return (
              <Card
                key={rec.id}
                className={cn(
                  "relative flex flex-col justify-between overflow-hidden border transition-all duration-200 hover:shadow-md",
                  isCompleted
                    ? "border-emerald-500/30 bg-card/50"
                    : "border-border/60 bg-card/80 shadow-sm"
                )}
              >
                {/* Thumbnail Header with Duration & CC */}
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  <img
                    src={rec.thumbnailUrl || `https://img.youtube.com/vi/${rec.videoId}/hqdefault.jpg`}
                    alt={rec.videoTitle}
                    className="h-full w-full object-cover transition duration-300 hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to standard YouTube thumbnail if custom URL fails
                      (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${rec.videoId}/hqdefault.jpg`;
                    }}
                  />

                  {/* Play Overlay Button */}
                  <button
                    onClick={() => handleOpenVideo(rec)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-90 transition hover:bg-black/20 hover:opacity-100 group"
                    aria-label={`Play ${rec.videoTitle}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition group-hover:scale-110">
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </div>
                  </button>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                    <Clock className="h-3 w-3" />
                    <span>{rec.duration}</span>
                  </div>

                  {/* Captions Badge */}
                  {rec.hasCaptions && (
                    <div className="absolute top-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 backdrop-blur-sm">
                      CC
                    </div>
                  )}

                  {/* Type Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge
                      className={cn(
                        "text-[10px] font-bold uppercase",
                        rec.recommendationType === "MISSED_CLASS"
                          ? "bg-amber-500 text-amber-950 hover:bg-amber-500"
                          : "bg-indigo-600 text-white hover:bg-indigo-600"
                      )}
                    >
                      {rec.recommendationType === "MISSED_CLASS"
                        ? "Missed Lecture Catch-Up"
                        : "Weak Concept Priority"}
                    </Badge>
                  </div>
                </div>

                {/* Card Body */}
                <CardContent className="flex flex-1 flex-col justify-between p-4">
                  <div className="space-y-2">
                    {/* Tags: Subject • Topic • Concept */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] bg-muted/30">
                        {rec.subjectName}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {rec.topic}
                      </Badge>
                      {rec.concept && (
                        <Badge variant="default" className="text-[10px] bg-primary/90">
                          {rec.concept}
                        </Badge>
                      )}
                    </div>

                    {/* Video Title */}
                    <h3
                      className="text-sm font-semibold text-foreground line-clamp-2 hover:text-primary cursor-pointer transition"
                      onClick={() => handleOpenVideo(rec)}
                    >
                      {rec.videoTitle}
                    </h3>

                    {/* Channel Name */}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="font-medium text-foreground">{rec.channelName}</span>
                      <CheckCircle2 className="h-3 w-3 text-blue-500 fill-blue-500/20" />
                    </p>

                    {/* Transparent Reason Why Recommended */}
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5 text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground font-medium block mb-0.5">
                        Diagnostic Rationale:
                      </strong>
                      {rec.reason}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isCompleted ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] font-semibold">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Watched
                        </Badge>
                      ) : isOpened ? (
                        <Badge variant="secondary" className="text-[10px]">
                          <Eye className="mr-1 h-3 w-3" /> In Progress
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Recommended
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs gap-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleOpenVideo(rec)}
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Watch</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handlePracticeQuiz(rec)}
                      >
                        <span>Practice</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Embedded YouTube Player Modal Dialog */}
      <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="max-w-3xl w-full p-0 overflow-hidden bg-card border-border/60">
          {activeVideo && (
            <div className="flex flex-col">
              <DialogHeader className="p-4 sm:p-5 border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-500 text-[10px]">
                    Academic Video Lecture
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {activeVideo.subjectName} • {activeVideo.topic} {activeVideo.concept ? `• ${activeVideo.concept}` : ""}
                  </span>
                </div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground mt-1">
                  {activeVideo.videoTitle}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Channel: <strong className="text-foreground">{activeVideo.channelName}</strong></span>
                  <span>•</span>
                  <span>Duration: {activeVideo.duration}</span>
                </DialogDescription>
              </DialogHeader>

              {/* YouTube Iframe Player */}
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?autoplay=1&enablejsapi=1`}
                  title={activeVideo.videoTitle}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Reason & Action Controls beneath video */}
              <div className="p-4 sm:p-5 space-y-4 bg-card">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                  <span className="font-semibold text-primary block mb-0.5">
                    Why Synapse Recommended This:
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {activeVideo.reason}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                  <a
                    href={activeVideo.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <span>Open in YouTube</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <div className="flex items-center gap-2">
                    {activeVideo.engagementStatus !== "completed" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        onClick={() => handleMarkCompleted(activeVideo)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Mark as Watched</span>
                      </Button>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-xs">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Watched
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      className="text-xs gap-1.5 bg-primary text-primary-foreground font-medium"
                      onClick={() => handlePracticeQuiz(activeVideo)}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Take Practice Quiz</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
