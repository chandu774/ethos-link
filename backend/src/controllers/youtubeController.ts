import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { LearningRecommendation, StudentVideoEngagement } from "../models/LearningRecommendation";
import { StudentConceptHistory } from "../models/StudentConceptHistory";

export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

export async function getVideoMetadata(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { url, videoId: rawVideoId } = req.body;
    const videoId = rawVideoId || extractYouTubeVideoId(url || "");

    if (!videoId) {
      res.status(400).json({ error: "Invalid YouTube URL or video ID." });
      return;
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    // Attempt fetching title via YouTube oEmbed
    let title = "Academic Lecture Video";
    let authorName = "Educational Channel";
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`);
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        title = oembed.title || title;
        authorName = oembed.author_name || authorName;
      }
    } catch {
      // Fallback defaults
    }

    res.json({
      videoId,
      title,
      authorName,
      thumbnailUrl,
      videoUrl,
      embedUrl,
      duration: "15:00",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch YouTube metadata." });
  }
}

export async function getRecommendations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const studentId = req.user?._id;
    const recommendations = await LearningRecommendation.find({
      student_id: studentId,
      status: "ACTIVE",
    }).sort({ score: -1, created_at: -1 });

    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch recommendations." });
  }
}

export async function recordEngagement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const studentId = req.user?._id;
    const { video_id, watch_duration_seconds, completed, notes } = req.body;

    const engagement = await StudentVideoEngagement.findOneAndUpdate(
      { student_id: studentId, video_id },
      {
        watch_duration_seconds: Number(watch_duration_seconds) || 0,
        completed: !!completed,
        notes,
        last_watched_at: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json(engagement);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to record video engagement." });
  }
}
