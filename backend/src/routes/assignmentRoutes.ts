import { Router } from "express";
import {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  getAllSubmissions,
  gradeSubmission,
  deleteAssignment,
} from "../controllers/assignmentController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

router.get("/", authenticate, getAssignments);
router.get("/submissions/all", authenticate, requireRole("faculty", "administrator"), getAllSubmissions);
router.get("/:id", authenticate, getAssignmentById);
router.post("/", authenticate, requireRole("faculty", "administrator"), createAssignment);
router.patch("/:id", authenticate, requireRole("faculty", "administrator"), updateAssignment);
router.delete("/:id", authenticate, requireRole("faculty", "administrator"), deleteAssignment);

// Student submission
router.post("/:id/submit", authenticate, requireRole("student"), submitAssignment);

// Faculty grading
router.get("/:id/submissions", authenticate, requireRole("faculty", "administrator"), getAssignmentSubmissions);
router.patch("/submissions/:submissionId/grade", authenticate, requireRole("faculty", "administrator"), gradeSubmission);

export default router;
