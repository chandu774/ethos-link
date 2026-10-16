import { Router } from "express";
import {
  getQuizzes,
  getQuizById,
  createQuiz,
  addQuestions,
  updateQuizStatus,
  getQuizPerformance,
  submitQuizAttempt,
  getMyAttempts,
  deleteQuiz,
} from "../controllers/quizController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

router.get("/", authenticate, getQuizzes);
router.get("/attempts/my", authenticate, requireRole("student"), getMyAttempts);
router.get("/:id", authenticate, getQuizById);
router.get("/:id/performance", authenticate, requireRole("faculty", "administrator"), getQuizPerformance);
router.post("/", authenticate, requireRole("faculty", "administrator"), createQuiz);
router.patch("/:id/status", authenticate, requireRole("faculty", "administrator"), updateQuizStatus);
router.post("/:id/questions", authenticate, requireRole("faculty", "administrator"), addQuestions);
router.delete("/:id", authenticate, requireRole("faculty", "administrator"), deleteQuiz);

// Student attempt
router.post("/:id/attempts", authenticate, requireRole("student"), submitQuizAttempt);

export default router;
