import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";

// Routes
import authRoutes from "./routes/authRoutes";
import classroomRoutes from "./routes/classroomRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import assignmentRoutes from "./routes/assignmentRoutes";
import quizRoutes from "./routes/quizRoutes";
import lectureRoutes from "./routes/lectureRoutes";
import noteRoutes from "./routes/noteRoutes";
import taskRoutes from "./routes/taskRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import opportunityRoutes from "./routes/opportunityRoutes";
import chatRoutes from "./routes/chatRoutes";
import aiRoutes from "./routes/aiRoutes";
import youtubeRoutes from "./routes/youtubeRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import storageRoutes from "./routes/storageRoutes";
import userRoutes from "./routes/userRoutes";

import { downloadFile } from "./controllers/storageController";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Serve uploaded static files directly from MongoDB Atlas (with local disk fallback)
app.get("/uploads/:filename", downloadFile);
const uploadsDir = path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsDir));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "synapse-backend",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/lectures", lectureRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/users", userRoutes);

// Centralized Error Handling
app.use(errorHandler);

export default app;
