import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
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
  isSpeaking: boolean;
  transcript: string;
  lastSpokenResponse: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  stopSpeaking: () => void;
  speak: (text: string) => Promise<void>;
  registerQuizHandlers: (handlers: QuizActionHandlers | null) => void;
  registerLectureHandlers: (handlers: LectureActionHandlers | null) => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export function VoiceAssistantProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferences, isVoiceEnabled } = useAccessibility();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastSpokenResponse, setLastSpokenResponse] = useState("");

  const recognitionRef = useRef<any>(null);
  const quizHandlersRef = useRef<QuizActionHandlers | null>(null);
  const lectureHandlersRef = useRef<LectureActionHandlers | null>(null);

  const isSupported =
    voiceAssistantService.isRecognitionSupported() && voiceAssistantService.isSynthesisSupported();

  const registerQuizHandlers = useCallback((handlers: QuizActionHandlers | null) => {
    quizHandlersRef.current = handlers;
  }, []);

  const registerLectureHandlers = useCallback((handlers: LectureActionHandlers | null) => {
    lectureHandlersRef.current = handlers;
  }, []);

  const speak = useCallback(
    async (text: string) => {
      setLastSpokenResponse(text);
      setIsSpeaking(true);
      try {
        await voiceAssistantService.speak(text, preferences.speech_rate);
      } finally {
        setIsSpeaking(false);
      }
    },
    [preferences.speech_rate]
  );

  const stopSpeaking = useCallback(() => {
    voiceAssistantService.stopSpeaking();
    setIsSpeaking(false);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  const processSpokenInput = useCallback(
    async (rawText: string) => {
      setTranscript(rawText);
      const command = voiceAssistantService.parseCommand(rawText);

      // 1. Controls
      if (command.type === "CONTROL") {
        if (command.intent === "STOP") {
          stopSpeaking();
          stopListening();
          toast.info("Voice assistant stopped");
          return;
        }
        if (command.intent === "HELP") {
          const helpText =
            "Voice Commands available: Say 'Open home', 'Open assignments', 'Open lectures', or 'Open quizzes'. You can also ask: 'What's my attendance?', 'What assignments are pending?', 'What should I study today?', or 'What concepts am I weak in?'.";
          await speak(helpText);
          return;
        }
      }

      // 2. Navigation
      if (command.type === "NAVIGATE") {
        const path = command.payload as string;
        toast.info(`Navigating to ${path}`);
        navigate(path);
        const destinationName = path.split("/").pop() || "page";
        await speak(`Navigating to ${destinationName}`);
        return;
      }

      // 3. Spoken Academic Query (Real DB data)
      if (command.type === "ACADEMIC_QUERY") {
        if (!user?.id) {
          await speak("Please log in to query your academic records.");
          return;
        }
        const answer = await voiceAssistantService.executeAcademicQuery(
          command.intent,
          user.id,
          navigate
        );
        await speak(answer);
        return;
      }

      // 4. Quiz Action
      if (command.type === "QUIZ_ACTION") {
        const qh = quizHandlersRef.current;
        if (!qh) {
          await speak("You do not currently have an active quiz open.");
          return;
        }

        if (command.intent === "QUIZ_READ_QUESTION") {
          qh.readQuestion();
          return;
        }
        if (command.intent === "QUIZ_SELECT_OPTION") {
          const optIndex = command.payload;
          const letter = ["A", "B", "C", "D"][optIndex] || String(optIndex + 1);
          qh.selectOption(optIndex);
          await speak(`Selected option ${letter}`);
          return;
        }
        if (command.intent === "QUIZ_NEXT") {
          qh.nextQuestion();
          await speak("Next question");
          return;
        }
        if (command.intent === "QUIZ_PREV") {
          qh.prevQuestion();
          await speak("Previous question");
          return;
        }
        if (command.intent === "QUIZ_SUBMIT") {
          await speak("Submitting your quiz now");
          qh.submitQuiz();
          return;
        }
      }

      // 5. Lecture Action
      if (command.type === "LECTURE_ACTION") {
        const lh = lectureHandlersRef.current;
        if (!lh) {
          await speak("You do not currently have a lecture open.");
          return;
        }

        if (command.intent === "LECTURE_TRANSCRIPT") {
          lh.generateTranscript();
          await speak("Generating transcript for this lecture.");
          return;
        }
        if (command.intent === "LECTURE_SUMMARY") {
          lh.readSummary();
          return;
        }
      }

      // Unknown command
      await speak(`Sorry, I didn't recognize the command: ${rawText}. Say 'Help' to hear what commands are supported.`);
    },
    [navigate, user?.id, speak, stopSpeaking, stopListening]
  );

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

    try {
      const rec = voiceAssistantService.createRecognitionInstance();
      if (!rec) return;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const text = event.results?.[0]?.[0]?.transcript;
        if (text) {
          processSpokenInput(text);
        }
      };

      rec.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          toast.error("Microphone access was denied. Please allow microphone permissions.");
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setIsListening(false);
    }
  }, [isSupported, isVoiceEnabled, stopSpeaking, processSpokenInput]);

  // Global Alt + V Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        if (!isVoiceEnabled) {
          toast.info("Voice assistance is currently off. Enable it in Profile > Preferences.");
          return;
        }
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVoiceEnabled, isListening, startListening, stopListening]);

  return (
    <VoiceAssistantContext.Provider
      value={{
        isListening,
        isSpeaking,
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

const defaultVoiceAssistantContext: VoiceAssistantContextType = {
  isListening: false,
  isSpeaking: false,
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

export function useVoiceAssistant() {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    return defaultVoiceAssistantContext;
  }
  return context;
}
