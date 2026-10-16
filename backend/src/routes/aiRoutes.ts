import { Router } from "express";
import { chat, generateQuiz, getConversations, deleteConversation } from "../controllers/aiController";
import { authenticate, optionalAuthenticate } from "../middleware/auth";

const router = Router();

router.post("/chat", optionalAuthenticate, chat);
router.post("/quiz-generate", authenticate, generateQuiz);
router.get("/conversations", authenticate, getConversations);
router.delete("/conversations/:id", authenticate, deleteConversation);

export default router;
