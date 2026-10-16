import { Router } from "express";
import {
  getAllClassrooms,
  createClassroom,
  getClassroomById,
  deleteClassroom,
  enrollStudent,
  removeStudent,
  assignFaculty,
  removeTeachingAssignment,
  getAllTeachingAssignments,
  getTeachingAssignmentDetail,
  getStudentCohort,
  getFacultyClassrooms,
} from "../controllers/classroomController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

// Student routes
router.get("/my-cohort", authenticate, getStudentCohort);

// Faculty routes
router.get("/my-assigned", authenticate, requireRole("faculty", "administrator"), getFacultyClassrooms);

// Teaching assignments
router.get("/teaching-assignments/all", authenticate, getAllTeachingAssignments);
router.get("/teaching-assignments/:assignmentId", authenticate, getTeachingAssignmentDetail);
router.post("/teaching-assignments", authenticate, requireRole("administrator"), assignFaculty);
router.delete("/teaching-assignments/:assignmentId", authenticate, requireRole("administrator"), removeTeachingAssignment);

// Admin & General routes
router.get("/", authenticate, getAllClassrooms);
router.post("/", authenticate, requireRole("administrator"), createClassroom);
router.get("/:id", authenticate, getClassroomById);
router.delete("/:id", authenticate, requireRole("administrator"), deleteClassroom);

// Student enrollment
router.post("/:id/members", authenticate, requireRole("administrator"), enrollStudent);
router.delete("/:id/members/:studentId", authenticate, requireRole("administrator"), removeStudent);

// Faculty assignment for specific classroom
router.post("/:id/teaching-assignments", authenticate, requireRole("administrator"), assignFaculty);

export default router;
