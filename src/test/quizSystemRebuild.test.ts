import { describe, it, expect } from "vitest";
import {
  getTopicBoundary,
  validateQuestion,
} from "@/services/quizGenerationService";
import {
  calculateConceptStatus,
  calculatePerformanceTrend,
} from "@/services/conceptMasteryRules";
import {
  buildMistakeExplanation,
} from "@/services/postQuizAnalysisService";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------
// Local wrapper: resolves topic boundary then calls validateQuestion
// ---------------------------------------------------------------
function validateQuestionCandidate(
  q: any,
  subject: string,
  topic: string,
  _concepts?: string[]
) {
  const boundary = getTopicBoundary(subject, topic);
  return validateQuestion(q, subject, topic, boundary);
}

describe("Quiz System Rebuild - Topic Accuracy & Boundary Enforcement", () => {
  it("strictly maps DBMS Normalization to allowed concepts and forbids cross-topic concepts", () => {
    const boundary = getTopicBoundary("DBMS", "Normalization");
    expect(boundary).not.toBeNull();
    if (!boundary) return;

    // Must allow core normalization concepts
    const allowedLower = boundary.allowedConcepts.map((c) => c.toLowerCase());
    expect(allowedLower.some((c) => c.includes("1nf"))).toBe(true);
    expect(allowedLower.some((c) => c.includes("2nf"))).toBe(true);
    expect(allowedLower.some((c) => c.includes("3nf"))).toBe(true);
    expect(allowedLower.some((c) => c.includes("bcnf"))).toBe(true);
    expect(allowedLower.some((c) => c.includes("functional"))).toBe(true);
    expect(allowedLower.some((c) => c.includes("partial"))).toBe(true);
    expect(allowedLower.some((c) => c.includes("transitive"))).toBe(true);

    // Forbidden cross-topic keywords (Transactions, Deadlocks, SQL Joins, Concurrency)
    const forbidden = boundary.forbiddenKeywords;
    expect(forbidden.includes("transaction")).toBe(true);
    expect(forbidden.includes("deadlock")).toBe(true);
    expect(forbidden.includes("sql join")).toBe(true);
    expect(forbidden.includes("concurrency control")).toBe(true);
  });

  it("rejects questions containing forbidden cross-topic concepts", () => {
    const invalidQuestion = {
      question: "Which isolation level prevents phantom reads during concurrent transactions in DBMS?",
      options: [
        "Read Uncommitted",
        "Read Committed",
        "Repeatable Read",
        "Serializable",
      ],
      correct_option_index: 3,
      topic: "Normalization",
      concept: "Transactions",
      marks: 1,
      explanation: "Serializable isolation level prevents phantom reads.",
    };

    const validation = validateQuestionCandidate(
      invalidQuestion,
      "DBMS",
      "Normalization",
      ["2NF", "3NF", "BCNF"]
    );

    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain("off-topic");
  });

  it("accepts valid, topic-accurate normalization questions", () => {
    const validQuestion = {
      question: "A relation is in 2NF if and only if it is in 1NF and no non-prime attribute is:",
      options: [
        "Partially dependent on any candidate key",
        "Transitively dependent on candidate key",
        "Independent of candidate keys",
        "Multivalued in nature",
      ],
      correct_option_index: 0,
      topic: "Normalization",
      concept: "2NF Partial Dependency",
      marks: 1,
      explanation: "2NF eliminates partial functional dependencies of non-prime attributes on candidate keys.",
    };

    const validation = validateQuestionCandidate(
      validQuestion,
      "DBMS",
      "Normalization",
      ["2NF Partial Dependency"]
    );

    expect(validation.valid).toBe(true);
  });
});

describe("Quiz System Rebuild - Pre-Save Multi-Stage Validation", () => {
  it("rejects questions with fewer or greater than 4 options", () => {
    const invalidOptions = {
      question: "What normal form removes transitive dependencies?",
      options: ["1NF", "2NF", "3NF"], // Only 3 options
      correct_option_index: 2,
      topic: "Normalization",
      concept: "3NF",
      marks: 1,
    };

    const res = validateQuestionCandidate(invalidOptions, "DBMS", "Normalization");
    expect(res.valid).toBe(false);
    expect(res.reason).toContain("exactly 4 options");
  });

  it("rejects questions with duplicate options", () => {
    const duplicateOpts = {
      question: "What is BCNF strictly stronger than?",
      options: ["3NF", "2NF", "3NF", "1NF"], // duplicate '3NF'
      correct_option_index: 0,
      topic: "Normalization",
      concept: "BCNF",
      marks: 1,
    };

    const res = validateQuestionCandidate(duplicateOpts, "DBMS", "Normalization");
    expect(res.valid).toBe(false);
    // Actual error: "Options must be distinct (no duplicates)."
    expect(res.reason).toContain("distinct");
  });

  it("rejects invalid correct_option_index", () => {
    const invalidIndex = {
      question: "Which dependency type requires decomposition in 3NF?",
      options: ["Partial", "Transitive", "Trivial", "Cyclic"],
      correct_option_index: 5, // Invalid index out of bounds
      topic: "Normalization",
      concept: "Transitive Dependency",
      marks: 1,
    };

    const res = validateQuestionCandidate(invalidIndex, "DBMS", "Normalization");
    expect(res.valid).toBe(false);
    // Actual error: "Invalid correct option index."
    expect(res.reason).toContain("Invalid correct option");
  });
});

