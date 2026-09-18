import { useState, useRef, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Video,
  Play,
  Pause,
  Clock,
  Sparkles,
  Subtitles,
  Volume2,
  FileCheck2,
  Search,
  BookOpen,
  ArrowLeft,
  Share2,
  CheckCircle2,
  HelpCircle,
  Maximize2,
} from "lucide-react";
import { DEMO_LECTURES, DemoLecture } from "@/data/demoData";
import { useSynapse } from "@/hooks/useSynapse";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LectureDetail() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const synapse = useSynapse();

  const lecture = DEMO_LECTURES.find((l) => l.id === lectureId) || DEMO_LECTURES[0];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const signVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSignLanguage, setShowSignLanguage] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"chapters" | "transcript" | "summary">("chapters");
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);

  // Jump to URL timestamp parameter ?t=seconds if given
  useEffect(() => {
    const tParam = searchParams.get("t");
    if (tParam && videoRef.current) {
      const sec = Number(tParam);
      if (!isNaN(sec)) {
        videoRef.current.currentTime = sec;
        setCurrentTime(sec);
        if (signVideoRef.current) signVideoRef.current.currentTime = sec;
        toast.info(`Jumped to lecture segment at ${sec}s`);
      }
    }
  }, [searchParams]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      setCurrentTime(t);
      // Sync sign video if open
      if (signVideoRef.current && Math.abs(signVideoRef.current.currentTime - t) > 0.5) {
        signVideoRef.current.currentTime = t;
      }
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (signVideoRef.current) signVideoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      if (signVideoRef.current) signVideoRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      if (signVideoRef.current) signVideoRef.current.currentTime = seconds;
      if (!isPlaying) {
        videoRef.current.play();
        if (signVideoRef.current) signVideoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Find active transcript line
  const activeTranscriptItem = lecture.transcript.slice().reverse().find((item) => currentTime >= item.seconds);

  const filteredTranscript = lecture.transcript.filter((item) =>
    item.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
    item.speaker.toLowerCase().includes(transcriptSearch.toLowerCase())
  );

  const handleSpeakSummary = () => {
    if (isSpeakingSummary) {
      synapse.stopSpeaking();
      setIsSpeakingSummary(false);
      return;
    }
    setIsSpeakingSummary(true);
    synapse.speakText(lecture.summary, () => setIsSpeakingSummary(false));
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Top Back & Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/lectures")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Lectures</span>
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-xs">
              {lecture.courseCode}
            </Badge>
            <Badge className="bg-primary/10 text-primary border-0 text-xs">
              {lecture.instructor}
            </Badge>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {lecture.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Duration: {lecture.duration} • AI transcript, clickable chapters & sign language support
          </p>
        </div>

        {/* Video Player & Accessibility Controls */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main Video Section */}
          <div className="space-y-3 lg:col-span-2">
            {/* Video Canvas Container (with optional Side-by-Side Sign Language) */}
            <div className={cn(
              "relative overflow-hidden rounded-2xl bg-black shadow-lg",
              showSignLanguage ? "grid grid-cols-1 md:grid-cols-3 gap-1 bg-neutral-950 p-1" : ""
            )}>
              {/* Main Lecture Video */}
              <div className={cn("relative aspect-video w-full bg-black", showSignLanguage ? "md:col-span-2" : "")}>
                <video
                  ref={videoRef}
                  src={lecture.videoUrl}
                  className="h-full w-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                {/* Subtitle / Caption Overlay */}
                {showCaptions && activeTranscriptItem && (
                  <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
                    <span className="inline-block rounded-lg bg-black/80 px-3 py-1.5 text-xs sm:text-sm font-medium text-white shadow backdrop-blur-md">
                      <strong className="text-amber-300 font-semibold">{activeTranscriptItem.speaker}:</strong>{" "}
                      {activeTranscriptItem.text}
                    </span>
                  </div>
                )}
              </div>

              {/* Dedicated Sign Language Stream */}
              {showSignLanguage && (
                <div className="relative aspect-video md:aspect-auto md:h-full w-full rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-primary text-primary-foreground text-[10px] gap-1 shadow">
                      ASL Sign Language
                    </Badge>
                  </div>
                  <video
                    ref={signVideoRef}
                    src={lecture.signLanguageVideoUrl}
                    className="h-full w-full object-cover"
                    muted
                    loop
                  />
                  <div className="absolute bottom-2 left-2 right-2 text-center pointer-events-none">
                    <span className="inline-block rounded bg-black/70 px-2 py-0.5 text-[10px] text-white/90">
                      Synchronized Signing Stream
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Accessibility & Playback Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </Button>

                <span className="text-xs font-mono text-muted-foreground">
                  {formatTime(currentTime)} / {lecture.duration}
                </span>
              </div>

              {/* Accessibility toggles */}
              <div className="flex items-center gap-1.5">
                {/* Sign Language Toggle */}
                <Button
                  variant={showSignLanguage ? "default" : "outline"}
                  size="sm"
                  className={cn("h-8 gap-1.5 text-xs font-medium", showSignLanguage && "bg-primary text-primary-foreground")}
                  onClick={() => setShowSignLanguage(!showSignLanguage)}
                >
                  <span>Sign Language (ASL)</span>
                </Button>

                {/* Captions Toggle */}
                <Button
                  variant={showCaptions ? "default" : "outline"}
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => setShowCaptions(!showCaptions)}
                >
                  <Subtitles className="h-3.5 w-3.5" />
                  <span>CC</span>
                </Button>

                {/* Audio TTS */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={handleSpeakSummary}
                >
                  <Volume2 className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">{isSpeakingSummary ? "Stop TTS" : "Summary Audio"}</span>
                </Button>
              </div>
            </div>

            {/* Current Chapter Indicator */}
            <div className="rounded-xl border border-border/50 bg-muted/30 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  Active Chapter: {lecture.chapters.slice().reverse().find((c) => currentTime >= c.seconds)?.title || lecture.chapters[0].title}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {formatTime(currentTime)}
              </Badge>
            </div>
          </div>

          {/* Right Sidebar: Chapters, Transcript & Summary */}
          <div className="space-y-3">
            <Card className="border-border/60 bg-card/80 shadow-sm h-[560px] flex flex-col">
              <Tabs defaultValue="chapters" className="flex-1 flex flex-col" onValueChange={(v) => setActiveTab(v as any)}>
                <CardHeader className="p-3 border-b border-border/40 pb-2">
                  <TabsList className="w-full grid grid-cols-3 h-8">
                    <TabsTrigger value="chapters" className="text-xs">Chapters</TabsTrigger>
                    <TabsTrigger value="transcript" className="text-xs">Transcript</TabsTrigger>
                    <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="p-3 flex-1 overflow-y-auto">
                  {/* Chapters Content */}
                  <TabsContent value="chapters" className="mt-0 space-y-2">
                    <p className="text-[11px] text-muted-foreground pb-1">
                      Click any timestamp to jump video playback directly to that concept:
                    </p>
                    {lecture.chapters.map((chapter) => {
                      const isActive = currentTime >= chapter.seconds &&
                        currentTime < (lecture.chapters[lecture.chapters.indexOf(chapter) + 1]?.seconds || 99999);

                      return (
                        <button
                          key={chapter.id}
                          type="button"
                          onClick={() => seekTo(chapter.seconds)}
                          className={cn(
                            "w-full text-left rounded-xl p-2.5 border transition-all duration-150 flex items-center justify-between",
                            isActive
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border/40 bg-background/50 hover:bg-background hover:border-primary/30"
                          )}
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <span className="block text-xs font-semibold text-foreground truncate">
                              {chapter.title}
                            </span>
                            <span className="block text-[10px] text-primary font-medium">
                              Concept: {chapter.conceptTag}
                            </span>
                          </div>
                          <Badge
                            variant={isActive ? "default" : "outline"}
                            className="font-mono text-[10px] shrink-0"
                          >
                            {chapter.timestamp}
                          </Badge>
                        </button>
                      );
                    })}

                    <div className="pt-3 border-t border-border/40">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs gap-1.5"
                        onClick={() => navigate("/assessments/quiz-norm-mastery")}
                      >
                        <FileCheck2 className="h-3.5 w-3.5 text-primary" />
                        <span>Take Lecture Quiz Checkpoint</span>
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Transcript Content */}
                  <TabsContent value="transcript" className="mt-0 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={transcriptSearch}
                        onChange={(e) => setTranscriptSearch(e.target.value)}
                        placeholder="Search spoken words..."
                        className="h-8 pl-8 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      {filteredTranscript.map((item) => {
                        const isCurrent = currentTime >= item.seconds &&
                          currentTime < (lecture.transcript[lecture.transcript.indexOf(item) + 1]?.seconds || 99999);

                        return (
                          <div
                            key={item.id}
                            onClick={() => seekTo(item.seconds)}
                            className={cn(
                              "cursor-pointer rounded-lg p-2 text-xs transition",
                              isCurrent
                                ? "bg-primary/15 border-l-2 border-primary font-medium text-foreground"
                                : "hover:bg-muted/50 text-muted-foreground"
                            )}
                          >
                            <div className="flex items-center justify-between text-[10px] text-primary pb-0.5">
                              <span className="font-semibold">{item.speaker}</span>
                              <span className="font-mono">{item.time}</span>
                            </div>
                            <p className="leading-relaxed">{item.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* AI Summary Content */}
                  <TabsContent value="summary" className="mt-0 space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">AI Lecture Summary</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary gap-1"
                          onClick={handleSpeakSummary}
                        >
                          <Volume2 className="h-3 w-3" />
                          <span>{isSpeakingSummary ? "Stop" : "Listen"}</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-2.5 rounded-xl border border-border/40">
                        {lecture.summary}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-foreground">Core Takeaways</span>
                      <ul className="space-y-1.5">
                        {lecture.keyPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-border/40 space-y-2">
                      <Button
                        size="sm"
                        className="w-full text-xs bg-primary text-primary-foreground font-medium"
                        onClick={() => navigate("/assessments/quiz-norm-mastery")}
                      >
                        <FileCheck2 className="mr-1.5 h-3.5 w-3.5" />
                        <span>Test Knowledge on this Lecture</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => navigate("/notes")}
                      >
                        <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                        <span>View Related Notes</span>
                      </Button>
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
