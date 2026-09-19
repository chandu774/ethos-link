import { supabase } from "@/integrations/supabase/client";

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
   * Identifies genuine weak areas using accumulated evidence from:
   * 1. Quiz attempt answers & student concept history (< 65% accuracy across >= 2 questions)
   * 2. Missed classes from attendance records (absent in class sessions)
   */
  public async detectStudentWeakAreas(studentId: string): Promise<WeakAreaDetection[]> {
    const weakAreas: WeakAreaDetection[] = [];

    try {
      // 1. Check Quiz Attempt Answers for concept-level performance
      const { data: ansRows } = await supabase
        .from("quiz_attempt_answers")
        .select("subject, topic, concept, is_correct")
        .eq("student_id", studentId);

      const conceptAccMap: Record<string, { subject: string; topic: string; correct: number; total: number }> = {};
      const topicAccMap: Record<string, { subject: string; correct: number; total: number }> = {};

      if (ansRows && ansRows.length > 0) {
        ansRows.forEach((r: any) => {
          const sub = r.subject || "Computer Science";
          const top = r.topic || "General";
          const con = r.concept ? r.concept.trim() : null;

          // Aggregate by topic
          const topKey = `${sub}:::${top}`;
          if (!topicAccMap[topKey]) topicAccMap[topKey] = { subject: sub, correct: 0, total: 0 };
          topicAccMap[topKey].total += 1;
          if (r.is_correct) topicAccMap[topKey].correct += 1;

          // Aggregate by concept
          if (con) {
            const conKey = `${sub}:::${top}:::${con}`;
            if (!conceptAccMap[conKey]) conceptAccMap[conKey] = { subject: sub, topic: top, correct: 0, total: 0 };
            conceptAccMap[conKey].total += 1;
            if (r.is_correct) conceptAccMap[conKey].correct += 1;
          }
        });
      }

      // Also check student_concept_history for historical concept assessments
      const { data: histRows } = await supabase
        .from("student_concept_history")
        .select("subject, topic, concept, total_questions, correct_answers, accuracy")
        .eq("student_id", studentId);

      if (histRows && histRows.length > 0) {
        histRows.forEach((h: any) => {
          const sub = h.subject || "Computer Science";
          const top = h.topic || "General";
          const con = h.concept ? h.concept.trim() : null;
          if (con) {
            const conKey = `${sub}:::${top}:::${con}`;
            if (!conceptAccMap[conKey]) {
              conceptAccMap[conKey] = {
                subject: sub,
                topic: top,
                correct: h.correct_answers || 0,
                total: h.total_questions || 0,
              };
            }
          }
        });
      }

      // Filter accumulated weak concepts: require at least 2 questions and accuracy < 65%
      // (Do NOT classify as weak from a single isolated mistake)
      Object.entries(conceptAccMap).forEach(([key, val]) => {
        if (val.total >= 2) {
          const pct = Math.round((val.correct / val.total) * 100);
          if (pct < 65) {
            const [, , conceptName] = key.split(":::");
            weakAreas.push({
              type: "WEAK_CONCEPT",
              subjectName: val.subject,
              topic: val.topic,
              concept: conceptName,
              accuracy: pct,
              totalAttempts: val.total,
              reason: `Your recent quiz accuracy in ${conceptName} was ${pct}% across ${val.total} assessed questions.`,
            });
          }
        }
      });

      // Filter weak topics if no specific concept was flagged or if topic accuracy < 60% with >= 3 questions
      Object.entries(topicAccMap).forEach(([key, val]) => {
        if (val.total >= 3) {
          const pct = Math.round((val.correct / val.total) * 100);
          if (pct < 60) {
            const [sub, top] = key.split(":::");
            // Only add if not already covered by a concept
            const alreadyHasConcept = weakAreas.some(w => w.topic === top && w.subjectName === sub);
            if (!alreadyHasConcept) {
              weakAreas.push({
                type: "WEAK_TOPIC",
                subjectName: sub,
                topic: top,
                accuracy: pct,
                totalAttempts: val.total,
                reason: `Your aggregate performance in ${top} (${pct}%) is below expected pace for ${sub}.`,
              });
            }
          }
        }
      });

      // 2. Check Missed Classes from attendance_records
      const { data: absentRecords } = await supabase
        .from("attendance_records")
        .select(`
          id,
          session_id,
          class_sessions!attendance_records_session_id_fkey (
            id,
            date,
            topic,
            teaching_assignment_id,
            teaching_assignments!class_sessions_teaching_assignment_id_fkey (
              subject_name
            )
          )
        `)
        .eq("student_id", studentId)
        .eq("status", "absent")
        .order("created_at", { ascending: false })
        .limit(3);

      if (absentRecords && absentRecords.length > 0) {
        for (const rec of absentRecords as any[]) {
          const session = rec.class_sessions;
          if (session && session.topic) {
            const subName = session.teaching_assignments?.subject_name || "Academic Subject";

            // Query concepts covered in this session
            const { data: sessionConcepts } = await supabase
              .from("session_concepts")
              .select("concept_name")
              .eq("session_id", session.id);

            const concepts = (sessionConcepts || []).map((sc: any) => sc.concept_name).filter(Boolean);
            const primaryConcept = concepts.length > 0 ? concepts[0] : undefined;

            weakAreas.push({
              type: "MISSED_CLASS",
              subjectName: subName,
              topic: session.topic,
              concept: primaryConcept,
              missedDate: session.date,
              reason: `You missed the ${subName} lecture on ${session.date} covering ${session.topic}${
                concepts.length > 0 ? ` (Concepts: ${concepts.join(", ")})` : ""
              }.`,
            });
          }
        }
      }
    } catch (err) {
      console.error("Error detecting student weak areas:", err);
    }

    return weakAreas;
  }

  /**
   * Fetches active personalized recommendations for a student.
   * If none exist in cache and weak areas are detected, invokes edge function and caches results.
   */
  public async getPersonalizedRecommendations(
    studentId: string,
    requireCaptions: boolean = false,
    forceRefresh: boolean = false
  ): Promise<LearningRecommendationItem[]> {
    try {
      // 1. Query existing cached recommendations from public.learning_recommendations
      if (!forceRefresh) {
        const { data: cachedRows, error: cacheErr } = await supabase
          .from("learning_recommendations")
          .select(`
            *,
            student_video_engagements (
              status,
              opened_at,
              started_at,
              completed_at
            )
          `)
          .eq("student_id", studentId)
          .eq("status", "ACTIVE")
          .order("created_at", { ascending: false })
          .limit(6);

        if (!cacheErr && cachedRows && cachedRows.length > 0) {
          return cachedRows.map((r: any) => {
            const engagement = Array.isArray(r.student_video_engagements) && r.student_video_engagements.length > 0
              ? r.student_video_engagements[0]
              : null;

            return {
              id: r.id,
              studentId: r.student_id,
              subjectName: r.subject_name,
              topic: r.topic,
              concept: r.concept,
              videoId: r.video_id,
              videoUrl: r.video_url,
              videoTitle: r.video_title,
              channelName: r.channel_name,
              thumbnailUrl: r.thumbnail_url,
              duration: r.duration || "12:00",
              reason: r.reason,
              recommendationType: r.recommendation_type,
              status: r.status,
              hasCaptions: r.has_captions || false,
              createdAt: r.created_at,
              engagementStatus: engagement?.status || "recommended",
            };
          });
        }
      }

      // 2. No active recommendations in cache; detect weak areas
      const weakAreas = await this.detectStudentWeakAreas(studentId);

      // Rule: Do NOT force recommendations if no weak areas or missed classes exist
      if (weakAreas.length === 0) {
        return [];
      }

      // 3. For the top weak areas, generate video recommendations via Edge Function
      const generatedItems: LearningRecommendationItem[] = [];
      const topWeakAreas = weakAreas.slice(0, 2);

      for (const area of topWeakAreas) {
        const { data, error } = await supabase.functions.invoke("youtube-recommend", {
          body: {
            student_id: studentId,
            subject_name: area.subjectName,
            topic: area.topic,
            concept: area.concept || null,
            recommendation_type: area.type,
            require_captions: requireCaptions,
            performance_accuracy: area.accuracy || null,
            missed_date: area.missedDate || null,
          },
        });

        if (!error && data?.recommendations && Array.isArray(data.recommendations)) {
          for (const v of data.recommendations) {
            // Save to database cache
            const { data: insertedRec, error: insErr } = await supabase
              .from("learning_recommendations")
              .upsert(
                {
                  student_id: studentId,
                  subject_name: area.subjectName,
                  topic: area.topic,
                  concept: area.concept || null,
                  video_id: v.videoId,
                  video_url: v.videoUrl,
                  video_title: v.title,
                  channel_name: v.channelName,
                  thumbnail_url: v.thumbnailUrl,
                  duration: v.duration,
                  reason: v.reason || area.reason,
                  recommendation_type: area.type,
                  has_captions: v.hasCaptions || false,
                  status: "ACTIVE",
                },
                { onConflict: "student_id,topic,concept,video_id" }
              )
              .select()
              .single();

            if (!insErr && insertedRec) {
              generatedItems.push({
                id: insertedRec.id,
                studentId: insertedRec.student_id,
                subjectName: insertedRec.subject_name,
                topic: insertedRec.topic,
                concept: insertedRec.concept,
                videoId: insertedRec.video_id,
                videoUrl: insertedRec.video_url,
                videoTitle: insertedRec.video_title,
                channelName: insertedRec.channel_name,
                thumbnailUrl: insertedRec.thumbnail_url,
                duration: insertedRec.duration || "12:00",
                reason: insertedRec.reason,
                recommendationType: insertedRec.recommendation_type,
                status: insertedRec.status,
                hasCaptions: insertedRec.has_captions,
                createdAt: insertedRec.created_at,
                engagementStatus: "recommended",
              });
            }
          }
        }
      }

      return generatedItems;
    } catch (err) {
      console.error("Failed to load personalized recommendations:", err);
      return [];
    }
  }

  /**
   * Track when student opens/clicks to watch a recommended video
   */
  public async trackVideoOpened(studentId: string, recommendationId: string, videoId: string): Promise<void> {
    try {
      await supabase.from("student_video_engagements").upsert(
        {
          student_id: studentId,
          recommendation_id: recommendationId,
          video_id: videoId,
          status: "opened",
          opened_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,recommendation_id" }
      );
    } catch (err) {
      console.error("Error tracking video opened:", err);
    }
  }

  /**
   * Track when student starts video playback in embed dialog
   */
  public async trackVideoStarted(studentId: string, recommendationId: string, videoId: string): Promise<void> {
    try {
      await supabase.from("student_video_engagements").upsert(
        {
          student_id: studentId,
          recommendation_id: recommendationId,
          video_id: videoId,
          status: "started",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,recommendation_id" }
      );
    } catch (err) {
      console.error("Error tracking video started:", err);
    }
  }

  /**
   * Track when student completes watching video
   */
  public async trackVideoCompleted(studentId: string, recommendationId: string, videoId: string): Promise<void> {
    try {
      await supabase.from("student_video_engagements").upsert(
        {
          student_id: studentId,
          recommendation_id: recommendationId,
          video_id: videoId,
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,recommendation_id" }
      );
    } catch (err) {
      console.error("Error tracking video completed:", err);
    }
  }

  /**
   * Resolves a recommendation after student demonstrates concept mastery on a follow-up quiz
   */
  public async resolveRecommendationAfterQuiz(
    studentId: string,
    concept: string,
    quizId?: string
  ): Promise<void> {
    try {
      await supabase
        .from("learning_recommendations")
        .update({
          status: "COMPLETED",
          resolved_at: new Date().toISOString(),
          resolved_quiz_id: quizId || null,
        })
        .eq("student_id", studentId)
        .eq("concept", concept);
    } catch (err) {
      console.error("Error resolving recommendation after quiz:", err);
    }
  }

  /**
   * Resolves topic-level recommendations when student achieves high overall quiz mastery
   */
  public async resolveRecommendationByTopic(
    studentId: string,
    topic: string,
    quizId?: string
  ): Promise<void> {
    try {
      await supabase
        .from("learning_recommendations")
        .update({
          status: "COMPLETED",
          resolved_at: new Date().toISOString(),
          resolved_quiz_id: quizId || null,
        })
        .eq("student_id", studentId)
        .eq("topic", topic);
    } catch (err) {
      console.error("Error resolving recommendation by topic:", err);
    }
  }
}

export const youtubeRecommendationService = new YouTubeRecommendationService();
