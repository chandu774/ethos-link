import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import {
  voiceAssistantService,
  QuizActionHandlers,
  LectureActionHandlers,
} from "@/services/voiceAssistantService";
import { toast } from "sonner";

interface VoiceAssistantContextType {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isContinuousMode: boolean;
  transcript: string;
  lastSpokenResponse: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  stopSpeaking: () => void;
  speak: (text: string) => Promise<void>;
  registerQuizHandlers: (handlers: QuizActionHandlers | null, context?: any) => void;
  registerLectureHandlers: (handlers: LectureActionHandlers | null, context?: any) => void;
}

const defaultVoiceAssistantContext: VoiceAssistantContextType = {
  isListening: false,
  isProcessing: false,
  isSpeaking: false,
  isContinuousMode: false,
  transcript: "",
  lastSpokenResponse: "",
  isSupported: false,
  startListening: () => {},
  stopListening: () => {},
  stopSpeaking: () => {},
  speak: async () => {},
  registerQuizHandlers: () => {},
  registerLectureHandlers: () => {},
};

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export function VoiceAssistantProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { preferences, isVoiceEnabled } = useAccessibility();

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastSpokenResponse, setLastSpokenResponse] = useState("");

  const recognitionRef = useRef<any>(null);
  const isContinuousRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const restartTimerRef = useRef<any>(null);

  const quizHandlersRef = useRef<QuizActionHandlers | null>(null);
  const quizContextRef = useRef<any>(null);
  const lectureHandlersRef = useRef<LectureActionHandlers | null>(null);
  const lectureContextRef = useRef<any>(null);

  const isSupported =
    voiceAssistantService.isRecognitionSupported() && voiceAssistantService.isSynthesisSupported();

  const registerQuizHandlers = useCallback((handlers: QuizActionHandlers | null, ctx?: any) => {
    quizHandlersRef.current = handlers;
    quizContextRef.current = ctx || null;
  }, []);

  const registerLectureHandlers = useCallback((handlers: LectureActionHandlers | null, ctx?: any) => {
    lectureHandlersRef.current = handlers;
    lectureContextRef.current = ctx || null;
  }, []);

  const stopSpeaking = useCallback(() => {
    voiceAssistantService.stopSpeaking();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      setLastSpokenResponse(text);
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      try {
        await voiceAssistantService.speak(text, preferences.speech_rate);
      } finally {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
      }
    },
    [preferences.speech_rate]
  );

  // Stop continuous voice mode
  const stopListening = useCallback(() => {
    isContinuousRef.current = false;
    setIsContinuousMode(false);
    voiceAssistantService.playStopChime();
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }
    stopSpeaking();
    setIsListening(false);
    setIsProcessing(false);
  }, [stopSpeaking]);

  // Execute AI action on frontend
  const executeAction = useCallback(
    async (action: { type: string; payload?: any }) => {
      if (!action || !action.type || action.type === "NONE") return;

      switch (action.type) {
        case "NAVIGATE": {
          const path = action.payload?.path;
          if (path) {
            navigate(path);
          }
          break;
        }

        case "QUIZ_READ_QUESTION": {
          quizHandlersRef.current?.readQuestion();
          break;
        }

        case "QUIZ_SELECT_OPTION": {
          const optIdx = action.payload?.optionIndex ?? 0;
          quizHandlersRef.current?.selectOption(optIdx);
          break;
        }

        case "QUIZ_NEXT": {
          quizHandlersRef.current?.nextQuestion();
          break;
        }

        case "QUIZ_PREV": {
          quizHandlersRef.current?.prevQuestion();
          break;
        }

        case "QUIZ_SUBMIT": {
          quizHandlersRef.current?.submitQuiz();
          break;
        }

        case "LECTURE_TRANSCRIPT": {
          lectureHandlersRef.current?.generateTranscript();
          break;
        }

        case "LECTURE_SUMMARY": {
          lectureHandlersRef.current?.readSummary();
          break;
        }

        case "LECTURE_SEEK": {
          const secs = action.payload?.seconds ?? 0;
          lectureHandlersRef.current?.seekTo(secs);
          break;
        }

        case "STOP_VOICE": {
          stopListening();
          break;
        }
      }
    },
    [navigate, stopListening]
  );

  // Main Recognition Starter
  const beginRecognition = useCallback(() => {
    if (!isContinuousRef.current || isSpeakingRef.current || isProcessingRef.current) {
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const rec = voiceAssistantService.createRecognitionInstance();
      if (!rec) return;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = async (event: any) => {
        const text = event.results?.[0]?.[0]?.transcript;
        if (!text || !text.trim()) return;

        setTranscript(text.trim());

        // 1. Check for immediate explicit stop command
        if (voiceAssistantService.isStopCommand(text)) {
          stopListening();
          await speak("Voice mode stopped.");
          return;
        }

        // 2. Pause recognition while AI processes & speaks
        try {
          rec.abort();
        } catch {
          // ignore
        }
        setIsListening(false);

        isProcessingRef.current = true;
        setIsProcessing(true);

        try {
          // Gather contextual state
          const studentSnapshot = user?.id
            ? await voiceAssistantService.getStudentContextSnapshot(user.id)
            : null;

          const pageContext = {
            quiz: quizContextRef.current,
            lecture: lectureContextRef.current,
          };

          // Call Gemini AI Voice Agent
          const aiResponse = await voiceAssistantService.processWithAiAgent({
            query: text,
            currentPath: location.pathname,
            pageContext,
            studentContext: studentSnapshot,
          });

          isProcessingRef.current = false;
          setIsProcessing(false);

          // Execute action
          await executeAction(aiResponse.action);

          // Speak reply using natural AI voice
          if (aiResponse.spokenResponse) {
            await speak(aiResponse.spokenResponse);
          }
        } catch (err) {
          console.error("Error in AI voice pipeline:", err);
          isProcessingRef.current = false;
          setIsProcessing(false);
          await speak("I encountered a problem processing that command.");
        } finally {
          // 3. Resume listening if continuous mode is still enabled
          if (isContinuousRef.current) {
            restartTimerRef.current = setTimeout(() => {
              beginRecognition();
            }, 300);
          }
        }
      };

      rec.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "not-allowed") {
          toast.error("Microphone access was denied. Please allow microphone permissions.");
          isContinuousRef.current = false;
          setIsContinuousMode(false);
        } else if (event.error !== "aborted" && isContinuousRef.current) {
          restartTimerRef.current = setTimeout(() => {
            beginRecognition();
          }, 400);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        // Browser recognition naturally times out on brief silence; loop restart if continuous
        if (
          isContinuousRef.current &&
          !isSpeakingRef.current &&
          !isProcessingRef.current
        ) {
          restartTimerRef.current = setTimeout(() => {
            beginRecognition();
          }, 250);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn("Could not start recognition:", err);
      setIsListening(false);
      if (isContinuousRef.current) {
        restartTimerRef.current = setTimeout(() => {
          beginRecognition();
        }, 500);
      }
    }
  }, [user?.id, location.pathname, executeAction, speak, stopListening]);

  // Start continuous listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (!isVoiceEnabled) {
      toast.info("Voice assistance is disabled. Enable it in Profile > Accessibility.");
      return;
    }

    stopSpeaking();
    voiceAssistantService.playActivationChime();
    isContinuousRef.current = true;
    setIsContinuousMode(true);
    toast.success("Synapse Siri Active — Speak anytime or say 'Stop' to exit.");
    beginRecognition();
  }, [isSupported, isVoiceEnabled, stopSpeaking, beginRecognition]);

  // Alt + S or Alt + V Global Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isSiriKey = e.key === "s" || e.key === "S" || e.key === "v" || e.key === "V";
      if (e.altKey && isSiriKey) {
        e.preventDefault();
        if (!isVoiceEnabled) {
          toast.info("Voice assistance is currently off. Enable it in Profile > Preferences.");
          return;
        }

        if (isContinuousRef.current) {
          stopListening();
          toast.info("Voice mode stopped");
        } else {
          startListening();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVoiceEnabled, startListening, stopListening]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <VoiceAssistantContext.Provider
      value={{
        isListening,
        isProcessing,
        isSpeaking,
        isContinuousMode,
        transcript,
        lastSpokenResponse,
        isSupported,
        startListening,
        stopListening,
        stopSpeaking,
        speak,
        registerQuizHandlers,
        registerLectureHandlers,
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
}

export function useVoiceAssistant() {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    return defaultVoiceAssistantContext;
  }
  return context;
}
