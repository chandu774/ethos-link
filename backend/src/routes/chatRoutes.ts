import { Router } from "express";
import {
  getDirectMessages,
  sendDirectMessage,
  markDirectMessagesSeen,
  getGroups,
  createGroup,
  getGroupMessages,
  sendGroupMessage,
  getConnections,
  requestConnection,
  updateConnectionStatus,
  getCommunities,
  createCommunity,
  updateCommunity,
  approveCommunity,
  rejectCommunity,
} from "../controllers/chatController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Direct messages
router.get("/messages/:otherUserId", authenticate, getDirectMessages);
router.post("/messages", authenticate, sendDirectMessage);
router.patch("/messages/seen", authenticate, markDirectMessagesSeen);

// Groups
router.get("/groups", authenticate, getGroups);
router.post("/groups", authenticate, createGroup);
router.get("/groups/:groupId/messages", authenticate, getGroupMessages);
router.post("/groups/:groupId/messages", authenticate, sendGroupMessage);

// Connections
router.get("/connections", authenticate, getConnections);
router.post("/connections", authenticate, requestConnection);
router.patch("/connections/:id", authenticate, updateConnectionStatus);

// Communities
router.get("/communities", authenticate, getCommunities);
router.post("/communities", authenticate, createCommunity);
router.patch("/communities/:id", authenticate, updateCommunity);
router.patch("/communities/:id/approve", authenticate, approveCommunity);
router.patch("/communities/:id/reject", authenticate, rejectCommunity);

export default router;
