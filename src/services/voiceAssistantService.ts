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
  | "ACADEMIC_QUERY"
  | "QUIZ_ACTION"
  | "LECTURE_ACTION"
  | "CONTROL"
  | "UNKNOWN";

export interface ParsedVoiceCommand {
  type: VoiceActionType;
  intent: string;
  payload?: any;
  rawText: string;
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
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    return recognition;
  },

  /**
   * Speak text aloud using browser Web Speech Synthesis
   */
  speak(text: string, rate: number = 1.0): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSynthesisSupported()) {
        console.warn("Speech synthesis not supported in this browser.");
        resolve();
        return;
      }

      window.speechSynthesis.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.7, Math.min(rate || 1.0, 1.8));
      utterance.pitch = 1.0;
      utterance.lang = "en-US";

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  },

  stopSpeaking() {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  },

  /**
   * Parse user speech transcript into an actionable intent
   */
  parseCommand(transcript: string): ParsedVoiceCommand {
    const text = transcript.trim().toLowerCase();

    // 1. Controls
    if (/(stop|cancel|quiet|shut up|pause speaking)/.test(text)) {
      return { type: "CONTROL", intent: "STOP", rawText: transcript };
    }
    if (/(help|what can i say|what commands|available commands)/.test(text)) {
      return { type: "CONTROL", intent: "HELP", rawText: transcript };
    }

    // 2. Navigation Commands
    if (/(open|go to|show me|navigate to) (home|dashboard)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/dashboard", rawText: transcript };
    }
    if (/(open|go to|show me|navigate to) assignments?/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/assignments", rawText: transcript };
    }
    if (/(open|go to|show me|navigate to) notes?/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/notes", rawText: transcript };
    }
    if (/(open|go to|show me|navigate to) lectures?/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/lectures", rawText: transcript };
    }
    if (/(open|go to|show me|navigate to) (quizzes|assessments?|tests?)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/quizzes", rawText: transcript };
    }
    if (/(open|go to|show me|navigate to) (progress|analytics|performance)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/progress", rawText: transcript };
    }
    if (/(open|go to|show me|navigate to) (profile|settings|account)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/profile", rawText: transcript };
    }
    if (/(open|go to|show me|navigate to) (ai tutor|tutor)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/ai-tutor", rawText: transcript };
    }
    if (/(open|go to|show me|navigate to) (learning|my learning)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/learning", rawText: transcript };
    }
    if (/(open|go to|show me|navigate to) (classrooms?|classes)/.test(text)) {
      return { type: "NAVIGATE", intent: "NAVIGATE", payload: "/student/classrooms", rawText: transcript };
    }

    // 3. Spoken Academic Queries
    if (/(what('s| is) my attendance|how is my attendance|attendance percentage|check attendance)/.test(text)) {
      return { type: "ACADEMIC_QUERY", intent: "QUERY_ATTENDANCE", rawText: transcript };
    }
    if (/(what assignments are pending|do i have any assignments|pending assignments|assignments due|any homework)/.test(text)) {
      return { type: "ACADEMIC_QUERY", intent: "QUERY_ASSIGNMENTS", rawText: transcript };
    }
    if (/(what should i study|what to study|study priorities|what are my priorities|what do i focus on)/.test(text)) {
      return { type: "ACADEMIC_QUERY", intent: "QUERY_PRIORITIES", rawText: transcript };
    }
    if (/(what concepts am i weak in|weak concepts|weak topics|learning gaps|what do i need practice in)/.test(text)) {
      return { type: "ACADEMIC_QUERY", intent: "QUERY_WEAK_CONCEPTS", rawText: transcript };
    }
    if (/(what did i miss|missed class|missed lecture|open (my )?missed lecture)/.test(text)) {
      return { type: "ACADEMIC_QUERY", intent: "QUERY_MISSED_CLASS", rawText: transcript };
    }

    // 4. Quiz Commands
    if (/(read (the )?question|repeat (the )?question|what is the question)/.test(text)) {
      return { type: "QUIZ_ACTION", intent: "QUIZ_READ_QUESTION", rawText: transcript };
    }
    const optionMatch = text.match(/(select|choose|option|pick) ([a-d]|1|2|3|4)/);
    if (optionMatch) {
      const val = optionMatch[2];
      let optIdx = 0;
      if (val === "a" || val === "1") optIdx = 0;
      else if (val === "b" || val === "2") optIdx = 1;
      else if (val === "c" || val === "3") optIdx = 2;
      else if (val === "d" || val === "4") optIdx = 3;
      return { type: "QUIZ_ACTION", intent: "QUIZ_SELECT_OPTION", payload: optIdx, rawText: transcript };
    }
    if (/(next question|next)/.test(text)) {
      return { type: "QUIZ_ACTION", intent: "QUIZ_NEXT", rawText: transcript };
    }
    if (/(previous question|previous|go back|back)/.test(text)) {
      return { type: "QUIZ_ACTION", intent: "QUIZ_PREV", rawText: transcript };
    }
    if (/(submit quiz|finish quiz|submit assessment|submit)/.test(text)) {
      return { type: "QUIZ_ACTION", intent: "QUIZ_SUBMIT", rawText: transcript };
    }

    // 5. Lecture Commands
    if (/(give me the transcript|generate transcript|show transcript|get transcript)/.test(text)) {
      return { type: "LECTURE_ACTION", intent: "LECTURE_TRANSCRIPT", rawText: transcript };
    }
    if (/(summarize lecture|what is this lecture about|summarize)/.test(text)) {
      return { type: "LECTURE_ACTION", intent: "LECTURE_SUMMARY", rawText: transcript };
    }

    return { type: "UNKNOWN", intent: "UNKNOWN", rawText: transcript };
  },

  /**
   * Execute academic queries using REAL student database records
   */
  async executeAcademicQuery(
    intent: string,
    userId: string,
    navigate: (path: string) => void
  ): Promise<string> {
    if (!userId) {
      return "Please log in to check your academic details.";
    }

    try {
      const context = await studentAnalyticsService.getStudentAcademicContext(userId);
      const classroomId = context.classroomId;

      if (intent === "QUERY_ATTENDANCE") {
        const attendance = await studentAnalyticsService.getStudentAttendanceMetrics(userId, classroomId);
        if (attendance.totalSessions === 0 || attendance.overallAttendancePercentage === null) {
          return "You do not have any recorded attendance sessions yet.";
        }

        const pct = attendance.overallAttendancePercentage;
        const msg = `Your overall attendance is ${pct} percent. You have attended ${attendance.presentSessions} out of ${attendance.totalSessions} scheduled class sessions. ${
          pct < 75 ? "Warning: Your attendance is below the 75 percent minimum requirement." : "Keep up the good attendance!"
        }`;
        return msg;
      }

      if (intent === "QUERY_ASSIGNMENTS") {
        const assignments = await studentAnalyticsService.getStudentAssignmentMetrics(userId, classroomId);
        if (assignments.pendingCount === 0) {
          return "Great news! You have no pending assignments right now.";
        }

        let resp = `You have ${assignments.pendingCount} pending assignment${assignments.pendingCount > 1 ? "s" : ""}.`;
        if (assignments.nextDueAssignment) {
          const due = new Date(assignments.nextDueAssignment.deadline).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          resp += ` Next due is ${assignments.nextDueAssignment.title} for ${assignments.nextDueAssignment.subject}, due on ${due}.`;
        }
        return resp;
      }

      if (intent === "QUERY_PRIORITIES") {
        const priorities = await studentAnalyticsService.getStudentPriorities(userId, classroomId);
        if (priorities.length === 0) {
          return "You are all caught up! No urgent review items right now.";
        }
        const top = priorities[0];
        return `Your highest study priority is: ${top.title}. ${top.reason}`;
      }

      if (intent === "QUERY_WEAK_CONCEPTS") {
        const quizMetrics = await studentAnalyticsService.getStudentQuizMetrics(userId);
        if (!quizMetrics.learningGaps || quizMetrics.learningGaps.length === 0) {
          return "You currently have no identified weak concepts in your quizzes. Great work!";
        }
        const topGaps = quizMetrics.learningGaps.slice(0, 3).map((g) => g.conceptName).join(", ");
        return `Your primary areas needing practice are: ${topGaps}. You can practice them in your assessments or recommended lectures.`;
      }

      if (intent === "QUERY_MISSED_CLASS") {
        const attendance = await studentAnalyticsService.getStudentAttendanceMetrics(userId, classroomId);
        if (!attendance.recentMissedClass) {
          return "You have not missed any recent class sessions.";
        }

        const missed = attendance.recentMissedClass;
        let response = `Your most recently missed session was in ${missed.subjectName} on ${missed.topic}.`;
        if (missed.hasFacultyLecture && missed.facultyLectureId) {
          response += " A faculty video lecture is available for this topic. Opening it now.";
          navigate(`/student/lectures/${missed.facultyLectureId}`);
        } else {
          response += " No recorded lecture has been uploaded for this session yet.";
        }
        return response;
      }

      return "I could not find the information for that query.";
    } catch (err: any) {
      console.error("Error executing voice academic query:", err);
      return "Sorry, I had trouble retrieving your academic data from the database.";
    }
  },
};
