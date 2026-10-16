import { Router } from "express";
import {
  getNotes,
  createNote,
  toggleLikeNote,
  deleteNote,
} from "../controllers/noteController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, getNotes);
router.post("/", authenticate, createNote);
router.post("/:id/like", authenticate, toggleLikeNote);
router.delete("/:id", authenticate, deleteNote);

export default router;
