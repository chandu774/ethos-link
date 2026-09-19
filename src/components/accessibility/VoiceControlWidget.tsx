import React from "react";
import { Mic, MicOff, Volume2, Square, Sparkles, HelpCircle } from "lucide-react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useVoiceAssistant } from "@/contexts/VoiceAssistantContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function VoiceControlWidget() {
  const { isVoiceEnabled } = useAccessibility();
  const {
    isListening,
    isSpeaking,
    transcript,
    lastSpokenResponse,
    startListening,
    stopListening,
    stopSpeaking,
    isSupported,
  } = useVoiceAssistant();

  // If the student has not enabled voice assistance, do not render this widget
  if (!isVoiceEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-auto">
      {/* Screen Reader Live Status Announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isListening && "Voice assistant is listening for your command."}
        {isSpeaking && `Voice assistant speaking: ${lastSpokenResponse}`}
        {!isListening && !isSpeaking && transcript && `Last recognized command: ${transcript}`}
      </div>

      {/* Spoken Feedback Popover / Banner when active */}
      {(isListening || isSpeaking || transcript) && (
        <div className="max-w-xs sm:max-w-sm rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md p-3.5 shadow-2xl space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Voice Assistant</span>
            </div>
            {isSpeaking && (
              <Button
                size="sm"
                variant="destructive"
                className="h-6 px-2 text-[10px] gap-1"
                onClick={stopSpeaking}
                aria-label="Stop reading response aloud"
              >
                <Square className="h-2.5 w-2.5 fill-current" />
                <span>Stop Audio</span>
              </Button>
            )}
            {isListening && (
              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] animate-pulse">
                Listening...
              </Badge>
            )}
          </div>

          {transcript && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 border">
              <span className="font-semibold text-[10px] uppercase block text-foreground/70">You said:</span>
              <p className="text-foreground italic font-medium">"{transcript}"</p>
            </div>
          )}

          {isSpeaking && lastSpokenResponse && (
            <div className="text-xs bg-primary/10 rounded-lg p-2 border border-primary/20">
              <div className="flex items-center gap-1 text-primary text-[10px] font-bold uppercase mb-0.5">
                <Volume2 className="h-3 w-3" />
                <span>Speaking:</span>
              </div>
              <p className="text-foreground text-[11px] leading-relaxed line-clamp-4">
                {lastSpokenResponse}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Floating Voice Trigger Button */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full shadow-md bg-card/80 backdrop-blur hover:bg-card"
              title="Voice Commands Guide"
              aria-label="View available voice commands"
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-80 p-4 text-xs space-y-3">
            <div className="font-bold text-foreground flex items-center justify-between">
              <span>Voice Commands Guide</span>
              <Badge variant="secondary" className="text-[10px]">Shortcut: Alt + V</Badge>
            </div>
            <div className="space-y-1.5 text-muted-foreground">
              <div className="font-semibold text-foreground text-[11px]">Navigation:</div>
              <p>• "Open home", "Open assignments", "Open notes"</p>
              <p>• "Open lectures", "Open quizzes", "Open progress"</p>
              <div className="font-semibold text-foreground text-[11px] pt-1">Academic Queries:</div>
              <p>• "What's my attendance?"</p>
              <p>• "What assignments are pending?"</p>
              <p>• "What should I study today?"</p>
              <p>• "What concepts am I weak in?"</p>
              <p>• "What did I miss?"</p>
              <div className="font-semibold text-foreground text-[11px] pt-1">Quiz Interaction:</div>
              <p>• "Read question", "Select option B", "Next", "Submit"</p>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          onClick={isListening ? stopListening : startListening}
          aria-label={isListening ? "Stop voice listening" : "Start voice listening (Shortcut Alt + V)"}
          className={`h-12 px-4 rounded-full shadow-xl font-semibold text-xs gap-2 transition-all ${
            isListening
              ? "bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-500/30 animate-pulse"
              : isSpeaking
              ? "bg-primary hover:bg-primary/90 text-primary-foreground ring-4 ring-primary/20"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="h-4 w-4 shrink-0" />
              <span>Listening...</span>
            </>
          ) : isSpeaking ? (
            <>
              <Volume2 className="h-4 w-4 shrink-0 animate-bounce" />
              <span>Speaking</span>
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 shrink-0" />
              <span>Voice (Alt+V)</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
