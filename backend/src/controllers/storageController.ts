import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { StorageFile } from "../models/StorageFile";
import { AuthRequest } from "../middleware/auth";

export async function uploadFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file was uploaded." });
      return;
    }

    // Read binary data from the uploaded file
    const fileBuffer = fs.readFileSync(req.file.path);

    // Save permanently into MongoDB Atlas
    const storageDoc = await StorageFile.create({
      filename: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype || "application/octet-stream",
      size: req.file.size,
      data: fileBuffer,
      bucket: req.body?.bucket || "general",
      uploaded_by: req.user?._id,
    });

    const fileUrl = `/api/storage/file/${storageDoc.filename}`;

    res.json({
      fileUrl,
      publicUrl: fileUrl,
      id: storageDoc._id.toString(),
      fileName: storageDoc.original_name,
      storedName: storageDoc.filename,
      size: storageDoc.size,
      mimeType: storageDoc.mime_type,
    });
  } catch (error: any) {
    console.error("[Storage] Upload error:", error);
    res.status(500).json({ error: error.message || "File upload failed." });
  }
}

export async function downloadFile(req: Request, res: Response): Promise<void> {
  try {
    const identifier = req.params.filename || req.params.id;
    if (!identifier) {
      res.status(400).json({ error: "File identifier is required." });
      return;
    }

    // 1. Look up in MongoDB Atlas
    let fileDoc = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      fileDoc = await StorageFile.findById(identifier);
    }
    if (!fileDoc) {
      fileDoc = await StorageFile.findOne({ filename: identifier });
    }

    if (fileDoc && fileDoc.data) {
      res.setHeader("Content-Type", fileDoc.mime_type || "application/octet-stream");
      res.setHeader("Content-Length", fileDoc.size || fileDoc.data.length);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      if (req.query.download === "true") {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(fileDoc.original_name)}"`
        );
      } else {
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${encodeURIComponent(fileDoc.original_name)}"`
        );
      }

      res.send(fileDoc.data);
      return;
    }

    // 2. Fallback to local uploads directory if available
    const safeFilename = path.basename(identifier);
    const filePath = path.join(__dirname, "../../uploads", safeFilename);

    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
      return;
    }

    res.status(404).json({ error: "File not found in database or storage." });
  } catch (error: any) {
    console.error("[Storage] Serve error:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve file." });
  }
}

export async function deleteFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { filename } = req.params;
    await StorageFile.findOneAndDelete({ filename });

    const safeFilename = path.basename(filename);
    const filePath = path.join(__dirname, "../../uploads", safeFilename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }

    res.json({ message: "File removed from storage successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete file." });
  }
}
