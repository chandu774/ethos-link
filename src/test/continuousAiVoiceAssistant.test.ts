import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { voiceAssistantService } from "@/services/voiceAssistantService";

describe("Synapse Siri AI Voice Assistant System", () => {
  it("identifies explicit stop voice commands reliably", () => {
    expect(voiceAssistantService.isStopCommand("stop")).toBe(true);
    expect(voiceAssistantService.isStopCommand("STOP")).toBe(true);
    expect(voiceAssistantService.isStopCommand("stop voice")).toBe(true);
    expect(voiceAssistantService.isStopCommand("stop voice mode")).toBe(true);
    expect(voiceAssistantService.isStopCommand("stop listening")).toBe(true);
    expect(voiceAssistantService.isStopCommand("turn off voice")).toBe(true);
    expect(voiceAssistantService.isStopCommand("exit voice")).toBe(true);
    expect(voiceAssistantService.isStopCommand("be quiet")).toBe(true);

    // Non-stop commands
    expect(voiceAssistantService.isStopCommand("Open dashboard")).toBe(false);
    expect(voiceAssistantService.isStopCommand("What is my attendance?")).toBe(false);
  });

  it("can navigate anywhere across the entire Synapse app via Siri", async () => {
    // 1. Tasks
    const resTasks = await supabase.functions.invoke("voice-assistant", {
      body: {
        query: "Take me to my tasks",
        currentPath: "/student/dashboard",
      },
    });
    expect(resTasks.data?.action?.type).toBe("NAVIGATE");
    expect(resTasks.data?.action?.payload?.path).toBe("/student/tasks");

    // 2. Attendance recovery
    const resRecovery = await supabase.functions.invoke("voice-assistant", {
      body: {
        query: "Show attendance recovery",
        currentPath: "/student/dashboard",
      },
    });
    expect(resRecovery.data?.action?.type).toBe("NAVIGATE");
    expect(resRecovery.data?.action?.payload?.path).toBe("/student/attendance-recovery");

    // 3. Opportunities / Internships
    const resOpp = await supabase.functions.invoke("voice-assistant", {
      body: {
        query: "Find internships and opportunities",
        currentPath: "/student/dashboard",
      },
    });
    expect(resOpp.data?.action?.type).toBe("NAVIGATE");
    expect(resOpp.data?.action?.payload?.path).toBe("/student/opportunities");
  }, 30000);

  it("answers student queries related to ANY topic in the universe", async () => {
    // Run queries concurrently to test multi-topic breadth without serial latency
    const [resBcnf, resBio] = await Promise.all([
      supabase.functions.invoke("voice-assistant", {
        body: {
          query: "What is Boyce Codd Normal Form?",
          currentPath: "/student/learning",
        },
      }),
      supabase.functions.invoke("voice-assistant", {
        body: {
          query: "How does photosynthesis convert light energy?",
          currentPath: "/student/dashboard",
        },
      }),
    ]);

    expect(resBcnf.error).toBeNull();
    expect(resBcnf.data.action.type).toBe("NONE");
    expect(resBcnf.data.spokenResponse.length).toBeGreaterThan(15);

    expect(resBio.error).toBeNull();
    expect(resBio.data.action.type).toBe("NONE");
    expect(resBio.data.spokenResponse.toLowerCase()).toMatch(/(plant|light|energy|glucose|chlorophyll|process|food|chemical|solar)/);
  }, 60000);

  it("answers live student database queries with Siri intelligence", async () => {
    const { data, error } = await supabase.functions.invoke("voice-assistant", {
      body: {
        query: "How is my attendance doing?",
        currentPath: "/student/dashboard",
        studentContext: {
          studentName: "Alex Chen",
          attendancePercentage: 92,
          totalAttendanceSessions: 25,
          presentSessions: 23,
        },
      },
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.spokenResponse.toLowerCase()).toMatch(/(attendance|92|percent)/);
  }, 30000);

  it("handles active quiz voice interaction with contextual question state", async () => {
    const { data, error } = await supabase.functions.invoke("voice-assistant", {
      body: {
        query: "I want to select option B",
        currentPath: "/student/quizzes/123",
        pageContext: {
          quiz: {
            title: "Database Normalization Quiz",
            currentQuestionIndex: 0,
            totalQuestions: 5,
            currentQuestionText: "Which normal form removes transitive dependencies?",
            options: ["1NF", "2NF", "3NF", "BCNF"],
          },
        },
      },
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.action.type).toBe("QUIZ_SELECT_OPTION");
    expect(data.action.payload.optionIndex).toBe(1);
  }, 30000);

  it("executes Siri synthesized audio chimes safely without throwing", () => {
    expect(() => voiceAssistantService.playActivationChime()).not.toThrow();
    expect(() => voiceAssistantService.playStopChime()).not.toThrow();
  });
});
