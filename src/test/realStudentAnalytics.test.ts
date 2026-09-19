import { describe, it, expect } from "vitest";
import { studentAnalyticsService, GAP_ACCURACY_THRESHOLD, GAP_MIN_QUESTIONS } from "@/services/studentAnalyticsService";

describe("Student Analytics & Real Learning Data Engine", () => {
  describe("Learning Health Deterministic Calculation", () => {
    it("returns Insufficient Data and null score when no activity data exists", () => {
      const result = studentAnalyticsService.calculateLearningHealth(null, null, 0, 0);
      expect(result.score).toBeNull();
      expect(result.status).toBe("Insufficient Data");
    });

    it("calculates accurate composite score when all signals are available (40% quiz, 30% attendance, 30% assignments)", () => {
      // quiz: 80%, attendance: 100%, assignments: 1/1 = 100%
      // 80 * 0.4 + 100 * 0.3 + 100 * 0.3 = 32 + 30 + 30 = 92%
      const result = studentAnalyticsService.calculateLearningHealth(100, 80, 1, 1);
      expect(result.score).toBe(92);
      expect(result.status).toBe("Optimal");
    });

    it("re-normalizes weights when only quiz signal is present", () => {
      // Only quiz: 50%
      const result = studentAnalyticsService.calculateLearningHealth(null, 50, 0, 0);
      expect(result.score).toBe(50);
      expect(result.status).toBe("Needs Attention");
    });

    it("re-normalizes weights when only attendance and quiz are present", () => {
      // attendance: 0%, quiz: 50%
      // weights: quiz 0.4, attendance 0.3 -> total 0.7
      // (50 * 0.4 + 0 * 0.3) / 0.7 = 20 / 0.7 = 28.57 -> 29%
      const result = studentAnalyticsService.calculateLearningHealth(0, 50, 0, 0);
      expect(result.score).toBe(29);
      expect(result.status).toBe("Needs Attention");
    });

    it("evaluates status categories accurately", () => {
      // Score >= 80 -> Optimal
      expect(studentAnalyticsService.calculateLearningHealth(null, 85, 0, 0).status).toBe("Optimal");
      // Score 65 to 79 -> On Track
      expect(studentAnalyticsService.calculateLearningHealth(null, 70, 0, 0).status).toBe("On Track");
      // Score < 65 -> Needs Attention
      expect(studentAnalyticsService.calculateLearningHealth(null, 60, 0, 0).status).toBe("Needs Attention");
    });
  });

  describe("Student Priorities Ranking Engine", () => {
    it("returns empty priorities list when student has no pending tasks, absences, or gaps", () => {
      const priorities = studentAnalyticsService.getStudentPriorities(
        null,
        {
          totalSessions: 5,
          presentSessions: 5,
          absentSessions: 0,
          overallAttendancePercentage: 100,
          subjectAttendance: [],
          recentMissedClass: null,
        },
        {
          totalAttempts: 3,
          averageScorePercentage: 90,
          subjectScores: [],
          topicMastery: [],
          conceptMasteryList: [],
          learningGaps: [],
        },
        {
          totalAssignments: 2,
          pendingCount: 0,
          submittedCount: 2,
          overdueCount: 0,
          urgentCount: 0,
          nextDueAssignment: null,
          assignmentsList: [],
        }
      );

      expect(priorities).toHaveLength(0);
    });

    it("ranks urgent assignment as HIGH priority", () => {
      const priorities = studentAnalyticsService.getStudentPriorities(
        null,
        {
          totalSessions: 0,
          presentSessions: 0,
          absentSessions: 0,
          overallAttendancePercentage: null,
          subjectAttendance: [],
          recentMissedClass: null,
        },
        {
          totalAttempts: 0,
          averageScorePercentage: null,
          subjectScores: [],
          topicMastery: [],
          conceptMasteryList: [],
          learningGaps: [],
        },
        {
          totalAssignments: 1,
          pendingCount: 1,
          submittedCount: 0,
          overdueCount: 0,
          urgentCount: 1,
          nextDueAssignment: {
            id: "asgn-123",
            title: "Operating Systems Lab 1",
            subject: "Operating Systems",
            topic: "Process Scheduling",
            deadline: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
            maxMarks: 20,
            isUrgent: true,
          },
          assignmentsList: [],
        }
      );

      expect(priorities.length).toBeGreaterThan(0);
      expect(priorities[0].category).toBe("ASSIGNMENT");
      expect(priorities[0].priority).toBe("HIGH");
      expect(priorities[0].actionUrl).toBe("/student/assignments");
      expect(priorities[0].whyDetails.signals.length).toBeGreaterThan(0);
    });

    it("ranks missed class recovery with faculty lecture link", () => {
      const priorities = studentAnalyticsService.getStudentPriorities(
        null,
        {
          totalSessions: 1,
          presentSessions: 0,
          absentSessions: 1,
          overallAttendancePercentage: 0,
          subjectAttendance: [],
          recentMissedClass: {
            sessionId: "sess-1",
            date: "2026-09-19",
            subjectName: "Data Structures and Algorithms",
            topic: "2 pointers",
            conceptsTaught: ["Two pointers"],
            hasFacultyLecture: true,
            facultyLectureId: "lec-123",
            facultyLectureTitle: "Two Pointers in 7 minutes",
            facultyLectureVideoId: "QzZ7nmouLTI",
          },
        },
        {
          totalAttempts: 0,
          averageScorePercentage: null,
          subjectScores: [],
          topicMastery: [],
          conceptMasteryList: [],
          learningGaps: [],
        },
        {
          totalAssignments: 0,
          pendingCount: 0,
          submittedCount: 0,
          overdueCount: 0,
          urgentCount: 0,
          nextDueAssignment: null,
          assignmentsList: [],
        }
      );

      const missedAction = priorities.find((p) => p.category === "MISSED_CLASS");
      expect(missedAction).toBeDefined();
      expect(missedAction?.actionLabel).toBe("Watch Faculty Lecture");
      expect(missedAction?.actionUrl).toContain("/student/lectures?topic=");
    });

    it("ranks real learning gap as practice action", () => {
      const priorities = studentAnalyticsService.getStudentPriorities(
        null,
        {
          totalSessions: 0,
          presentSessions: 0,
          absentSessions: 0,
          overallAttendancePercentage: null,
          subjectAttendance: [],
          recentMissedClass: null,
        },
        {
          totalAttempts: 1,
          averageScorePercentage: 50,
          subjectScores: [],
          topicMastery: [],
          conceptMasteryList: [],
          learningGaps: [
            {
              conceptName: "Two pointers",
              subject: "Data Structures and Algorithms",
              topic: "2 pointers",
              masteryPercentage: 50,
              totalQuestions: 2,
              correctCount: 1,
              reason: "Recent accuracy was 50%",
            },
          ],
        },
        {
          totalAssignments: 0,
          pendingCount: 0,
          submittedCount: 0,
          overdueCount: 0,
          urgentCount: 0,
          nextDueAssignment: null,
          assignmentsList: [],
        }
      );

      const gapAction = priorities.find((p) => p.category === "LEARNING_GAP");
      expect(gapAction).toBeDefined();
      expect(gapAction?.priority).toBe("HIGH");
      expect(gapAction?.actionUrl).toContain("/student/quizzes?concept=");
      expect(gapAction?.actionLabel).toBe("Take Practice Quiz");
    });
  });

  describe("Gap Detection Thresholds", () => {
    it("enforces GAP_ACCURACY_THRESHOLD at 65% and minimum questions at 2", () => {
      expect(GAP_ACCURACY_THRESHOLD).toBe(65);
      expect(GAP_MIN_QUESTIONS).toBe(2);
    });
  });
});
