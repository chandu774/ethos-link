import api from "@/lib/apiClient";

export interface LearningRecommendationItem {
  id: string;
  studentId: string;
  subjectName: string;
  topic: string;
  concept: string | null;
  videoId: string;
  videoUrl: string;
  videoTitle: string;
  channelName: string;
  thumbnailUrl: string;
  duration: string;
  reason: string;
  recommendationType: "WEAK_TOPIC" | "WEAK_CONCEPT" | "MISSED_CLASS" | "PRACTICE_SUPPORT";
  status: "ACTIVE" | "COMPLETED" | "DISMISSED" | "EXPIRED";
  hasCaptions: boolean;
  createdAt: string;
  engagementStatus?: "recommended" | "opened" | "started" | "completed";
}

export interface WeakAreaDetection {
  type: "WEAK_CONCEPT" | "WEAK_TOPIC" | "MISSED_CLASS";
  subjectName: string;
  topic: string;
  concept?: string;
  accuracy?: number;
  totalAttempts?: number;
  missedDate?: string;
  reason: string;
}

class YouTubeRecommendationService {
  /**
   * Fetches active personalized recommendations for a student from backend.
   */
  public async getPersonalizedRecommendations(
    _studentId?: string,
    _requireCaptions: boolean = false,
    _forceRefresh: boolean = false
  ): Promise<LearningRecommendationItem[]> {
    try {
      const data = await api.get<any[]>("/youtube/recommendations");
      if (!data || !Array.isArray(data)) return [];

      return data.map((r: any) => ({
        id: r.id || r._id,
        studentId: r.student_id?._id || r.student_id || "",
        subjectName: r.subject_name || "Computer Science",
        topic: r.topic || "Core Topic",
        concept: r.concept || null,
        videoId: r.video_id,
        videoUrl: r.video_url || `https://www.youtube.com/watch?v=${r.video_id}`,
        videoTitle: r.video_title || "Recommended Video",
        channelName: r.channel_name || "Academic Educator",
        thumbnailUrl: r.thumbnail_url || `https://img.youtube.com/vi/${r.video_id}/hqdefault.jpg`,
        duration: r.duration || "12:00",
        reason: r.reason || "Recommended based on your study history",
        recommendationType: r.recommendation_type || "PRACTICE_SUPPORT",
        status: r.status || "ACTIVE",
        hasCaptions: Boolean(r.has_captions),
        createdAt: r.created_at || new Date().toISOString(),
        engagementStatus: "recommended",
      }));
    } catch (err) {
      console.error("Failed to load personalized recommendations:", err);
      return [];
    }
  }

  /**
   * Track when student opens/clicks to watch a recommended video
   */
  public async trackVideoOpened(_studentId: string, _recommendationId: string, videoId: string): Promise<void> {
    try {
      await api.post("/youtube/engagement", {
        video_id: videoId,
        status: "opened",
      });
    } catch (err) {
      console.error("Error tracking video opened:", err);
    }
  }

  /**
   * Track when student starts video playback in embed dialog
   */
  public async trackVideoStarted(_studentId: string, _recommendationId: string, videoId: string): Promise<void> {
    try {
      await api.post("/youtube/engagement", {
        video_id: videoId,
        status: "started",
      });
    } catch (err) {
      console.error("Error tracking video started:", err);
    }
  }

  /**
   * Track when student completes watching video
   */
  public async trackVideoCompleted(_studentId: string, _recommendationId: string, videoId: string): Promise<void> {
    try {
      await api.post("/youtube/engagement", {
        video_id: videoId,
        status: "completed",
        completed: true,
      });
    } catch (err) {
      console.error("Error tracking video completed:", err);
    }
  }

  /**
   * Resolves a recommendation after student demonstrates concept mastery on a follow-up quiz
   */
  public async resolveRecommendationAfterQuiz(
    _studentId: string,
    _concept: string,
    _quizId?: string
  ): Promise<void> {
    // Handled by backend analytics/quiz controller automatically upon attempt submission
  }

  /**
   * Resolves topic-level recommendations when student achieves high overall quiz mastery
   */
  public async resolveRecommendationByTopic(
    _studentId: string,
    _topic: string,
    _quizId?: string
  ): Promise<void> {
    // Handled by backend analytics/quiz controller automatically upon attempt submission
  }
}

export const youtubeRecommendationService = new YouTubeRecommendationService();