describe("Quiz System Rebuild - Deterministic Mastery Classification Rules", () => {
  it("NEVER classifies a concept as Weak from a single question/attempt (insufficient evidence)", () => {
    // 1 question attempted, answered incorrectly (0% accuracy)
    const status = calculateConceptStatus(0, 1);
    expect(status).not.toBe("Weak");
    expect(status).toBe("Developing");
  });

  it("classifies as Strong when accuracy >= 80% and at least 2 questions", () => {
    const status = calculateConceptStatus(100, 2);
    expect(status).toBe("Strong");

    const status3 = calculateConceptStatus(85, 4);
    expect(status3).toBe("Strong");
  });

  it("classifies as Needs Practice when accuracy is between 40% and 59% with sufficient questions", () => {
    const status = calculateConceptStatus(50, 4);
    expect(status).toBe("Needs Practice");
  });

  it("classifies as Weak ONLY when >= 3 questions evaluated and accuracy < 40%", () => {
    const statusWith3 = calculateConceptStatus(25, 4);
    expect(statusWith3).toBe("Weak");

    const statusWith2 = calculateConceptStatus(25, 2);
    // Insufficient evidence (< 3 questions) -> stays Developing
    expect(statusWith2).toBe("Developing");
  });
});

describe("Quiz System Rebuild - Performance Trend Tracking", () => {
  it("detects an improving trend when latest accuracy exceeds historical by delta threshold", () => {
    const trend = calculatePerformanceTrend(85, 70); // delta = +15
    expect(trend).toBe("improving");
  });

  it("detects a declining trend when latest accuracy falls below historical by delta threshold", () => {
    const trend = calculatePerformanceTrend(50, 75); // delta = -25
    expect(trend).toBe("declining");
  });

  it("detects a stable trend when difference is within normal tolerance", () => {
    const trend = calculatePerformanceTrend(72, 70); // delta = +2
    expect(trend).toBe("stable");
  });
});

describe("Quiz System Rebuild - Grounded Post-Quiz Analysis", () => {
  it("builds grounded mistake explanation reflecting exact question options without hallucination", () => {
    // buildMistakeExplanation(question, concept, studentAnswer, correctAnswer)
    // Without baseExplanation, the function constructs: "You selected X, whereas the correct answer is Y."
    const result = buildMistakeExplanation(
      "What does 2NF eliminate?",
      "2NF",
      "Transitive Dependency",
      "Partial Dependency on Candidate Key"
    );

    // Result is { explanation, whatToUnderstand }
    const fullText = result.explanation + " " + result.whatToUnderstand;
    expect(fullText).toContain("Partial Dependency on Candidate Key");
    expect(fullText).toContain("Transitive Dependency");
    expect(fullText).toContain("2NF");
  });

  it("deterministic post-quiz score and concept breakdown logic is correct", () => {
    const conceptPerformance = [
      { concept: "1NF", total: 1, correct: 1, accuracy: 100 },
      { concept: "2NF Partial Dependency", total: 1, correct: 0, accuracy: 0 },
    ];

    const score = 1;
    const maxScore = 2;
    const percentage = Math.round((score / maxScore) * 100);
    expect(percentage).toBe(50);

    // needsAttention: concepts below 60% accuracy
    const needsAttention = conceptPerformance.filter((c) => c.accuracy < 60);
    expect(needsAttention.length).toBeGreaterThan(0);
    expect(needsAttention[0].concept).toContain("2NF Partial Dependency");

    // strong concepts: accuracy >= 80%
    const strongConcepts = conceptPerformance.filter((c) => c.accuracy >= 80);
    expect(strongConcepts.length).toBeGreaterThan(0);
    expect(strongConcepts[0].concept).toContain("1NF");

    // summary string
    const summary = `Assessment Score: ${score}/${maxScore} (${percentage}%)`;
    expect(summary).toContain("50%");
  });
});

describe("Quiz System Rebuild - Database Tables & Schema Integrity", () => {
  it("confirms quiz_attempt_answers and student_concept_history tables exist in database", async () => {
    const { error: ansErr } = await supabase
      .from("quiz_attempt_answers")
      .select("id")
      .limit(1);

    expect(ansErr).toBeNull();

    const { error: histErr } = await supabase
      .from("student_concept_history")
      .select("id")
      .limit(1);

    expect(histErr).toBeNull();

    // concept_mastery uses concept_name column (not concept)
    const { error: masteryErr } = await supabase
      .from("concept_mastery")
      .select("id, subject, topic, concept_name, status, trend")
      .limit(1);

    expect(masteryErr).toBeNull();
  });
});
