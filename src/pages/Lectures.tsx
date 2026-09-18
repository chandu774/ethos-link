import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Video,
  Play,
  Clock,
  BookOpen,
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle2,
  Subtitles,
  Volume2,
} from "lucide-react";
import { DEMO_LECTURES } from "@/data/demoData";

export default function Lectures() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLectures = DEMO_LECTURES.filter(
    (lec) =>
      lec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lec.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lec.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Inclusive Learning Platform
              </Badge>
              <span className="text-xs text-muted-foreground">• Chapters, Sign Language & Captions</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Video Lectures
            </h1>
            <p className="text-sm text-muted-foreground">
              Curated lectures enhanced with AI timestamps, synchronized transcripts, and sign-language translation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/30 text-xs py-1 px-3">
              ?? Sign Language Enabled
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lectures by topic, concept or course..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Lecture Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {filteredLectures.map((lecture) => (
            <Card
              key={lecture.id}
              className="overflow-hidden border-border/60 bg-card/80 transition hover:border-primary/40 hover:shadow-md"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={lecture.thumbnail}
                  alt={lecture.title}
                  className="h-full w-full object-cover transition duration-300 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                  <Badge className="bg-black/60 text-[10px] backdrop-blur-sm border-white/20">
                    {lecture.courseCode} • {lecture.instructor}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs font-medium bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                    <Clock className="h-3 w-3" /> {lecture.duration}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(/lectures/)}
                  className="absolute inset-0 flex items-center justify-center group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg transition duration-200 group-hover:scale-110">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>
                </button>
              </div>

              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground line-clamp-1">{lecture.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{lecture.summary}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Subtitles className="h-3 w-3" /> Captions
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    ?? Sign Language
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    {lecture.chapters.length} Chapters
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">Clickable timestamps available</span>
                  <Button
                    size="sm"
                    className="gap-1 text-xs bg-primary text-primary-foreground font-medium"
                    onClick={() => navigate(/lectures/)}
                  >
                    <span>Open Lecture</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

