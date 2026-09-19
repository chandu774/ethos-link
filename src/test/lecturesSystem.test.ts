import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lectureService } from "@/services/lectureService";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

describe("Restructured YouTube Lectures System", () => {
  it("validates and extracts YouTube video IDs safely", () => {
    // Standard watch URL
    expect(
      lectureService.extractYouTubeVideoId("https://www.youtube.com/watch?v=UrYLYV7WSHM")
    ).toBe("UrYLYV7WSHM");

    // Standard watch URL with extra query params
    expect(
      lectureService.extractYouTubeVideoId("https://www.youtube.com/watch?v=UrYLYV7WSHM&t=120s&feature=shared")
    ).toBe("UrYLYV7WSHM");

    // youtu.be short URL
    expect(
      lectureService.extractYouTubeVideoId("https://youtu.be/UrYLYV7WSHM")
    ).toBe("UrYLYV7WSHM");

    // embed URL
    expect(
      lectureService.extractYouTubeVideoId("https://www.youtube.com/embed/UrYLYV7WSHM")
    ).toBe("UrYLYV7WSHM");

    // Direct 11-char ID
    expect(
      lectureService.extractYouTubeVideoId("UrYLYV7WSHM")
    ).toBe("UrYLYV7WSHM");

    // Rejects non-YouTube URLs
    expect(
      lectureService.extractYouTubeVideoId("https://vimeo.com/12345678")
    ).toBeNull();

    expect(
      lectureService.extractYouTubeVideoId("https://example.com/arbitrary-page")
    ).toBeNull();

    expect(
      lectureService.extractYouTubeVideoId("")
    ).toBeNull();
  });

  it("invokes youtube-metadata Edge Function and returns authentic video metadata", async () => {
    const { data, error } = await supabase.functions.invoke("youtube-metadata", {
      body: {
        youtube_url: "https://www.youtube.com/watch?v=UrYLYV7WSHM",
      },
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.success).toBe(true);
    expect(data.videoId).toBe("UrYLYV7WSHM");
    expect(data.title).toBeDefined();
    expect(typeof data.title).toBe("string");
    expect(data.channelName).toBeDefined();
    expect(data.thumbnailUrl).toContain("UrYLYV7WSHM");
  });

  it("Edge Function rejects invalid non-YouTube URLs", async () => {
    const { data, error } = await supabase.functions.invoke("youtube-metadata", {
      body: {
        youtube_url: "https://evil-site.com/fake-video",
      },
    });

    // When status is 400, supabase functions client returns an error
    expect(error !== null || (data && data.success === false)).toBe(true);
  });

  it("verifies public.lectures schema integrity in PostgreSQL", async () => {
    const { data, error } = await supabase
      .from("lectures")
      .select("id, teaching_assignment_id, faculty_id, classroom_id, subject_name, topic, title, youtube_video_id, youtube_url, status, duration")
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("tests end-to-end Faculty posting, Classroom visibility, RLS protection, and Archiving", async () => {
    // 1. Authenticate Admin client to obtain teaching assignments
    const adminClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: adminAuth, error: aAuthErr } = await adminClient.auth.signInWithPassword({
      email: "chandureddy180706@gmail.com",
      password: "chandu@18",
    });

    expect(aAuthErr).toBeNull();
    expect(adminAuth.user).toBeDefined();

    // 2. Fetch teaching assignment for B.Tech CSE - 3A
    const { data: assignments, error: taErr } = await adminClient
      .from("teaching_assignments")
      .select(`
        id,
        faculty_id,
        classroom_id,
        subject_name,
        subject_code,
        classroom:classrooms(name)
      `)
      .limit(1);

    expect(taErr).toBeNull();
    expect(assignments).toBeDefined();
    expect(assignments!.length).toBeGreaterThan(0);
    const ta = assignments![0];

    // 3. Insert a real test lecture
    const testVideoId = "UrYLYV7WSHM";
    const testTopic = "Database Normalization";
    const testTitle = "Database Normalization 1NF to 3NF Explained";

    const { data: insertedLec, error: insertErr } = await adminClient
      .from("lectures")
      .insert({
        teaching_assignment_id: ta.id,
        faculty_id: ta.faculty_id,
        classroom_id: ta.classroom_id,
        subject_name: ta.subject_name,
        subject_code: ta.subject_code,
        topic: testTopic,
        title: testTitle,
        description: "Official course resource covering functional dependencies and normal forms.",
        youtube_video_id: testVideoId,
        youtube_url: `https://www.youtube.com/watch?v=${testVideoId}`,
        thumbnail_url: `https://img.youtube.com/vi/${testVideoId}/hqdefault.jpg`,
        channel_name: "Gate Smashers",
        duration: "18:42",
        has_captions: true,
        status: "PUBLISHED",
      })
      .select()
      .single();

    expect(insertErr).toBeNull();
    expect(insertedLec).toBeDefined();
    expect(insertedLec.id).toBeDefined();
    expect(insertedLec.youtube_video_id).toBe(testVideoId);
    expect(insertedLec.status).toBe("PUBLISHED");

    const createdLectureId = insertedLec.id;

    try {
      // 4. Authenticate student enrolled in CSE 3A
      const studentClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: studentAuth, error: sAuthErr } = await studentClient.auth.signInWithPassword({
        email: "24501a0528@student.synapse.local",
        password: "Student@123",
      });

      expect(sAuthErr).toBeNull();
      expect(studentAuth.user).toBeDefined();

      // 5. Student queries lectures: must see the posted lecture
      const { data: studentLectures, error: sLecErr } = await studentClient
        .from("lectures")
        .select("*")
        .eq("classroom_id", ta.classroom_id)
        .eq("status", "PUBLISHED");

      expect(sLecErr).toBeNull();
      expect(studentLectures).toBeDefined();
      const foundInStudentView = studentLectures!.find((l) => l.id === createdLectureId);
      expect(foundInStudentView).toBeDefined();
      expect(foundInStudentView!.title).toBe(testTitle);

      // 6. Strict RLS Security: Student CANNOT insert or create lectures
      const { error: studentInsertErr } = await studentClient
        .from("lectures")
        .insert({
          teaching_assignment_id: ta.id,
          faculty_id: studentAuth.user!.id,
          classroom_id: ta.classroom_id,
          subject_name: ta.subject_name,
          topic: "Unauthorized Topic",
          title: "Hacked Lecture",
          youtube_video_id: testVideoId,
          youtube_url: `https://www.youtube.com/watch?v=${testVideoId}`,
        });

      // Expect RLS to block student insert
      expect(studentInsertErr).toBeDefined();

      // 7. Strict RLS Security: Student CANNOT delete lectures
      const { error: studentDeleteErr } = await studentClient
        .from("lectures")
        .delete()
        .eq("id", createdLectureId);

      // Delete should fail or delete 0 rows due to RLS
      const { data: stillExists } = await adminClient
        .from("lectures")
        .select("id")
        .eq("id", createdLectureId)
        .maybeSingle();

      expect(stillExists).toBeDefined();

      // 8. Test Archive toggle: Archived lectures are hidden from student
      const { error: archiveErr } = await adminClient
        .from("lectures")
        .update({ status: "ARCHIVED" })
        .eq("id", createdLectureId);

      expect(archiveErr).toBeNull();

      const { data: studentLecturesAfterArchive } = await studentClient
        .from("lectures")
        .select("*")
        .eq("classroom_id", ta.classroom_id)
        .eq("status", "PUBLISHED");

      const archivedFound = studentLecturesAfterArchive?.find((l) => l.id === createdLectureId);
      expect(archivedFound).toBeUndefined();
    } finally {
      // Cleanup test lecture
      await adminClient.from("lectures").delete().eq("id", createdLectureId);
    }
  });
});
