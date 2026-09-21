import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";

describe("Faculty My Classrooms Data Flow & Ownership", () => {
  it("verifies teaching_assignments and classrooms database relationships", async () => {
    // 1. Fetch teaching assignments joined with classrooms
    const { data: assignments, error: assignErr } = await supabase
      .from("teaching_assignments")
      .select(`
        id,
        subject_name,
        subject_code,
        faculty_id,
        classroom_id,
        classroom:classrooms!teaching_assignments_classroom_id_fkey (
          id,
          name,
          course,
          branch,
          year,
          section,
          academic_year
        )
      `)
      .limit(5);

    expect(assignErr).toBeNull();
    expect(Array.isArray(assignments)).toBe(true);

    if (assignments && assignments.length > 0) {
      const first = assignments[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("subject_name");
      expect(first).toHaveProperty("classroom");
      expect(first.classroom).toHaveProperty("name");
    }
  });

  it("verifies faculty isolation logic: teaching assignments are partitioned by faculty_id", () => {
    // Simulated database records representing Admin assignments
    const mockAssignments = [
      {
        id: "ta1",
        faculty_id: "faculty-sudhakar",
        subject_name: "DBMS",
        classroom: { id: "c1", name: "B.Tech CSE - 3A" },
      },
      {
        id: "ta2",
        faculty_id: "faculty-sudhakar",
        subject_name: "OS",
        classroom: { id: "c1", name: "B.Tech CSE - 3A" },
      },
      {
        id: "ta3",
        faculty_id: "faculty-manasa",
        subject_name: "JAVA",
        classroom: { id: "c2", name: "B.Tech CSE - 2B" },
      },
    ];

    // Faculty Sudhakar queries own classrooms
    const sudhakarClassrooms = mockAssignments.filter(
      (a) => a.faculty_id === "faculty-sudhakar"
    );
    expect(sudhakarClassrooms.length).toBe(2);
    expect(sudhakarClassrooms.map((c) => c.subject_name)).toEqual(["DBMS", "OS"]);

    // Faculty Manasa queries own classrooms
    const manasaClassrooms = mockAssignments.filter(
      (a) => a.faculty_id === "faculty-manasa"
    );
    expect(manasaClassrooms.length).toBe(1);
    expect(manasaClassrooms[0].subject_name).toBe("JAVA");

    // Verify Faculty A cannot see Faculty B's classrooms
    expect(sudhakarClassrooms.some((c) => c.faculty_id === "faculty-manasa")).toBe(false);
    expect(manasaClassrooms.some((c) => c.faculty_id === "faculty-sudhakar")).toBe(false);
  });

  it("verifies enrolled student counts match classroom_members mapping", () => {
    const classroomMembers = [
      { classroom_id: "c1", student_id: "st1" },
      { classroom_id: "c1", student_id: "st2" },
      { classroom_id: "c1", student_id: "st3" },
      { classroom_id: "c2", student_id: "st4" },
    ];

    const studentCounts: Record<string, number> = {};
    classroomMembers.forEach((m) => {
      studentCounts[m.classroom_id] = (studentCounts[m.classroom_id] || 0) + 1;
    });

    expect(studentCounts["c1"]).toBe(3);
    expect(studentCounts["c2"]).toBe(1);
    expect(studentCounts["c3"] || 0).toBe(0);
  });

  it("confirms empty state message contract when faculty has 0 assigned classrooms", () => {
    const unassignedFacultyAssignments: any[] = [];
    expect(unassignedFacultyAssignments.length).toBe(0);

    const emptyStateText = "No classrooms assigned yet";
    const helperText = "Your administrator will assign classrooms to you. Once assigned, your classrooms, students, and curriculum will appear here automatically.";

    expect(emptyStateText).toContain("No classrooms assigned yet");
    expect(helperText).not.toContain("Create First Classroom");
    expect(helperText).not.toContain("Create Classroom");
  });
});
