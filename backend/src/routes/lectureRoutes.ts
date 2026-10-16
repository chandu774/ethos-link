import { Router } from "express";
import {
  getLectures,
  getLectureById,
  createLecture,
  updateLecture,
  deleteLecture,
} from "../controllers/lectureController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

router.get("/", authenticate, getLectures);
router.get("/:id", authenticate, getLectureById);
router.post("/", authenticate, requireRole("faculty", "administrator"), createLecture);
router.patch("/:id", authenticate, requireRole("faculty", "administrator"), updateLecture);
router.delete("/:id", authenticate, requireRole("faculty", "administrator"), deleteLecture);

export default router;
