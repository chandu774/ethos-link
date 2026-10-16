import { Request, Response } from "express";
import path from "path";
import fs from "fs";

export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file was uploaded." });
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      fileUrl,
      publicUrl: fileUrl,
      fileName: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "File upload failed." });
  }
}

export async function downloadFile(req: Request, res: Response): Promise<void> {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(__dirname, "../../uploads", safeFilename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found." });
      return;
    }

    res.download(filePath);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to download file." });
  }
}
