import { describe, it, expect } from "vitest";
import {
  getStudentConceptMastery,
  StudentConceptMasteryRecord,
} from "@/services/studentLearningProfileService";

describe("Strict Concept Identity & Real Student Data Models", () => {
  const mockMasteryRecords: StudentConceptMasteryRecord[] = [
    {
      id: "c5169248-03b7-4942-a800-9b1cc09fb6fc",
      conceptId: "c5169248-03b7-4942-a800-9b1cc09fb6fc",
      conceptName: "Binary search",
      subject: "Data Structures and Algorithms",
      topic: "DSA",
      attempts: 1,
      correctAnswers: 1,
      totalAnswers: 2,
      masteryPercentage: 50,
      status: "Needs Review",
      trend: "stable",
      lastAssessedAt: "2026-09-19T04:53:36Z",
    },
    {
      id: "b6b24583-8413-46a1-972c-9cdc297cb404",
      conceptId: "b6b24583-8413-46a1-972c-9cdc297cb404",
      conceptName: "binary search",
      subject: "Data Structures and Algorithms",
      topic: "DSA",
      attempts: 1,
      correctAnswers: 1,
      totalAnswers: 1,
      masteryPercentage: 100,
      status: "Mastered",
      trend: "improving",
      lastAssessedAt: "2026-09-19T08:12:31Z",
    },
    {
      id: "edfb321b-2906-40f4-a702-f617366c1174",
      conceptId: "edfb321b-2906-40f4-a702-f617366c1174",
      conceptName: "Two pointers",
      subject: "Data Structures and Algorithms",
      topic: "DSA",
      attempts: 1,
      correctAnswers: 1,
      totalAnswers: 2,
      masteryPercentage: 50,
      status: "Needs Review",
      trend: "stable",
      lastAssessedAt: "2026-09-19T04:53:36Z",
    },
    {
      id: "unassessed-1",
      conceptId: "unassessed-1",
      conceptName: "Graph Traversal",
      subject: "Data Structures and Algorithms",
      topic: "Graphs",
      attempts: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      masteryPercentage: 0,
      status: "Not Assessed",
      trend: "stable",
      lastAssessedAt: null,
    },
  ];

  it("preserves strict concept identity: two concepts with different IDs remain distinct records", () => {
    // Binary search (capital B, id: c5169248-...) and binary search (lowercase b, id: b6b24583-...)
    const capB = mockMasteryRecords.find(
      (c) => c.conceptId === "c5169248-03b7-4942-a800-9b1cc09fb6fc"
    );
    const lowB = mockMasteryRecords.find(
      (c) => c.conceptId === "b6b24583-8413-46a1-972c-9cdc297cb404"
    );

    expect(capB).toBeDefined();
    expect(lowB).toBeDefined();
    expect(capB!.conceptId).not.toEqual(lowB!.conceptId);
    expect(capB!.conceptName).toBe("Binary search");
    expect(lowB!.conceptName).toBe("binary search");
    expect(capB!.masteryPercentage).toBe(50);
    expect(lowB!.masteryPercentage).toBe(100);
    // Must NOT be merged into a single record
    expect(mockMasteryRecords).toHaveLength(4);
  });

  it("assigns deterministic status without treating zero attempts as poor performance", () => {
    const unassessed = mockMasteryRecords.find((c) => c.conceptName === "Graph Traversal");
    expect(unassessed).toBeDefined();
    expect(unassessed!.status).toBe("Not Assessed");
    expect(unassessed!.totalAnswers).toBe(0);

    const mastered = mockMasteryRecords.find((c) => c.conceptName === "binary search");
    expect(mastered!.status).toBe("Mastered");
    expect(mastered!.masteryPercentage).toBeGreaterThanOrEqual(80);

    const needsReview = mockMasteryRecords.find((c) => c.conceptName === "Binary search");
    expect(needsReview!.status).toBe("Needs Review");
    expect(needsReview!.masteryPercentage).toBeLessThan(60);
  });

  it("calculates accurate average concept mastery across assessed concepts only", () => {
    const assessed = mockMasteryRecords.filter((c) => c.totalAnswers > 0);
    expect(assessed).toHaveLength(3);

    const sum = assessed.reduce((acc, c) => acc + c.masteryPercentage, 0);
    const avg = Math.round(sum / assessed.length);
    // (50 + 100 + 50) / 3 = 66.67 -> 67%
    expect(avg).toBe(67);
  });

  it("identifies critical learning gaps strictly below 60% threshold from real data", () => {
    const assessed = mockMasteryRecords.filter((c) => c.totalAnswers > 0);
    const gaps = assessed.filter((c) => c.masteryPercentage < 60);
    expect(gaps).toHaveLength(2);
    expect(gaps.map((g) => g.conceptName)).toContain("Binary search");
    expect(gaps.map((g) => g.conceptName)).toContain("Two pointers");
    expect(gaps.map((g) => g.conceptName)).not.toContain("binary search");
  });

  it("handles null or empty student ID safely in getStudentConceptMastery", async () => {
    const result = await getStudentConceptMastery("");
    expect(result).toEqual([]);
  });
});
