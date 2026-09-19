import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { youtubeRecommendationService } from "@/services/youtubeRecommendationService";

describe("Personalized YouTube Learning Recommendations System", () => {
  it("verifies learning_recommendations and student_video_engagements schema exist", async () => {
    // Check learning_recommendations table
    const { data: recs, error: recsErr } = await supabase
      .from("learning_recommendations")
      .select("id, student_id, subject_name, topic, concept, video_id, video_url, video_title, channel_name, duration, reason, status")
      .limit(1);

    expect(recsErr).toBeNull();
    expect(Array.isArray(recs)).toBe(true);

    // Check student_video_engagements table
    const { data: engs, error: engsErr } = await supabase
      .from("student_video_engagements")
      .select("id, student_id, recommendation_id, video_id, status, opened_at, started_at, completed_at")
      .limit(1);

    expect(engsErr).toBeNull();
    expect(Array.isArray(engs)).toBe(true);
  });

  it("invokes youtube-recommend Edge Function and verifies real YouTube video metadata", async () => {
    const { data, error } = await supabase.functions.invoke("youtube-recommend", {
      body: {
        student_id: "00000000-0000-0000-0000-000000000000",
        subject_name: "Database Management Systems",
        topic: "Normalization",
        concept: "2NF",
        recommendation_type: "WEAK_CONCEPT",
        require_captions: false,
        performance_accuracy: 45,
      },
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.recommendations)).toBe(true);
    expect(data.recommendations.length).toBeGreaterThan(0);

    const firstRec = data.recommendations[0];
    // YouTube video ID must be a valid 11-character string
    expect(firstRec.videoId).toBeDefined();
    expect(firstRec.videoId.length).toBe(11);
    expect(firstRec.videoUrl).toContain(`https://www.youtube.com/watch?v=${firstRec.videoId}`);
    expect(firstRec.title).toBeDefined();
    expect(firstRec.channelName).toBeDefined();
    expect(firstRec.reason).toBeDefined();
    // Reason must mention the concept or topic
    expect(firstRec.reason.toLowerCase()).toMatch(/2nf|normalization|performance|accuracy/);
  });

  it("Edge Function handles MISSED_CLASS recommendations with transparent reason", async () => {
    const { data, error } = await supabase.functions.invoke("youtube-recommend", {
      body: {
        student_id: "00000000-0000-0000-0000-000000000000",
        subject_name: "Operating Systems",
        topic: "Deadlocks",
        recommendation_type: "MISSED_CLASS",
        missed_date: "2026-09-18",
      },
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.recommendations.length).toBeGreaterThan(0);

    const firstRec = data.recommendations[0];
    expect(firstRec.reason).toContain("missed");
  });

  it("detectStudentWeakAreas returns an array of structured weak areas", async () => {
    const weakAreas = await youtubeRecommendationService.detectStudentWeakAreas(
      "00000000-0000-0000-0000-000000000000"
    );
    expect(Array.isArray(weakAreas)).toBe(true);
  });

  it("tracks video engagement states in student_video_engagements", async () => {
    // Fetch an existing student or use test UUID
    const testStudentId = "00000000-0000-0000-0000-000000000000";
    const dummyRecId = "00000000-0000-0000-0000-000000000001";
    const dummyVideoId = "UrYLYV7WSHM";

    // Test trackVideoOpened
    await expect(
      youtubeRecommendationService.trackVideoOpened(testStudentId, dummyRecId, dummyVideoId)
    ).resolves.not.toThrow();

    // Test trackVideoStarted
    await expect(
      youtubeRecommendationService.trackVideoStarted(testStudentId, dummyRecId, dummyVideoId)
    ).resolves.not.toThrow();

    // Test trackVideoCompleted
    await expect(
      youtubeRecommendationService.trackVideoCompleted(testStudentId, dummyRecId, dummyVideoId)
    ).resolves.not.toThrow();
  });

  it("resolves recommendation after quiz completion", async () => {
    const testStudentId = "00000000-0000-0000-0000-000000000000";
    await expect(
      youtubeRecommendationService.resolveRecommendationAfterQuiz(
        testStudentId,
        "2NF",
        "00000000-0000-0000-0000-000000000002"
      )
    ).resolves.not.toThrow();

    await expect(
      youtubeRecommendationService.resolveRecommendationByTopic(
        testStudentId,
        "Normalization",
        "00000000-0000-0000-0000-000000000002"
      )
    ).resolves.not.toThrow();
  });
});
