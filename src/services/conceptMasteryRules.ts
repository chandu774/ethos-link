/**
 * Centralized Concept Mastery and Performance Analysis Rules
 * Strictly follows requirements:
 * - Deterministic status calculation (never arbitrary LLM classification).
 * - Sufficient evidence required: A single wrong answer NEVER marks a concept as weak.
 * - Historical trend tracking across multiple quiz attempts.
 */

export type ConceptMasteryStatus = "Strong" | "Developing" | "Needs Practice" | "Weak";
export type PerformanceTrend = "improving" | "declining" | "stable";

export interface ConceptMasteryThresholds {
  minQuestionsForWeak: number;
  strongMinAccuracy: number;
  developingMinAccuracy: number;
  needsPracticeMinAccuracy: number;
  trendDeltaThreshold: number;
}

export const DEFAULT_MASTERY_THRESHOLDS: ConceptMasteryThresholds = {
  minQuestionsForWeak: 3,
  strongMinAccuracy: 80,
  developingMinAccuracy: 60,
  needsPracticeMinAccuracy: 40,
  trendDeltaThreshold: 8,
};

/**
 * Calculates mastery status deterministically based on historical evidence.
 * Rule: Single questions or low question counts will NEVER classify a concept as Weak.
 */
export function calculateConceptStatus(
  accuracy: number,
  totalQuestions: number,
  thresholds: ConceptMasteryThresholds = DEFAULT_MASTERY_THRESHOLDS
): ConceptMasteryStatus {
  // Requirement 12 & 14: Require sufficient evidence before classifying as Weak
  if (totalQuestions < thresholds.minQuestionsForWeak) {
    if (accuracy >= thresholds.strongMinAccuracy && totalQuestions >= 2) {
      return "Strong";
    }
    return "Developing";
  }

  if (accuracy >= thresholds.strongMinAccuracy) {
    return "Strong";
  }
  if (accuracy >= thresholds.developingMinAccuracy) {
    return "Developing";
  }
  if (accuracy >= thresholds.needsPracticeMinAccuracy) {
    return "Needs Practice";
  }
  return "Weak";
}

/**
 * Calculates trend by comparing latest assessment accuracy to historical average.
 */
export function calculatePerformanceTrend(
  latestAccuracy: number,
  historicalAccuracy: number,
  thresholds: ConceptMasteryThresholds = DEFAULT_MASTERY_THRESHOLDS
): PerformanceTrend {
  const diff = latestAccuracy - historicalAccuracy;
  if (diff >= thresholds.trendDeltaThreshold) {
    return "improving";
  }
  if (diff <= -thresholds.trendDeltaThreshold) {
    return "declining";
  }
  return "stable";
}

export interface ConceptAttemptSummary {
  concept: string;
  total: number;
  correct: number;
  accuracy: number;
}

/**
 * Deterministically groups student answers by concept and computes accuracy.
 */
export function aggregateAttemptConcepts(
  answers: Array<{
    concept: string;
    is_correct: boolean;
  }>
): Record<string, ConceptAttemptSummary> {
  const map: Record<string, { total: number; correct: number }> = {};

  answers.forEach((ans) => {
    const rawConcept = ans.concept?.trim() || "Core Concepts";
    if (!map[rawConcept]) {
      map[rawConcept] = { total: 0, correct: 0 };
    }
    map[rawConcept].total += 1;
    if (ans.is_correct) {
      map[rawConcept].correct += 1;
    }
  });

  const result: Record<string, ConceptAttemptSummary> = {};
  Object.entries(map).forEach(([concept, stats]) => {
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    result[concept] = {
      concept,
      total: stats.total,
      correct: stats.correct,
      accuracy,
    };
  });

  return result;
}
