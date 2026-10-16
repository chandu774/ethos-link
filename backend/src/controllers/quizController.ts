import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Quiz } from "../models/Quiz";
import { QuizQuestion } from "../models/QuizQuestion";
import { QuizAttempt } from "../models/QuizAttempt";
import { QuizAttemptAnswer } from "../models/QuizAttemptAnswer";
import { StudentConceptHistory } from "../models/StudentConceptHistory";
import { ClassroomMember } from "../models/ClassroomMember";
import mongoose from "mongoose";

// Get quizzes (options only for students; no correct answers revealed!)
export async function getQuizzes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { classroomId } = req.query;
    let filter: any = {};

    if (classroomId) {
      filter.classroom_id = classroomId;
    } else if (req.user?.role === "student") {
      const member = await ClassroomMember.findOne({ student_id: req.user._id });
      if (member) filter.classroom_id = member.classroom_id;
    } else if (req.user?.role === "faculty") {
      filter.faculty_id = req.user._id;
    }

    const quizzes = await Quiz.find(filter)
      .populate("classroom_id", "name course branch section")
      .populate("teaching_assignment_id", "subject_name subject_code")
      .populate("faculty_id", "name")
      .sort({ created_at: -1 });

    // Attach question counts, avg_score and student attempt metrics
    const enriched = await Promise.all(
      quizzes.map(async (q) => {
        const questionCount = await QuizQuestion.countDocuments({ quiz_id: q._id });
        const attempts = await QuizAttempt.find({ quiz_id: q._id });
        const attemptsCount = attempts.length;
        let avgScore = 0;
        if (attemptsCount > 0) {
          const totalPct = attempts.reduce((sum, att) => sum + (att.percentage || 0), 0);
          avgScore = Math.round(totalPct / attemptsCount);
        }

        let userAttempts = 0;
        let bestScore: number | null = null;
        let studentAttemptsList: any[] = [];

        if (req.user?.role === "student") {
          const userAtts = attempts.filter((a) => a.user_id?.toString() === req.user?._id?.toString());
          userAttempts = userAtts.length;
          if (userAttempts > 0) {
            bestScore = Math.max(...userAtts.map((a) => a.percentage));
          }
          studentAttemptsList = userAtts.map((a) => ({
            id: a._id.toString(),
            score: a.score,
            max_score: a.total_questions,
            percentage: a.percentage,
            completed_at: a.completed_at ? a.completed_at.toISOString() : "",
          }));
        }

        return {
          ...q.toJSON(),
          questions_count: questionCount,
          question_count: questionCount,
          attempts_count: attemptsCount,
          avg_score: avgScore,
          user_attempts: userAttempts,
          best_score: bestScore,
          attempts: studentAttemptsList,
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch quizzes." });
  }
}

// Get single quiz and its questions
export async function getQuizById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id)
      .populate("classroom_id", "name course branch section")
      .populate("teaching_assignment_id", "subject_name subject_code")
      .populate("faculty_id", "name");

    if (!quiz) {
      res.status(404).json({ error: "Quiz not found." });
      return;
    }

    const isStudent = req.user?.role === "student";

    // If student, project out correct_option_index and explanation!
    const questions = await QuizQuestion.find(
      { quiz_id: id },
      isStudent ? "-correct_option_index -explanation" : undefined
    );

    let attempts: any[] = [];
    if (isStudent && req.user) {
      attempts = await QuizAttempt.find({ quiz_id: id, user_id: req.user._id }).sort({ completed_at: -1 });
    }

    res.json({
      ...quiz.toJSON(),
      questions,
      attempts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get quiz." });
  }
}

// Create quiz (Faculty)
export async function createQuiz(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { classroom_id, teaching_assignment_id, title, topic, subject, difficulty, duration_minutes, max_attempts, status, questions } = req.body;

    if (!title || !topic || !subject) {
      res.status(400).json({ error: "Title, topic, and subject are required." });
      return;
    }

    const quiz = await Quiz.create({
      classroom_id,
      teaching_assignment_id,
      faculty_id: req.user?._id,
      title: title.trim(),
      topic: topic.trim(),
      subject: subject.trim(),
      difficulty: difficulty || "Medium",
      duration_minutes: Number(duration_minutes) || 15,
      max_attempts: Number(max_attempts) || 3,
      status: status || "PUBLISHED",
    });

    if (Array.isArray(questions) && questions.length > 0) {
      const qDocs = questions.map((q) => ({
        quiz_id: quiz._id,
        question_text: q.question_text || q.questionText || q.question,
        options: q.options,
        correct_option_index: Number(q.correct_option_index ?? q.correctAnswer ?? 0),
        explanation: q.explanation || "",
        concept: q.concept || topic,
        topic: q.topic || topic,
        difficulty: q.difficulty || difficulty || "Medium",
        marks: Number(q.marks) || 1,
      }));
      await QuizQuestion.insertMany(qDocs);
    }

    res.status(201).json(quiz);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create quiz." });
  }
}

