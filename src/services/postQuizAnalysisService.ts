/**
 * Post-Quiz Evidence-Based Learning Analysis Service
 * Strictly follows Requirements 9, 10, and 16:
 * - Deterministic mistake explanation based strictly on question, chosen option, correct option, and concept.
 * - Hallucination-free AI summary analyzing ONLY evidence present in the attempt.
 * - Actionable recommended next steps.
 */

import api from "@/lib/apiClient";

export interface QuestionMistake {
  questionId: string;
  question: string;
  concept: string;
  studentAnswer: string;
  correctAnswer: string;
  explanation: string;
  whatToUnderstand: string;
}

export interface PostQuizAnalysisInput {
  quizTitle: string;
  subject: string;
  topic: string;
  score: number;
  maxScore: number;
  percentage: number;
  conceptBreakdown: Array<{
    concept: string;
    total: number;
    correct: number;
    accuracy: number;
  }>;
  mistakes: QuestionMistake[];
}

export interface PostQuizAnalysisResult {
  summary: string;
  conceptBreakdown: Array<{
    concept: string;
    total: number;
    correct: number;
    accuracy: number;
  }>;
  needsAttention: Array<{
    concept: string;
    accuracy: number;
    reason: string;
  }>;
  aiExplanation: string;
  recommendedNextSteps: string[];
}

/**
 * Builds deterministic mistake explanations for each wrong question.
 */
export function buildMistakeExplanation(
  question: string,
  concept: string,
  studentAnswer: string,
  correctAnswer: string,
  baseExplanation?: string
): { explanation: string; whatToUnderstand: string } {
  const explanation =
    baseExplanation ||
    `You selected "${studentAnswer}", whereas the correct answer is "${correctAnswer}".`;

  const whatToUnderstand = `For ${concept}, remember: ${correctAnswer}. Make sure you understand how ${concept} applies in ${question.slice(0, 60)}...`;

  return { explanation, whatToUnderstand };
}

/**
 * Analyzes real student attempt evidence to generate a concise, grounded post-quiz diagnosis.
 */
export async function generatePostQuizAnalysis(
  input: PostQuizAnalysisInput
): Promise<PostQuizAnalysisResult> {
  const { quizTitle, subject, topic, score, maxScore, percentage, conceptBreakdown, mistakes } =
    input;

  // 1. Identify concepts needing attention (accuracy < 60%)
  const needsAttention = conceptBreakdown
    .filter((c) => c.accuracy < 60)
    .map((c) => ({
      concept: c.concept,
      accuracy: c.accuracy,
      reason:
        c.accuracy < 40
          ? `Significant difficulty detected in ${c.concept} (${c.correct}/${c.total} correct).`
          : `Needs further practice in ${c.concept} (${c.correct}/${c.total} correct).`,
    }));

  // 2. Deterministic baseline explanation
  let fallbackExplanation = "";
  if (mistakes.length === 0) {
    fallbackExplanation = `Outstanding work! You demonstrated complete mastery across all assessed concepts in ${topic}, achieving a perfect score of ${score}/${maxScore} (${percentage}%).`;
  } else {
    const weakConcepts = needsAttention.map((n) => n.concept);
    const strongConcepts = conceptBreakdown
      .filter((c) => c.accuracy >= 80)
      .map((c) => c.concept);

    fallbackExplanation = `In this assessment on ${topic} (${score}/${maxScore}, ${percentage}%), `;
    if (strongConcepts.length > 0) {
      fallbackExplanation += `you showed good understanding of ${strongConcepts.join(", ")}, `;
    }
    if (weakConcepts.length > 0) {
      fallbackExplanation += `but your primary difficulty occurred in ${weakConcepts.join(", ")}. Specifically, reviewing questions involving ${weakConcepts[0]} will significantly improve your diagnostic mastery.`;
    } else {
      fallbackExplanation += `you showed developing mastery across concepts with minor gaps to close.`;
    }
  }

  // 3. Optional AI Synthesis (Grounded strictly on evidence)
  let aiExplanation = fallbackExplanation;

  if (mistakes.length > 0) {
    try {
      const systemPrompt = `You are Synapse Academic AI Diagnostics.
You must provide a CONCISE, 2-3 sentence learning analysis based STRICTLY on the student's actual attempt evidence.
CRITICAL RULES:
1. ONLY reference the concepts and questions present in the assessment evidence.
2. DO NOT invent misconceptions or reference unassessed topics.
3. Keep the tone encouraging, diagnostic, and actionable.`;

      const userEvidence = `Assessment: ${quizTitle}
Subject: ${subject}
Topic: ${topic}
Score: ${score}/${maxScore} (${percentage}%)
Concept Breakdown:
${conceptBreakdown.map((c) => `- ${c.concept}: ${c.correct}/${c.total} (${c.accuracy}%)`).join("\n")}

Incorrect Question Evidence:
${mistakes.map((m, idx) => `Q${idx + 1}: [Concept: ${m.concept}] Question: "${m.question}" -> Student chose: "${m.studentAnswer}" (Incorrect), Correct: "${m.correctAnswer}"`).join("\n")}`;

      const res = await api.post<any>("/ai/chat", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze the student's mistakes:\n${userEvidence}` },
        ],
      });

      if (res && res.text && res.text.trim().length > 30) {
        aiExplanation = res.text.trim();
      }
    } catch (err) {
      console.warn("AI post-quiz analysis fallback trigger:", err);
    }
  }

  // 4. Formulate Actionable Recommended Next Steps
  const recommendedNextSteps: string[] = [];
  if (needsAttention.length > 0) {
    const primaryGap = needsAttention[0].concept;
    recommendedNextSteps.push(`Review core definitions and rules for ${primaryGap}`);
    recommendedNextSteps.push(`Practice targeted problems distinguishing ${primaryGap} violations`);
    recommendedNextSteps.push(`Attempt a follow-up assessment on ${topic} to confirm mastery growth`);
  } else {
    recommendedNextSteps.push(`Explore advanced applied problems in ${topic}`);
    recommendedNextSteps.push(`Proceed to the next chapter milestone in ${subject}`);
  }

  return {
    summary: `Assessment Score: ${score}/${maxScore} (${percentage}%)`,
    conceptBreakdown,
    needsAttention,
    aiExplanation,
    recommendedNextSteps,
  };
}
