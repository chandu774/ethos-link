import { Router } from "express";
import {
  recordSessionAttendance,
  getSessions,
  getSessionAttendance,
  getStudentAttendanceMetrics,
} from "../controllers/attendanceController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

router.get("/metrics/student", authenticate, getStudentAttendanceMetrics);
router.post("/sessions", authenticate, requireRole("faculty", "administrator"), recordSessionAttendance);
router.get("/sessions", authenticate, getSessions);
router.get("/sessions/:sessionId/records", authenticate, getSessionAttendance);

export default router;
