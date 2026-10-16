import { Router } from "express";
import { uploadFile, downloadFile } from "../controllers/storageController";
import { upload } from "../middleware/upload";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/upload", authenticate, upload.single("file"), uploadFile);
router.get("/file/:filename", downloadFile);

export default router;