// Add questions to quiz (Faculty)
export async function addQuestions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: "Questions array is required." });
      return;
    }

    const qDocs = questions.map((q) => ({
      quiz_id: id,
      question_text: q.question_text || q.questionText || q.question,
      options: q.options,
      correct_option_index: Number(q.correct_option_index ?? q.correctAnswer ?? 0),
      explanation: q.explanation || "",
      concept: q.concept || "General",
      topic: q.topic || "General",
      difficulty: q.difficulty || "Medium",
    }));

    const inserted = await QuizQuestion.insertMany(qDocs);
    res.status(201).json(inserted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to add questions." });
  }
}

// Submit Quiz Attempt (Student) - Secure Backend Grading & Concept Mastery Update
export async function submitQuizAttempt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Map of question_id -> selected_option_index

    const studentId = req.user?._id;
    if (!studentId) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      res.status(404).json({ error: "Quiz not found." });
      return;
    }

    const questions = await QuizQuestion.find({ quiz_id: id });
    if (questions.length === 0) {
      res.status(400).json({ error: "Quiz contains no questions." });
      return;
    }

    let score = 0;
    const attemptAnswersToSave = [];
    const conceptBreakdown: Record<string, { correct: number; total: number; topic?: string }> = {};

    for (const q of questions) {
      const qIdStr = q._id.toString();
      const selectedIndex = answers ? answers[qIdStr] : undefined;
      const isCorrect = selectedIndex !== undefined && Number(selectedIndex) === q.correct_option_index;

      if (isCorrect) {
        score++;
      }

      attemptAnswersToSave.push({
        question_id: q._id,
        student_id: studentId,
        selected_option_index: selectedIndex !== undefined ? Number(selectedIndex) : -1,
        is_correct: isCorrect,
        concept: q.concept,
      });

      // Aggregate concept mastery
      const cName = q.concept || "General";
      if (!conceptBreakdown[cName]) {
        conceptBreakdown[cName] = { correct: 0, total: 0, topic: q.topic || quiz.topic };
      }
      conceptBreakdown[cName].total++;
      if (isCorrect) conceptBreakdown[cName].correct++;
    }

    const totalQuestions = questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    const attempt = await QuizAttempt.create({
      quiz_id: id,
      user_id: studentId,
      score,
      total_questions: totalQuestions,
      percentage,
      answers,
      completed_at: new Date(),
    });

    // Save individual attempt answers
    const answersWithAttempt = attemptAnswersToSave.map((a) => ({
      ...a,
      attempt_id: attempt._id,
    }));
    await QuizAttemptAnswer.insertMany(answersWithAttempt);

    // Update StudentConceptHistory for each tested concept
    for (const [conceptName, stats] of Object.entries(conceptBreakdown)) {
      const existing = await StudentConceptHistory.findOne({
        student_id: studentId,
        concept_name: conceptName,
        subject: quiz.subject,
      });

      const totalCorrect = (existing?.correct_answers || 0) + stats.correct;
      const totalAns = (existing?.total_answers || 0) + stats.total;
      const newPercentage = totalAns > 0 ? Math.round((totalCorrect / totalAns) * 100) : 0;
      const attemptsCount = (existing?.attempts || 0) + 1;

      let status: "Mastered" | "Developing" | "Needs Review" | "Not Assessed" = "Not Assessed";
      if (totalAns === 0) status = "Not Assessed";
      else if (newPercentage >= 80) status = "Mastered";
      else if (newPercentage >= 60) status = "Developing";
      else status = "Needs Review";

      let trend: "improving" | "declining" | "stable" = "stable";
      if (existing) {
        if (newPercentage > existing.mastery_percentage) trend = "improving";
        else if (newPercentage < existing.mastery_percentage) trend = "declining";
      }

      await StudentConceptHistory.findOneAndUpdate(
        { student_id: studentId, concept_name: conceptName, subject: quiz.subject },
        {
          topic: stats.topic,
          attempts: attemptsCount,
          correct_answers: totalCorrect,
          total_answers: totalAns,
          mastery_percentage: newPercentage,
          status,
          trend,
          last_assessed_at: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    res.status(201).json({
      attempt,
      score,
      total_questions: totalQuestions,
      percentage,
      feedback:
        percentage >= 80
          ? "Excellent mastery demonstrated!"
          : percentage >= 60
          ? "Good progress. Review weak concepts to boost confidence."
          : "Identified learning gaps. Practice sessions recommended.",
      results: questions.map((q) => {
        const qIdStr = q._id.toString();
        const selected = answers ? answers[qIdStr] : -1;
        return {
          question_id: qIdStr,
          question_text: q.question_text,
          options: q.options,
          selected_option: selected,
          correct_option: q.correct_option_index,
          is_correct: Number(selected) === q.correct_option_index,
          explanation: q.explanation,
          concept: q.concept,
        };
      }),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to submit quiz attempt." });
  }
}

// Update quiz status (Faculty / Admin)
export async function updateQuizStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const quiz = await Quiz.findByIdAndUpdate(id, { status }, { new: true });
    if (!quiz) {
      res.status(404).json({ error: "Quiz not found." });
      return;
    }
    res.json(quiz);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update quiz status." });
  }
}

// Get quiz performance analytics for faculty
export async function getQuizPerformance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      res.status(404).json({ error: "Quiz not found." });
      return;
    }

    const questions = await QuizQuestion.find({ quiz_id: id }).sort({ created_at: 1, _id: 1 });
    const attempts = await QuizAttempt.find({ quiz_id: id })
      .populate("user_id", "name roll_number email")
      .sort({ completed_at: -1 });

    const attemptAnswers = await QuizAttemptAnswer.find({ quiz_id: id });

    const formattedAttempts = attempts.map((a) => {
      const json = a.toJSON() as any;
      return {
        ...json,
        user: json.user_id,
      };
    });

    res.json({
      quiz,
      questions,
      attempts: formattedAttempts,
      attemptAnswers,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load quiz performance." });
  }
}

