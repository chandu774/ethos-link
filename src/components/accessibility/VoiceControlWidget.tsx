import React from "react";
import { Mic, MicOff, Volume2, Square, Sparkles, HelpCircle, Loader2 } from "lucide-react";
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
    isProcessing,
    isSpeaking,
    isContinuousMode,
    transcript,
    lastSpokenResponse,
    startListening,
    stopListening,
    stopSpeaking,
  } = useVoiceAssistant();

  // If the student has not enabled voice assistance in profile, do not render this widget
  if (!isVoiceEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 flex flex-col items-end gap-2.5 pointer-events-auto select-none">
      {/* Screen Reader Live Status Announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isListening && "Siri is listening. Speak your request anytime, or say stop to exit."}
        {isProcessing && "Siri is processing your request."}
        {isSpeaking && `Siri speaking: ${lastSpokenResponse}`}
        {!isListening && !isSpeaking && !isProcessing && transcript && `You said: ${transcript}`}
      </div>

      {/* Siri Dynamic Glassmorphic Card (Active Voice Feedback) */}
      {(isContinuousMode || isListening || isProcessing || isSpeaking || transcript) && (
        <div className="w-[310px] sm:w-[350px] rounded-3xl border border-white/20 bg-zinc-950/90 text-white backdrop-blur-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-250 ring-1 ring-white/10">
          {/* Card Header: Siri Brand & Live State */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Miniature glowing Siri orb */}
              <div className="relative flex h-5 w-5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-indigo-500 opacity-75 blur-[2px] animate-pulse" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-gradient-to-tr from-cyan-300 via-purple-400 to-rose-400" />
              </div>
              <span className="text-xs font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Synapse Siri
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isSpeaking && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 px-2 text-[10px] gap-1 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white"
                  onClick={stopSpeaking}
                  aria-label="Stop reading response aloud"
                >
                  <Square className="h-2 w-2 fill-current" />
                  <span>Stop</span>
                </Button>
              )}

              {isProcessing ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-500/30">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  <span>Thinking...</span>
                </div>
              ) : isListening ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Listening...</span>
                </div>
              ) : isSpeaking ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-[10px] border border-fuchsia-500/30">
                  {/* Siri Sound Wave Equalizer Bars */}
                  <span className="h-2 w-0.5 bg-fuchsia-400 animate-pulse" />
                  <span className="h-3 w-0.5 bg-fuchsia-300 animate-bounce" />
                  <span className="h-1.5 w-0.5 bg-fuchsia-400 animate-pulse" />
                  <span className="ml-1">Speaking</span>
                </div>
              ) : (
                <span className="text-[10px] text-zinc-400">Standby</span>
              )}
            </div>
          </div>

          {/* Continuous Status Bar */}
          {isContinuousMode && (
            <div className="text-[11px] text-zinc-400 flex items-center justify-between border-t border-white/10 pt-2">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
                <span>Always listening • Say <strong>"Stop"</strong> to sleep</span>
              </span>
              <button
                onClick={stopListening}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-medium transition-colors"
                title="Stop Siri"
              >
                Turn Off
              </button>
            </div>
          )}

          {/* User's spoken query bubble */}
          {transcript && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5 text-xs space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block tracking-wider">You said:</span>
              <p className="text-zinc-100 font-medium italic">"{transcript}"</p>
            </div>
          )}

          {/* Siri spoken response bubble */}
          {isSpeaking && lastSpokenResponse && (
            <div className="rounded-2xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-rose-500/10 border border-white/15 p-2.5 text-xs space-y-1">
              <div className="flex items-center gap-1 text-cyan-300 text-[10px] font-bold tracking-wider uppercase">
                <Volume2 className="h-3 w-3" />
                <span>Siri:</span>
              </div>
              <p className="text-zinc-100 text-[11px] leading-relaxed line-clamp-4">
                {lastSpokenResponse}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Floating Apple Siri Orb Trigger */}
      <div className="flex items-center gap-2.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg border-white/20 bg-zinc-950/80 text-zinc-300 backdrop-blur-xl hover:bg-zinc-900 hover:text-white"
              title="Siri Commands & App Guide"
              aria-label="View Siri voice guide"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-80 p-4 text-xs space-y-3 bg-zinc-950/95 border-zinc-800 text-zinc-200 backdrop-blur-2xl rounded-2xl shadow-2xl">
            <div className="font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Synapse Siri</span>
              </span>
              <Badge variant="secondary" className="text-[10px] bg-white/10 text-white border-0">Alt + S</Badge>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Ask anything naturally — Siri understands the full app, answers questions on any topic, and navigates anywhere!
            </p>
            <div className="space-y-1.5 text-zinc-300">
              <div className="font-semibold text-white text-[11px]">Navigate Anywhere:</div>
              <p>• "Take me to my tasks", "Open attendance recovery"</p>
              <p>• "Show my assignments", "Open lectures", "Find opportunities"</p>
              <div className="font-semibold text-white text-[11px] pt-1">Ask Any Academic or General Topic:</div>
              <p>• "What's my attendance percentage?"</p>
              <p>• "What is Third Normal Form in databases?"</p>
              <p>• "Explain quantum entanglement", "Help me with calculus"</p>
              <div className="font-semibold text-white text-[11px] pt-1">Active Quiz Controls:</div>
              <p>• "Read question", "Select B", "Next", "Submit"</p>
            </div>
          </PopoverContent>
        </Popover>

        {/* The Apple Siri Glowing Orb Button */}
        <button
          onClick={isContinuousMode ? stopListening : startListening}
          aria-label={isContinuousMode ? "Stop Siri" : "Activate Siri (Shortcut Alt + S)"}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-200 active:scale-95 focus:outline-none focus:ring-4 focus:ring-purple-500/40"
        >
          {/* Multi-layered animated aura glow rings */}
          {isContinuousMode && (
            <>
              <span className="absolute h-full w-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-indigo-500 opacity-60 blur-md animate-ping" />
              <span className="absolute h-[120%] w-[120%] rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-40 blur-lg animate-pulse" />
            </>
          )}

          {/* The Siri Sphere Body */}
          <div
            className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 border border-white/30 ${
              isContinuousMode
                ? "bg-[radial-gradient(circle_at_30%_30%,_#38bdf8,_#a855f7_45%,_#ec4899_70%,_#06b6d4_90%)] shadow-[0_0_35px_rgba(168,85,247,0.8)] ring-2 ring-white/50"
                : "bg-[radial-gradient(circle_at_35%_35%,_#0284c7,_#7c3aed_50%,_#db2777_80%,_#0369a1)] hover:shadow-[0_0_25px_rgba(124,58,237,0.7)] hover:scale-105"
            }`}
          >
            {/* Center icon */}
            {isContinuousMode ? (
              isListening ? (
                <div className="flex items-center justify-center">
                  <span className="h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_12px_#ffffff] animate-pulse" />
                </div>
              ) : isSpeaking ? (
                <Volume2 className="h-6 w-6 text-white drop-shadow-md animate-bounce" />
              ) : isProcessing ? (
                <Loader2 className="h-6 w-6 text-white drop-shadow-md animate-spin" />
              ) : (
                <MicOff className="h-5 w-5 text-white drop-shadow-md" />
              )
            ) : (
              <Mic className="h-6 w-6 text-white drop-shadow-md transition-transform group-hover:scale-110" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
