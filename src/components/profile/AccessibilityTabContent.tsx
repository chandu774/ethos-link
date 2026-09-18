import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Subtitles,
  Volume2,
  Eye,
  Sliders,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useSynapse } from "@/hooks/useSynapse";
import { toast } from "sonner";

export function AccessibilityTabContent() {
  const synapse = useSynapse();
  const acc = synapse.accessibility;

  const handleToggle = (key: keyof typeof acc, val: any) => {
    synapse.updateAccessibility({ [key]: val });
    toast.success("Accessibility preference updated");
  };

  const handleTestVoice = () => {
    synapse.speakText("Welcome to Synapse. Text to speech is enabled and ready to read lecture summaries, transcripts, and notes aloud.");
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Inclusive Learning & Accessibility Preferences</CardTitle>
              <CardDescription className="text-xs">
                Customize your viewing, captioning, sign-language, and audio playback experience.
              </CardDescription>
            </div>
            <Badge className="bg-primary/10 text-primary border-0 text-xs">
              Universal Design
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Captions & Subtitles */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Subtitles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Live Closed Captions (CC)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Display synchronized real-time subtitles across all lecture videos and audio notes.
              </p>
            </div>
            <Switch
              checked={acc.captionsEnabled}
              onCheckedChange={(checked) => handleToggle("captionsEnabled", checked)}
            />
          </div>

          {/* Sign Language Support */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/40">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-base">??</span>
                <span className="text-sm font-semibold text-foreground">Sign Language Interpretation Mode</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically split video player to show dedicated sign-language stream for supported lectures.
              </p>
            </div>
            <Switch
              checked={acc.signLanguageEnabled}
              onCheckedChange={(checked) => handleToggle("signLanguageEnabled", checked)}
            />
          </div>

          {/* Text-to-Speech (TTS) */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/40">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Text-to-Speech (TTS) Narration</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Enable 1-click audio playback of lecture summaries, notes, and AI tutor explanations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={handleTestVoice}
              >
                <Volume2 className="h-3 w-3" />
                <span>Test Voice</span>
              </Button>
              <Switch
                checked={acc.textToSpeechEnabled}
                onCheckedChange={(checked) => handleToggle("textToSpeechEnabled", checked)}
              />
            </div>
          </div>

          {/* High Contrast Mode */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/40">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Enhanced High Contrast</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Increases contrast ratios and border weights for improved visibility.
              </p>
            </div>
            <Switch
              checked={acc.highContrast}
              onCheckedChange={(checked) => handleToggle("highContrast", checked)}
            />
          </div>

          {/* Text Sizing */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/40">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Reading Text Size</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Scale interface typography for comfortable reading.
              </p>
            </div>
            <Select
              value={acc.textSize}
              onValueChange={(val) => handleToggle("textSize", val as any)}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Compact</SelectItem>
                <SelectItem value="normal">Standard</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/40">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground">Reduced Motion</span>
              <p className="text-xs text-muted-foreground">
                Disables non-essential transitions and animations.
              </p>
            </div>
            <Switch
              checked={acc.reducedMotion}
              onCheckedChange={(checked) => handleToggle("reducedMotion", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

