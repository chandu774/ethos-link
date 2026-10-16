import { Router } from "express";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, getTasks);
router.post("/", authenticate, createTask);
router.patch("/:id", authenticate, updateTask);
router.delete("/:id", authenticate, deleteTask);

export default router;
