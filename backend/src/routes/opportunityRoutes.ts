import { Router } from "express";
import {
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  toggleSaveOpportunity,
  getSavedOpportunities,
  saveOpportunity,
  removeSavedOpportunity,
  deleteOpportunity,
} from "../controllers/opportunityController";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

router.get("/", authenticate, getOpportunities);
router.get("/saved", authenticate, getSavedOpportunities);
router.post("/saved/:id", authenticate, saveOpportunity);
router.delete("/saved/:id", authenticate, removeSavedOpportunity);
router.post("/", authenticate, requireRole("administrator"), createOpportunity);
router.patch("/:id", authenticate, requireRole("administrator"), updateOpportunity);
router.post("/:id/save", authenticate, toggleSaveOpportunity);
router.delete("/:id", authenticate, requireRole("administrator"), deleteOpportunity);

export default router;
