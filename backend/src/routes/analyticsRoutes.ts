import { Router } from "express";
import {
  getStudentAnalytics,
  getConceptMastery,
  getCohortAnalytics,
} from "../controllers/analyticsController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/student/home", authenticate, getStudentAnalytics);
router.get("/concept-mastery", authenticate, getConceptMastery);
router.get("/concept-mastery/:studentId", authenticate, getConceptMastery);
router.get("/cohort/:cohortId", authenticate, getCohortAnalytics);

export default router;