// Delete quiz (Faculty / Admin)
export async function deleteQuiz(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Quiz.findByIdAndDelete(id);
    await QuizQuestion.deleteMany({ quiz_id: id });
    await QuizAttempt.deleteMany({ quiz_id: id });
    await QuizAttemptAnswer.deleteMany({ quiz_id: id });
    res.json({ message: "Quiz deleted." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete quiz." });
  }
}

// Get Student's Own Quiz Attempts
export async function getMyAttempts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const studentId = req.user?._id;
    const attempts = await QuizAttempt.find({ user_id: studentId })
      .populate("quiz_id", "title topic subject difficulty")
      .sort({ completed_at: -1 });

    const formatted = attempts.map((a) => {
      const q = a.quiz_id as any;
      return {
        id: a._id.toString(),
        quiz_id: q?._id?.toString() || a.quiz_id?.toString(),
        score: a.score,
        max_score: a.total_questions || 0,
        percentage: a.percentage,
        completed_at: a.completed_at ? a.completed_at.toISOString() : new Date().toISOString(),
        quiz: q
          ? {
              id: q._id.toString(),
              title: q.title,
              subject: q.subject,
              topic: q.topic,
              difficulty: q.difficulty,
            }
          : null,
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch student quiz attempts." });
  }
}
