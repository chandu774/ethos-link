import { Router } from "express";
import {
  register,
  login,
  loginWithIdentifier,
  getMe,
  updateProfile,
  changePassword,
  resetPassword,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/login-identifier", loginWithIdentifier);
router.post("/reset-password", resetPassword);
router.get("/me", authenticate, getMe);
router.patch("/profile", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);

export default router;
