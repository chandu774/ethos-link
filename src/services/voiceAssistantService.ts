import { supabase } from "@/integrations/supabase/client";
import { studentAnalyticsService } from "@/services/studentAnalyticsService";

// Standard Web Speech API Types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type VoiceActionType =
  | "NAVIGATE"
  | "QUIZ_READ_QUESTION"
  | "QUIZ_SELECT_OPTION"
  | "QUIZ_NEXT"
  | "QUIZ_PREV"
  | "QUIZ_SUBMIT"
  | "LECTURE_TRANSCRIPT"
  | "LECTURE_SUMMARY"
  | "LECTURE_SEEK"
  | "STOP_VOICE"
  | "NONE"
  | "CONTROL"
  | "UNKNOWN";

export interface VoiceAssistantAction {
  type: VoiceActionType;
  payload?: any;
}

export interface VoiceAssistantResponse {
  action: VoiceAssistantAction;
  spokenResponse: string;
}

export interface QuizActionHandlers {
  readQuestion: () => void;
  selectOption: (optionIndex: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitQuiz: () => void;
}

export interface LectureActionHandlers {
  generateTranscript: () => void;
  readSummary: () => void;
  seekTo: (seconds: number) => void;
}

export const voiceAssistantService = {
  isRecognitionSupported(): boolean {
    if (typeof window === "undefined") return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  isSynthesisSupported(): boolean {
    if (typeof window === "undefined") return false;
    return !!window.speechSynthesis;
  },

  createRecognitionInstance(): any | null {
    if (!this.isRecognitionSupported()) return null;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.continuous = false; // We manage continuous restart via lifecycle loop to prevent OS timeouts
    recognition.interimResults = false;
    recognition.lang = "en-US";
    return recognition;
  },

  /**
   * Play iconic Apple Siri two-tone activation chime using Web Audio API
   */
  playActivationChime() {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Tone 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Tone 2: E5 (659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.08);
      gain2.gain.setValueAtTime(0.16, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.28);
    } catch (e) {
      // Audio context might be restricted before gesture
    }
  },

  /**
   * Play Apple Siri descending stop chime
   */
  playStopChime() {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.22);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch (e) {}
  },

  /**
   * Find the most natural/human-like speech synthesis voice available
   */
  getBestVoice(): SpeechSynthesisVoice | null {
    if (!this.isSynthesisSupported()) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length === 0) return null;

    // 1. Prioritize natural/neural English voices
    const preferredNames = [
      "Natural",
      "Neural",
      "Google US English",
      "Google UK English Female",
      "Microsoft Jenny Online (Natural)",
      "Microsoft Guy Online (Natural)",
      "Microsoft Aria Online (Natural)",
      "Samantha",
    ];

    for (const name of preferredNames) {
      const found = voices.find(
        (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes(name.toLowerCase())
      );
      if (found) return found;
    }

    // 2. Any English voice
    const anyEn = voices.find((v) => v.lang.startsWith("en"));
    if (anyEn) return anyEn;

    // 3. Default voice
    return voices[0] || null;
  },

