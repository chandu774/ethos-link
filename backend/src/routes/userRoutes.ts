import { Router } from "express";
import {
  getStudents,
  getFaculty,
  getStudentDetail,
  getUserProfile,
  createUser,
  deleteUser,
  searchUsers,
  adminResetPassword,
} from "../controllers/userController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

router.get("/search", authenticate, searchUsers);
router.get("/students", authenticate, getStudents);
router.get("/students/:id/detail", authenticate, getStudentDetail);
router.get("/profile/:id", authenticate, getUserProfile);
router.get("/faculty", authenticate, getFaculty);
router.post("/", authenticate, requireRole("administrator"), createUser);
router.post("/reset-password", authenticate, requireRole("administrator"), adminResetPassword);
router.delete("/:id", authenticate, requireRole("administrator"), deleteUser);

export default router;
