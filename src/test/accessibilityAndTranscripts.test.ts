import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  accessibilityService,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
} from "@/services/accessibilityService";
import { voiceAssistantService } from "@/services/voiceAssistantService";
import { lectureTranscriptService } from "@/services/lectureTranscriptService";

describe("Accessibility and Lecture Transcripts System", () => {
  it("verifies accessibility_preferences and lecture_transcripts database schemas", async () => {
    // Check accessibility_preferences
    const { data: prefs, error: prefsErr } = await supabase
      .from("accessibility_preferences")
      .select("id, user_id, voice_assistance_enabled, transcript_assistance_enabled, speech_rate, text_size, high_contrast, reduced_motion")
      .limit(1);

    expect(prefsErr).toBeNull();
    expect(Array.isArray(prefs)).toBe(true);

    // Check lecture_transcripts
    const { data: transcripts, error: transcriptsErr } = await supabase
      .from("lecture_transcripts")
      .select("id, lecture_id, transcript_text, transcript_segments, summary, key_concepts, language, status")
      .limit(1);

    expect(transcriptsErr).toBeNull();
    expect(Array.isArray(transcripts)).toBe(true);
  });

  it("ensures default accessibility preferences have voice assistance OFF", () => {
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.voice_assistance_enabled).toBe(false);
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.transcript_assistance_enabled).toBe(false);
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.speech_rate).toBe(1.0);
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.text_size).toBe("normal");
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.high_contrast).toBe(false);
  });

  it("parses navigation voice commands accurately", () => {
    const cmdHome = voiceAssistantService.parseCommand("Open home");
    expect(cmdHome.type).toBe("NAVIGATE");
    expect(cmdHome.payload).toBe("/student/dashboard");

    const cmdAssignments = voiceAssistantService.parseCommand("Go to assignments");
    expect(cmdAssignments.type).toBe("NAVIGATE");
    expect(cmdAssignments.payload).toBe("/student/assignments");

    const cmdLectures = voiceAssistantService.parseCommand("Show me lectures");
    expect(cmdLectures.type).toBe("NAVIGATE");
    expect(cmdLectures.payload).toBe("/student/lectures");

    const cmdQuizzes = voiceAssistantService.parseCommand("Open quizzes");
    expect(cmdQuizzes.type).toBe("NAVIGATE");
    expect(cmdQuizzes.payload).toBe("/student/quizzes");

    const cmdProgress = voiceAssistantService.parseCommand("Navigate to progress");
    expect(cmdProgress.type).toBe("NAVIGATE");
    expect(cmdProgress.payload).toBe("/student/progress");
  });

  it("parses academic query voice commands accurately", () => {
    const cmdAtt = voiceAssistantService.parseCommand("What's my attendance?");
    expect(cmdAtt.type).toBe("ACADEMIC_QUERY");
    expect(cmdAtt.intent).toBe("QUERY_ATTENDANCE");

    const cmdAssign = voiceAssistantService.parseCommand("What assignments are pending?");
    expect(cmdAssign.type).toBe("ACADEMIC_QUERY");
    expect(cmdAssign.intent).toBe("QUERY_ASSIGNMENTS");

    const cmdPrio = voiceAssistantService.parseCommand("What should I study today?");
    expect(cmdPrio.type).toBe("ACADEMIC_QUERY");
    expect(cmdPrio.intent).toBe("QUERY_PRIORITIES");

    const cmdWeak = voiceAssistantService.parseCommand("What concepts am I weak in?");
    expect(cmdWeak.type).toBe("ACADEMIC_QUERY");
    expect(cmdWeak.intent).toBe("QUERY_WEAK_CONCEPTS");

    const cmdMissed = voiceAssistantService.parseCommand("What did I miss?");
    expect(cmdMissed.type).toBe("ACADEMIC_QUERY");
    expect(cmdMissed.intent).toBe("QUERY_MISSED_CLASS");
  });

  it("parses quiz voice interaction commands accurately", () => {
    const cmdRead = voiceAssistantService.parseCommand("Read the question");
    expect(cmdRead.type).toBe("QUIZ_ACTION");
    expect(cmdRead.intent).toBe("QUIZ_READ_QUESTION");

    const cmdSelectB = voiceAssistantService.parseCommand("Select option B");
    expect(cmdSelectB.type).toBe("QUIZ_ACTION");
    expect(cmdSelectB.intent).toBe("QUIZ_SELECT_OPTION");
    expect(cmdSelectB.payload).toBe(1);

    const cmdSelect3 = voiceAssistantService.parseCommand("Choose 3");
    expect(cmdSelect3.type).toBe("QUIZ_ACTION");
    expect(cmdSelect3.intent).toBe("QUIZ_SELECT_OPTION");
    expect(cmdSelect3.payload).toBe(2);

    const cmdNext = voiceAssistantService.parseCommand("Next question");
    expect(cmdNext.type).toBe("QUIZ_ACTION");
    expect(cmdNext.intent).toBe("QUIZ_NEXT");

    const cmdSubmit = voiceAssistantService.parseCommand("Submit quiz");
    expect(cmdSubmit.type).toBe("QUIZ_ACTION");
    expect(cmdSubmit.intent).toBe("QUIZ_SUBMIT");
  });

  it("parses lecture transcript commands accurately", () => {
    const cmdTrans = voiceAssistantService.parseCommand("Give me the transcript");
    expect(cmdTrans.type).toBe("LECTURE_ACTION");
    expect(cmdTrans.intent).toBe("LECTURE_TRANSCRIPT");

    const cmdSumm = voiceAssistantService.parseCommand("Summarize lecture");
    expect(cmdSumm.type).toBe("LECTURE_ACTION");
    expect(cmdSumm.intent).toBe("LECTURE_SUMMARY");
  });

  it("formats transcript segment timestamps correctly", () => {
    expect(lectureTranscriptService.formatTime(45)).toBe("0:45");
    expect(lectureTranscriptService.formatTime(90)).toBe("1:30");
    expect(lectureTranscriptService.formatTime(3665)).toBe("1:01:05");
  });
});
