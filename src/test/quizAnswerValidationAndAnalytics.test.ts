import { describe, it, expect } from "vitest";
import { getOptionText } from "@/pages/QuizRunner";

describe("Quiz Answer Validation & Student-Specific Analytics", () => {
  describe("Option Normalization & Safe Text Extraction", () => {
    it("safely extracts string options", () => {
      expect(getOptionText("Option A")).toBe("Option A");
      expect(getOptionText("  Two pointers starting from both ends  ")).toBe("Two pointers starting from both ends");
    });

    it("safely extracts object options", () => {
      expect(getOptionText({ text: "Binary search on sorted array" })).toBe("Binary search on sorted array");
      expect(getOptionText({ text: "   Hash table lookup  " })).toBe("Hash table lookup");
    });

    it("handles null, undefined, and non-string values gracefully", () => {
      expect(getOptionText(null)).toBe("");
      expect(getOptionText(undefined)).toBe("");
      expect(getOptionText(42)).toBe("42");
    });
  });

  describe("Option 0 (First Option / Index 0) Selection Preservation", () => {
    it("properly identifies option 0 as answered rather than falsy", () => {
      const selectedAnswers: Record<string, number> = {
        "q-1": 0,
      };

      const qId = "q-1";
      const chosen = selectedAnswers[qId];
      const hasAnswered = chosen !== undefined && chosen !== null;
      expect(hasAnswered).toBe(true);

      const chosenIndex = hasAnswered ? Number(chosen) : null;
      expect(chosenIndex).toBe(0);

      const options = ["First Option A", "Option B", "Option C", "Option D"];
      const chosenText = chosenIndex !== null ? getOptionText(options[chosenIndex]) : "Not Answered";
      expect(chosenText).toBe("First Option A");
    });

    it("correctly evaluates correctness when option 0 is correct and student chose 0", () => {
      const correctOptionIndex = 0;
      const studentChosenIndex = 0;

      const isCorrect = Number(studentChosenIndex) === Number(correctOptionIndex);
      expect(isCorrect).toBe(true);
    });

    it("correctly evaluates correctness when indices are string vs number", () => {
      const correctOptionIndex: any = "1";
      const studentChosenIndex: any = 1;

      // In JavaScript, strict === with string and number fails:
      expect((studentChosenIndex as any) === (correctOptionIndex as any)).toBe(false);

      // But normalized Number comparison evaluates true:
      expect(Number(studentChosenIndex) === Number(correctOptionIndex)).toBe(true);
    });
  });

  describe("Two Real Students Submitting Distinct Attempts to Same Quiz", () => {
    const mockQuiz = {
      id: "quiz-dsa-101",
      title: "DSA Diagnostic Assessment",
      subject: "Data Structures & Algorithms",
      topic: "Searching & Pointers",
      questions: [
        {
          id: "q-bs",
          question: "What is the time complexity of Binary Search on a sorted array?",
          options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
          correct_option_index: 1, // Option B (O(log n))
          concept: "Binary Search",
          marks: 1,
        },
        {
          id: "q-tp",
          question: "Which technique finds two numbers that sum to target in sorted array in O(n)?",
          options: ["Two Pointers", "Merge Sort", "Floyd Warshall", "Dijkstra"],
          correct_option_index: 0, // Option A (Two Pointers)
          concept: "Two Pointers",
          marks: 1,
        },
      ],
    };

    it("computes separate, isolated scores and concept mastery for Student A and Student B", () => {
      // Student A: Answers Q1 correctly (index 1), Q2 incorrectly (index 1 instead of 0)
      const studentAAnswers: Record<string, number> = {
        "q-bs": 1,
        "q-tp": 1,
      };

      // Student B: Answers Q1 incorrectly (index 0 instead of 1), Q2 correctly (index 0)
      const studentBAnswers: Record<string, number> = {
        "q-bs": 0,
        "q-tp": 0,
      };

      // Evaluation for Student A
      let scoreA = 0;
      const studentAConceptMap: Record<string, { correct: number; total: number }> = {};
      const studentARecords: any[] = [];

      mockQuiz.questions.forEach((q) => {
        const chosen = studentAAnswers[q.id];
        const isCorrect = Number(chosen) === Number(q.correct_option_index);
        if (isCorrect) scoreA += q.marks;

        if (!studentAConceptMap[q.concept]) studentAConceptMap[q.concept] = { correct: 0, total: 0 };
        studentAConceptMap[q.concept].total += 1;
        if (isCorrect) studentAConceptMap[q.concept].correct += 1;

        studentARecords.push({
          questionId: q.id,
          selected_option: chosen,
          selected_text: getOptionText(q.options[chosen]),
          correct_option: q.correct_option_index,
          correct_text: getOptionText(q.options[q.correct_option_index]),
          is_correct: isCorrect,
        });
      });

      // Evaluation for Student B
      let scoreB = 0;
      const studentBConceptMap: Record<string, { correct: number; total: number }> = {};
      const studentBRecords: any[] = [];

      mockQuiz.questions.forEach((q) => {
        const chosen = studentBAnswers[q.id];
        const isCorrect = Number(chosen) === Number(q.correct_option_index);
        if (isCorrect) scoreB += q.marks;

        if (!studentBConceptMap[q.concept]) studentBConceptMap[q.concept] = { correct: 0, total: 0 };
        studentBConceptMap[q.concept].total += 1;
        if (isCorrect) studentBConceptMap[q.concept].correct += 1;

        studentBRecords.push({
          questionId: q.id,
          selected_option: chosen,
          selected_text: getOptionText(q.options[chosen]),
          correct_option: q.correct_option_index,
          correct_text: getOptionText(q.options[q.correct_option_index]),
          is_correct: isCorrect,
        });
      });

      // 1. Verify Student A's results
      expect(scoreA).toBe(1);
      expect(studentAConceptMap["Binary Search"].correct).toBe(1);
      expect(studentAConceptMap["Two Pointers"].correct).toBe(0);
      expect(studentARecords[0].selected_text).toBe("O(log n)");
      expect(studentARecords[0].is_correct).toBe(true);
      expect(studentARecords[1].selected_text).toBe("Merge Sort");
      expect(studentARecords[1].is_correct).toBe(false);

      // 2. Verify Student B's results
      expect(scoreB).toBe(1);
      expect(studentBConceptMap["Binary Search"].correct).toBe(0);
      expect(studentBConceptMap["Two Pointers"].correct).toBe(1);
      expect(studentBRecords[0].selected_text).toBe("O(n)");
      expect(studentBRecords[0].is_correct).toBe(false);
      expect(studentBRecords[1].selected_text).toBe("Two Pointers");
      expect(studentBRecords[1].is_correct).toBe(true);

      // 3. Verify distinctness: Student A's Binary Search is 100%, Student B's is 0%
      const studentABinarySearchAccuracy = (studentAConceptMap["Binary Search"].correct / studentAConceptMap["Binary Search"].total) * 100;
      const studentBBinarySearchAccuracy = (studentBConceptMap["Binary Search"].correct / studentBConceptMap["Binary Search"].total) * 100;
      expect(studentABinarySearchAccuracy).toBe(100);
      expect(studentBBinarySearchAccuracy).toBe(0);

      // Student A's Two Pointers is 0%, Student B's is 100%
      const studentATwoPointersAccuracy = (studentAConceptMap["Two Pointers"].correct / studentAConceptMap["Two Pointers"].total) * 100;
      const studentBTwoPointersAccuracy = (studentBConceptMap["Two Pointers"].correct / studentBConceptMap["Two Pointers"].total) * 100;
      expect(studentATwoPointersAccuracy).toBe(0);
      expect(studentBTwoPointersAccuracy).toBe(100);
    });

    it("calculates accurate question-level option distribution across both students", () => {
      const allStudentAnswerRows = [
        { student_id: "student-alpha", question_id: "q-bs", selected_option: 1, is_correct: true },
        { student_id: "student-alpha", question_id: "q-tp", selected_option: 1, is_correct: false },
        { student_id: "student-beta", question_id: "q-bs", selected_option: 0, is_correct: false },
        { student_id: "student-beta", question_id: "q-tp", selected_option: 0, is_correct: true },
      ];

      const optKeys = ["A", "B", "C", "D"] as const;

      const qStats = mockQuiz.questions.map((q) => {
        const distribution = { A: 0, B: 0, C: 0, D: 0, unattempted: 0 };
        let correctCount = 0;
        let totalAnswered = 0;

        const answersForQ = allStudentAnswerRows.filter((r) => r.question_id === q.id);
        answersForQ.forEach((ans) => {
          totalAnswered++;
          const optIndex = ans.selected_option;
          if (optIndex >= 0 && optIndex < 4) {
            distribution[optKeys[optIndex]]++;
          }
          if (ans.is_correct) correctCount++;
        });

        const pct = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
        return {
          id: q.id,
          correctCount,
          totalAnswered,
          pct,
          distribution,
        };
      });

      // Q1 (Binary Search): Option A had 1 (Student B), Option B had 1 (Student A)
      expect(qStats[0].distribution.A).toBe(1);
      expect(qStats[0].distribution.B).toBe(1);
      expect(qStats[0].distribution.C).toBe(0);
      expect(qStats[0].distribution.D).toBe(0);
      expect(qStats[0].pct).toBe(50);

      // Q2 (Two Pointers): Option A had 1 (Student B), Option B had 1 (Student A)
      expect(qStats[1].distribution.A).toBe(1);
      expect(qStats[1].distribution.B).toBe(1);
      expect(qStats[1].distribution.C).toBe(0);
      expect(qStats[1].distribution.D).toBe(0);
      expect(qStats[1].pct).toBe(50);
    });

    it("verifies deduplication logic ensures exact counts without doubling", () => {
      // Suppose an attempt has records in BOTH quiz_attempts.answers AND quiz_attempt_answers
      const attemptAnswers = [
        { attempt_id: "att-1", student_id: "student-alpha", topic: "Searching", concept: "Binary Search", is_correct: true },
      ];
      const attemptsWithGranularRows = new Set(attemptAnswers.map((r) => r.attempt_id));

      const mockAttempt = {
        id: "att-1",
        answers: {
          "q-bs": { topic: "Searching", concept: "Binary Search", is_correct: true },
        },
      };

      const topicMap: Record<string, { correct: number; total: number }> = {};

      // With deduplication:
      if (attemptsWithGranularRows.has(mockAttempt.id)) {
        const matchingRows = attemptAnswers.filter((r) => r.attempt_id === mockAttempt.id);
        matchingRows.forEach((r) => {
          if (!topicMap[r.topic]) topicMap[r.topic] = { correct: 0, total: 0 };
          topicMap[r.topic].total += 1;
          if (r.is_correct) topicMap[r.topic].correct += 1;
        });
      } else if (mockAttempt.answers) {
        // Fallback only if no granular rows
        Object.values(mockAttempt.answers).forEach((ansItem: any) => {
          if (!topicMap[ansItem.topic]) topicMap[ansItem.topic] = { correct: 0, total: 0 };
          topicMap[ansItem.topic].total += 1;
          if (ansItem.is_correct) topicMap[ansItem.topic].correct += 1;
        });
      }

      // Total count is strictly 1, NOT 2:
      expect(topicMap["Searching"].total).toBe(1);
      expect(topicMap["Searching"].correct).toBe(1);
    });
  });
});
