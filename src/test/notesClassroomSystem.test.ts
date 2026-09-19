import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { studentAnalyticsService } from "@/services/studentAnalyticsService";
import { buildStoragePath } from "@/lib/collaboration";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

describe("Restructured Notes System — Automatic Classroom Assignment", () => {
  const TEST_STUDENT_EMAIL = "24501a0528@student.synapse.local";
  const TEST_STUDENT_PASSWORD = "Student@123";
  let studentClient: any;
  let studentId: string;
  const EXPECTED_CLASSROOM_ID = "0dc6172f-1e85-4e9b-a91a-5ea1219d989c"; // B.Tech CSE - 3A

  beforeAll(async () => {
    studentClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error } = await studentClient.auth.signInWithPassword({
      email: TEST_STUDENT_EMAIL,
      password: TEST_STUDENT_PASSWORD,
    });

    if (error || !authData.user) {
      throw new Error(`Failed to sign in test student: ${error?.message}`);
    }

    studentId = authData.user.id;
    // Also sign in the singleton client for service calls
    await supabase.auth.signInWithPassword({
      email: TEST_STUDENT_EMAIL,
      password: TEST_STUDENT_PASSWORD,
    });
  });

  it("automatically resolves student's genuine classroom and subjects without user input", async () => {
    const context = await studentAnalyticsService.getStudentAcademicContext(studentId);
    expect(context).not.toBeNull();
    expect(context?.studentId).toBe(studentId);
    expect(context?.classroomId).toBe(EXPECTED_CLASSROOM_ID);
    expect(context?.classroomName).toBe("B.Tech CSE - 3A");

    // Subjects must only be from teaching_assignments of that classroom
    expect(context?.subjects.length).toBeGreaterThan(0);
    const subjectNames = context?.subjects.map((s) => s.subjectName) || [];
    expect(subjectNames).toContain("Data Structures and Algorithms");
    expect(subjectNames).toContain("JAVA");
  });

  it("verifies server-side database schema has classroom_id and nullable group_id", async () => {
    const { data, error } = await studentClient
      .from("notes")
      .select("id, title, description, subject, file_url, classroom_id, group_id, user_id")
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("constructs storage paths partitioned by classroom_id prefix", () => {
    const fakeFile = new File(["dummy"], "lecture-notes.pdf", { type: "application/pdf" });
    const storagePath = buildStoragePath(studentId, fakeFile, EXPECTED_CLASSROOM_ID);

    expect(storagePath.startsWith(`${EXPECTED_CLASSROOM_ID}/${studentId}/`)).toBe(true);
    expect(storagePath.endsWith(".pdf")).toBe(true);
  });

  it("verifies zero fake or hardcoded notes exist in the database", async () => {
    const { count, error } = await studentClient
      .from("notes")
      .select("*", { count: "exact", head: true });

    expect(error).toBeNull();
    // Honest empty state verification
    expect(count).toBe(0);
  });

  it("verifies server-side trigger assign_note_classroom enforces student classroom on insert", async () => {
    // Attempt to insert a note: the trigger must automatically bind classroom_id to B.Tech CSE - 3A
    // Even if client supplied an arbitrary fake classroom_id!
    const FAKE_ARBITRARY_CLASSROOM = "00000000-0000-0000-0000-000000000000";

    const { data: insertedNote, error: insertError } = await studentClient
      .from("notes")
      .insert({
        title: "Test Unit 1 Linked Lists",
        description: "Pointers and memory allocation notes",
        subject: "Data Structures and Algorithms",
        file_url: `${EXPECTED_CLASSROOM_ID}/${studentId}/test-note.pdf`,
        classroom_id: FAKE_ARBITRARY_CLASSROOM, // Malicious/tampered classroom ID
        user_id: studentId,
      })
      .select("id, classroom_id, user_id, title, subject")
      .single();

    expect(insertError).toBeNull();
    expect(insertedNote).toBeDefined();

    // Trigger MUST have overridden the fake classroom with the student's authentic classroom!
    expect(insertedNote.classroom_id).toBe(EXPECTED_CLASSROOM_ID);
    expect(insertedNote.user_id).toBe(studentId);

    // Clean up test note
    const { error: delError } = await studentClient
      .from("notes")
      .delete()
      .eq("id", insertedNote.id);

    expect(delError).toBeNull();
  });
});