  /**
   * Speak text aloud using browser Web Speech Synthesis with natural voice selection
   */
  speak(text: string, rate: number = 1.0): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSynthesisSupported()) {
        console.warn("Speech synthesis not supported in this browser.");
        resolve();
        return;
      }

      window.speechSynthesis.cancel(); // Stop any currently running speech

      // Clean spoken text: strip asterisks, markdown, and brackets
      const cleanText = text
        .replace(/[*_#`~>]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .trim();

      if (!cleanText) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = Math.max(0.7, Math.min(rate || 1.0, 1.8));
      utterance.pitch = 1.0;
      utterance.lang = "en-US";

      const bestVoice = this.getBestVoice();
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      let hasResolved = false;
      const finish = () => {
        if (!hasResolved) {
          hasResolved = true;
          resolve();
        }
      };

      utterance.onend = finish;
      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        finish();
      };

      // Safety timeout: Chrome sometimes fails to fire onend for long utterances
      const wordCount = cleanText.split(/\s+/).length;
      const expectedDurationMs = Math.max(2000, (wordCount / 2.5) * 1000 + 3000);
      setTimeout(() => {
        if (!hasResolved) finish();
      }, expectedDurationMs);

      window.speechSynthesis.speak(utterance);
    });
  },

  stopSpeaking() {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  },

  /**
   * Check if transcript is an explicit stop/pause command
   */
  isStopCommand(transcript: string): boolean {
    const text = transcript.trim().toLowerCase();
    return (
      text === "stop" ||
      text === "stop voice" ||
      text === "stop voice mode" ||
      text === "stop listening" ||
      text === "turn off voice" ||
      text === "turn off voice mode" ||
      text === "exit voice" ||
      text === "be quiet" ||
      text === "shut up" ||
      text === "go to sleep"
    );
  },

  /**
   * Process spoken input using the Gemini-powered Edge Function
   */
  async processWithAiAgent(params: {
    query: string;
    currentPath: string;
    pageContext?: any;
    studentContext?: any;
  }): Promise<VoiceAssistantResponse> {
    const { query, currentPath, pageContext, studentContext } = params;

    // Check stop command first
    if (this.isStopCommand(query)) {
      return {
        action: { type: "STOP_VOICE" },
        spokenResponse: "Voice mode stopped. Say 'Alt plus V' or click the microphone to talk again.",
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke("voice-assistant", {
        body: {
          query,
          currentPath,
          pageContext,
          studentContext,
        },
      });

      if (error) {
        console.warn("[voiceAssistantService] Edge function returned error:", error);
        return this.localFallbackParser(query, studentContext);
      }

      if (!data || !data.spokenResponse) {
        return this.localFallbackParser(query, studentContext);
      }

      return {
        action: data.action || { type: "NONE" },
        spokenResponse: data.spokenResponse,
      };
    } catch (err) {
      console.warn("[voiceAssistantService] Edge function invocation failed, using local fallback:", err);
      return this.localFallbackParser(query, studentContext);
    }
  },

  /**
   * Fast local fallback parser if internet/edge function is unreachable
   */
  localFallbackParser(transcript: string, studentContext?: any): VoiceAssistantResponse {
    const text = transcript.trim().toLowerCase();

    // 1. Navigation
    if (/(dashboard|home)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/dashboard" } },
        spokenResponse: "Opening your dashboard.",
      };
    }
    if (/(assignment|homework)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/assignments" } },
        spokenResponse: "Opening your assignments.",
      };
    }
    if (/(lecture|video)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/lectures" } },
        spokenResponse: "Opening your lecture library.",
      };
    }
    if (/(quiz|assessment|test)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/quizzes" } },
        spokenResponse: "Opening your assessments.",
      };
    }
    if (/(note|material)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/notes" } },
        spokenResponse: "Opening your class notes.",
      };
    }
    if (/(progress|performance|grade|analytic)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/progress" } },
        spokenResponse: "Opening your academic progress.",
      };
    }
    if (/(profile|setting|accessibility)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/profile" } },
        spokenResponse: "Opening your profile.",
      };
    }
    if (/(ai tutor|tutor)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/ai-tutor" } },
        spokenResponse: "Opening AI Tutor.",
      };
    }
    if (/(classroom|class)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/classrooms" } },
        spokenResponse: "Opening your classrooms.",
      };
    }
    if (/(task|todo)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/tasks" } },
        spokenResponse: "Opening your tasks.",
      };
    }
    if (/(opportunit|internship|career|job)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/opportunities" } },
        spokenResponse: "Opening opportunities and internships.",
      };
    }
    if (/(recovery|attendance recovery)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/attendance-recovery" } },
        spokenResponse: "Opening attendance recovery sessions.",
      };
    }
    if (/(notification|alert)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/notifications" } },
        spokenResponse: "Opening your notifications.",
      };
    }
    if (/(chat|message|collab)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/chat" } },
        spokenResponse: "Opening chat.",
      };
    }
    if (/(learning|my learning|study plan)/.test(text)) {
      return {
        action: { type: "NAVIGATE", payload: { path: "/student/learning" } },
        spokenResponse: "Opening My Learning.",
      };
    }

    // 2. Quiz Commands
    if (/(read (the )?question|repeat (the )?question)/.test(text)) {
      return {
        action: { type: "QUIZ_READ_QUESTION" },
        spokenResponse: "Reading the question for you.",
      };
    }
    const optMatch = text.match(/(?:option|choose|select|pick)\s*(?:option\s*)?([a-d]|1|2|3|4)/i);
    if (optMatch) {
      const val = optMatch[1].toLowerCase();
      let idx = 0;
      if (val === "b" || val === "2") idx = 1;
      else if (val === "c" || val === "3") idx = 2;
      else if (val === "d" || val === "4") idx = 3;
      const letter = ["A", "B", "C", "D"][idx];
      return {
        action: { type: "QUIZ_SELECT_OPTION", payload: { optionIndex: idx } },
        spokenResponse: `Selected option ${letter}.`,
      };
    }
    if (/(next question|next)/.test(text)) {
      return {
        action: { type: "QUIZ_NEXT" },
        spokenResponse: "Moving to next question.",
      };
    }
    if (/(previous question|previous|back)/.test(text)) {
      return {
        action: { type: "QUIZ_PREV" },
        spokenResponse: "Moving to previous question.",
      };
    }
    if (/(submit quiz|submit assessment|submit)/.test(text)) {
      return {
        action: { type: "QUIZ_SUBMIT" },
        spokenResponse: "Submitting your assessment.",
      };
    }

    // 3. Academic Queries using cached studentContext
    if (/(attendance|percentage)/.test(text)) {
      const pct = studentContext?.attendancePercentage ?? 85;
      return {
        action: { type: "NONE" },
        spokenResponse: `Your overall attendance is ${pct} percent.`,
      };
    }

    if (/(assignment|pending|due)/.test(text)) {
      const count = studentContext?.pendingAssignmentsCount ?? 0;
      return {
        action: { type: "NONE" },
        spokenResponse: `You have ${count} pending assignment${count === 1 ? "" : "s"}.`,
      };
    }

    return {
      action: { type: "NONE" },
      spokenResponse: `I heard: ${transcript}. How can I assist you with Synapse?`,
    };
  },

  /**
   * Synchronous command parsing compatibility helper
   */
  parseCommand(transcript: string) {
    const text = transcript.trim().toLowerCase();

    // 1. Controls
    if (/(stop|cancel|quiet|shut up)/.test(text)) {
      return { type: "CONTROL", intent: "STOP", rawText: transcript };
    }
    if (/(help|what can i say|available commands)/.test(text)) {
      return { type: "CONTROL", intent: "HELP", rawText: transcript };
    }

    // 2. Quiz actions
    if (/(submit|finish).*(quiz|assessment)?/.test(text)) {
      return { type: "QUIZ_ACTION", intent: "QUIZ_SUBMIT", rawText: transcript };
    }
    if (/(read|repeat).*(question)/.test(text)) {
      return { type: "QUIZ_ACTION", intent: "QUIZ_READ_QUESTION", rawText: transcript };
    }
    const optMatch = text.match(/(?:option|choose|select|pick)\s*(?:option\s*)?([a-d]|1|2|3|4)/i);
    if (optMatch) {
      const val = optMatch[1].toLowerCase();
      let idx = 0;
      if (val === "b" || val === "2") idx = 1;
      else if (val === "c" || val === "3") idx = 2;
      else if (val === "d" || val === "4") idx = 3;
      return { type: "QUIZ_ACTION", intent: "QUIZ_SELECT_OPTION", payload: idx, rawText: transcript };
    }
    if (/(next question|next)/.test(text)) {
      return { type: "QUIZ_ACTION", intent: "QUIZ_NEXT", rawText: transcript };
    }
    if (/(prev|previous|back)/.test(text)) {
      return { type: "QUIZ_ACTION", intent: "QUIZ_PREV", rawText: transcript };
    }

    // 3. Lecture actions
    if (/(transcript)/.test(text)) {
      return { type: "LECTURE_ACTION", intent: "LECTURE_TRANSCRIPT", rawText: transcript };
    }
    if (/(summar)/.test(text)) {
      return { type: "LECTURE_ACTION", intent: "LECTURE_SUMMARY", rawText: transcript };
    }

    // 4. Academic queries
    if (/(attendance|percentage)/.test(text)) {
      return { type: "ACADEMIC_QUERY", intent: "QUERY_ATTENDANCE", rawText: transcript };
    }
    if (/(pending|due)/.test(text)) {
      return { type: "ACADEMIC_QUERY", intent: "QUERY_ASSIGNMENTS", rawText: transcript };
    }
    if (/(study|priorit)/.test(text)) {
      return { type: "ACADEMIC_QUERY", intent: "QUERY_PRIORITIES", rawText: transcript };
    }
    if (/(weak|gap)/.test(text)) {
      return { type: "ACADEMIC_QUERY", intent: "QUERY_WEAK_CONCEPTS", rawText: transcript };
    }
    if (/(missed|miss)/.test(text)) {
      return { type: "ACADEMIC_QUERY", intent: "QUERY_MISSED_CLASS", rawText: transcript };
    }

    // 5. Navigation
    if (/(dashboard|home)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/dashboard", rawText: transcript };
    }
    if (/(assignment|homework)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/assignments", rawText: transcript };
    }
    if (/(lecture|video)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/lectures", rawText: transcript };
    }
    if (/(quiz|test|assessment)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/quizzes", rawText: transcript };
    }
    if (/(progress|performance|analytic)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/progress", rawText: transcript };
    }
    if (/(profile|setting|accessibility)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/profile", rawText: transcript };
    }
    if (/(notes|material)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/notes", rawText: transcript };
    }
    if (/(classroom|class)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/classrooms", rawText: transcript };
    }
    if (/(task|todo)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/tasks", rawText: transcript };
    }
    if (/(opportunit|internship|career|job)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/opportunities", rawText: transcript };
    }
    if (/(recovery|attendance recovery)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/attendance-recovery", rawText: transcript };
    }
    if (/(notification|alert)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/notifications", rawText: transcript };
    }
    if (/(chat|message)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/chat", rawText: transcript };
    }
    if (/(learning|my learning)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/learning", rawText: transcript };
    }
    if (/(ai tutor|tutor)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/ai-tutor", rawText: transcript };
    }

    return { type: "UNKNOWN", intent: "UNKNOWN", rawText: transcript };
  },

  /**
   * Helper to load student academic snapshot for grounding AI answers
   */
  async getStudentContextSnapshot(userId: string) {
    if (!userId) return null;
    try {
      const academicCtx = await studentAnalyticsService.getStudentAcademicContext(userId);
      const classroomId = academicCtx.classroomId;
      const [attendance, assignments, priorities, quizMetrics] = await Promise.all([
        studentAnalyticsService.getStudentAttendanceMetrics(userId, classroomId),
        studentAnalyticsService.getStudentAssignmentMetrics(userId, classroomId),
        studentAnalyticsService.getStudentPriorities(userId, classroomId),
        studentAnalyticsService.getStudentQuizMetrics(userId),
      ]);

      return {
        studentName: academicCtx.studentName,
        classroomId,
        classroomName: academicCtx.classroomName,
        attendancePercentage: attendance.overallAttendancePercentage,
        totalAttendanceSessions: attendance.totalSessions,
        presentSessions: attendance.presentSessions,
        pendingAssignmentsCount: assignments.pendingCount,
        nextAssignmentDue: assignments.nextDueAssignment
          ? {
              title: assignments.nextDueAssignment.title,
              subject: assignments.nextDueAssignment.subject,
              deadline: assignments.nextDueAssignment.deadline,
            }
          : null,
        topPriorities: priorities.slice(0, 3).map((p) => ({ title: p.title, reason: p.reason })),
        weakConcepts: quizMetrics.learningGaps?.slice(0, 4).map((g) => g.conceptName) || [],
        recentMissedClass: attendance.recentMissedClass
          ? {
              subjectName: attendance.recentMissedClass.subjectName,
              topic: attendance.recentMissedClass.topic,
              hasFacultyLecture: attendance.recentMissedClass.hasFacultyLecture,
            }
          : null,
      };
    } catch (err) {
      console.warn("Could not load full student context snapshot:", err);
      return null;
    }
  },
};
