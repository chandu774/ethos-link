import { supabase } from "@/integrations/supabase/client";

export interface TranscriptSegment {
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export interface LectureTranscript {
  id: string;
  lecture_id: string;
  transcript_text: string;
  transcript_segments: TranscriptSegment[];
  summary: string;
  key_concepts: string[];
  language: string;
  source: string;
  status: "ready" | "processing" | "failed";
  generated_at: string;
  updated_at: string;
}

export const lectureTranscriptService = {
  /**
   * Fetch an existing cached transcript for a lecture
   */
  async getTranscript(lectureId: string): Promise<LectureTranscript | null> {
    if (!lectureId) return null;

    const { data, error } = await supabase
      .from("lecture_transcripts")
      .select("*")
      .eq("lecture_id", lectureId)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch lecture transcript:", error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      lecture_id: data.lecture_id,
      transcript_text: data.transcript_text || "",
      transcript_segments: Array.isArray(data.transcript_segments)
        ? (data.transcript_segments as TranscriptSegment[])
        : [],
      summary: data.summary || "",
      key_concepts: Array.isArray(data.key_concepts)
        ? (data.key_concepts as string[])
        : [],
      language: data.language || "en",
      source: data.source || "youtube_captions",
      status: (data.status as any) || "ready",
      generated_at: data.generated_at,
      updated_at: data.updated_at,
    };
  },

  /**
   * Trigger on-demand transcript generation via Edge Function
   */
  async generateTranscript(lecture: {
    id: string;
    youtubeVideoId: string;
    subjectName?: string;
    topic?: string;
    title: string;
  }): Promise<LectureTranscript> {
    // 1. Check if already generated
    const existing = await this.getTranscript(lecture.id);
    if (existing && existing.status === "ready") {
      return existing;
    }

    // 2. Call the deployed Edge Function
    const { data, error } = await supabase.functions.invoke("lecture-transcript", {
      body: {
        lectureId: lecture.id,
        youtubeVideoId: lecture.youtubeVideoId,
        subject: lecture.subjectName || "Subject",
        topic: lecture.topic || "General",
        title: lecture.title,
      },
    });

    if (error) {
      console.error("Edge function invocation failed:", error);
      throw new Error(error.message || "Failed to generate lecture transcript");
    }

    if (!data?.transcript) {
      throw new Error("Transcript service returned empty result");
    }

    const t = data.transcript;
    return {
      id: t.id,
      lecture_id: t.lecture_id,
      transcript_text: t.transcript_text || "",
      transcript_segments: Array.isArray(t.transcript_segments) ? t.transcript_segments : [],
      summary: t.summary || "",
      key_concepts: Array.isArray(t.key_concepts) ? t.key_concepts : [],
      language: t.language || "en",
      source: t.source || "youtube_captions",
      status: t.status || "ready",
      generated_at: t.generated_at || new Date().toISOString(),
      updated_at: t.updated_at || new Date().toISOString(),
    };
  },

  /**
   * Format seconds to mm:ss or hh:mm:ss
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}:${remMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  },
};
