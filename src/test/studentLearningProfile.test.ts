import { describe, it, expect } from "vitest";
import {
  generateTutorRecommendations,
  getKnowledgeStateSummary,
  StudentLearningProfile,
  buildStudentLearningProfile,
} from "@/services/studentLearningProfileService";

describe("Student Learning Profile & Dynamic AI Tutor Personalization", () => {
  const mockStudentWithData: StudentLearningProfile = {
    studentId: "student-123",
    studentName: "Priya Sharma",
    rollNumber: "CS24B012",
    classroomName: "CSE Year 3 - Section A",
    course: "B.Tech",
    branch: "Computer Science",
    courses: [
      { id: "c1", name: "Operating Systems", code: "CS302" },
      { id: "c2", name: "Database Management Systems", code: "CS301" },
      { id: "c3", name: "Computer Networks", code: "CS303" },
    ],
    performanceByCourse: [
      {
        courseName: "Operating Systems",
        courseCode: "CS302",
        quizAverage: 52,
        quizAttemptsCount: 3,
        assignmentAverage: 70,
        assignmentCount: 2,
        submittedCount: 2,
      },
      {
        courseName: "Database Management Systems",
        courseCode: "CS301",
        quizAverage: 88,
        quizAttemptsCount: 4,
        assignmentAverage: 90,
        assignmentCount: 3,
        submittedCount: 3,
      },
    ],
    weakAreas: [
      {
        subject: "Operating Systems",
        topic: "Memory Management",
        concept: "Multi-level Paging",
        accuracy: 45,
        totalQuestions: 4,
        correctCount: 1,
        evidence: "1/4 correct (45%) in Multi-level Paging",
      },
    ],
    strongAreas: [
      {
        subject: "Database Management Systems",
        topic: "Indexing",
        concept: "B+ Trees",
        accuracy: 92,
        totalQuestions: 5,
        correctCount: 4,
      },
    ],
    recentPerformance: [
      {
        id: "q-1",
        type: "quiz",
        title: "OS Virtual Memory Checkpoint",
        subject: "Operating Systems",
        scorePercentage: 50,
        completedAt: new Date().toISOString(),
      },
    ],
    upcomingAssignments: [
      {
        id: "asg-1",
        title: "Process Scheduling Simulation",
        subject: "Operating Systems",
        topic: "CPU Scheduling",
        deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
        daysRemaining: 2,
        isUrgent: true,
      },
    ],
    overallQuizAverage: 70,
    hasSufficientData: true,
  };

  const mockNewStudent: StudentLearningProfile = {
    studentId: "student-new",
    studentName: "Rahul Verma",
    rollNumber: "CS25B001",
    classroomName: "CSE Year 1 - Section B",
    course: "B.Tech",
    branch: "Computer Science",
    courses: [
      { id: "c1", name: "Data Structures", code: "CS201" },
      { id: "c2", name: "Digital Logic Design", code: "CS202" },
    ],
    performanceByCourse: [],
    weakAreas: [],
    strongAreas: [],
    recentPerformance: [],
    upcomingAssignments: [],
    overallQuizAverage: null,
    hasSufficientData: false,
  };

  it("calculates dynamic knowledge state summary for student with weak areas and upcoming tasks", () => {
    const summary = getKnowledgeStateSummary(mockStudentWithData, "All Courses");
    expect(summary.hasData).toBe(true);
    expect(summary.title).toBe("Learning Insight");
    expect(summary.detail).toContain("Multi-level Paging is an area to review (45% accuracy)");
    expect(summary.detail).toContain("Process Scheduling Simulation");
  });

  it("handles new student cleanly without fake percentages or invented weak areas", () => {
    const summary = getKnowledgeStateSummary(mockNewStudent, "All Courses");
    expect(summary.hasData).toBe(false);
    expect(summary.detail).toBe(
      "Complete a few quizzes and assignments to build your personalized learning profile."
    );
    expect(summary.detail).not.toContain("%");
    expect(summary.detail).not.toContain("2NF");
  });

  it("generates deterministic recommendations prioritizing genuine weak areas and deadlines", () => {
    const recs = generateTutorRecommendations(mockStudentWithData, "Operating Systems");
    expect(recs).toHaveLength(4);
    expect(recs[0]).toBe("Explain Multi-level Paging with a simple real-world example");
    expect(recs[1]).toBe("Give me practice questions on Multi-level Paging");
    expect(recs[2]).toContain("Operating Systems");
  });

  it("generates course-aware recommendations for new students using enrolled courses", () => {
    const recs = generateTutorRecommendations(mockNewStudent, "All Courses");
    expect(recs).toHaveLength(4);
    // Must only reference student's actual enrolled courses: Data Structures or Digital Logic Design
    const mentionsEnrolled = recs.some(
      (r) => r.includes("Data Structures") || r.includes("Digital Logic Design")
    );
    expect(mentionsEnrolled).toBe(true);
    // Must NOT mention un-enrolled courses like DBMS or Operating Systems
    expect(recs.some((r) => r.includes("DBMS"))).toBe(false);
    expect(recs.some((r) => r.includes("2NF"))).toBe(false);
  });

  it("adapts knowledge state and prompts when filtering by a strong course", () => {
    const summary = getKnowledgeStateSummary(
      mockStudentWithData,
      "Database Management Systems"
    );
    expect(summary.hasData).toBe(true);
    expect(summary.detail).toContain("B+ Trees (92%)");

    const recs = generateTutorRecommendations(
      mockStudentWithData,
      "Database Management Systems"
    );
    expect(recs.some((r) => r.includes("B+ Trees") || r.includes("Database Management Systems"))).toBe(true);
  });

  it("buildStudentLearningProfile handles non-existent or null student safely", async () => {
    const profile = await buildStudentLearningProfile("");
    expect(profile.studentId).toBe("");
    expect(profile.courses).toEqual([]);
    expect(profile.hasSufficientData).toBe(false);
    expect(profile.overallQuizAverage).toBeNull();
  });
});
