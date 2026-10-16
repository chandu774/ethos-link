import { Router } from "express";
import { uploadFile, downloadFile, deleteFile } from "../controllers/storageController";
import { upload } from "../middleware/upload";
import { authenticate, optionalAuthenticate } from "../middleware/auth";

const router = Router();

router.post("/upload", authenticate, upload.single("file"), uploadFile);
router.get("/file/:filename", downloadFile);
router.get("/files/:id", downloadFile);
router.get("/:filename", downloadFile);
router.delete("/file/:filename", authenticate, deleteFile);

export default router;
