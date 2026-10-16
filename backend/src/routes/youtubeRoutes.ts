import { Router } from "express";
import {
  getVideoMetadata,
  getRecommendations,
  recordEngagement,
} from "../controllers/youtubeController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/metadata", authenticate, getVideoMetadata);
router.get("/recommendations", authenticate, getRecommendations);
router.post("/engagement", authenticate, recordEngagement);

export default router;
