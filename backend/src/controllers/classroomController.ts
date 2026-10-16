import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Classroom } from "../models/Classroom";
import { ClassroomMember } from "../models/ClassroomMember";
import { TeachingAssignment } from "../models/TeachingAssignment";
import { User } from "../models/User";

// Admin: Get all classrooms
export async function getAllClassrooms(req: AuthRequest, res: Response): Promise<void> {
  try {
    const classrooms = await Classroom.find().sort({ created_at: -1 });

    const enriched = await Promise.all(
      classrooms.map(async (c) => {
        const studentCount = await ClassroomMember.countDocuments({ classroom_id: c._id });
        const facultyCount = await TeachingAssignment.countDocuments({ classroom_id: c._id });
        return {
          ...c.toJSON(),
          student_count: studentCount,
          faculty_count: facultyCount,
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch classrooms." });
  }
}

// Admin: Create classroom
export async function createClassroom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, course, branch, year, section, academic_year, class_code } = req.body;
    if (!name || !course || !branch || !year || !section) {
      res.status(400).json({ error: "Name, course, branch, year, and section are required." });
      return;
    }

    const classroom = await Classroom.create({
      name: name.trim(),
      course: course.trim(),
      branch: branch.trim(),
      year,
      section: section.trim(),
      academic_year: (academic_year || "2026-27").trim(),
      class_code: class_code?.trim() || `CLS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      created_by: req.user?._id,
    });

    res.status(201).json(classroom);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create classroom." });
  }
}

import { Assignment } from "../models/Assignment";
import { Quiz } from "../models/Quiz";
import { ClassSession } from "../models/ClassSession";
import { QuizAttempt } from "../models/QuizAttempt";

// Admin: Get classroom detail
export async function getClassroomById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const classroom = await Classroom.findById(id);
    if (!classroom) {
      res.status(404).json({ error: "Classroom not found." });
      return;
    }

    const members = await ClassroomMember.find({ classroom_id: id }).populate("student_id", "name email roll_number course branch year section");
    const teachingAssignments = await TeachingAssignment.find({ classroom_id: id }).populate("faculty_id", "name email faculty_id department designation");
    const assignments = await Assignment.find({ classroom_id: id }).sort({ created_at: -1 });
    const quizzes = await Quiz.find({ classroom_id: id }).sort({ created_at: -1 });
    const sessions = await ClassSession.find({ classroom_id: id })
      .populate("faculty_id", "name")
      .populate("teaching_assignment_id", "subject_name")
      .sort({ session_date: -1 });

    res.json({
      classroom,
      members: members.map((m) => ({
        id: m.id,
        _id: m._id,
        enrolled_at: (m as any).enrolled_at || (m as any).created_at,
        joined_at: (m as any).enrolled_at || (m as any).created_at,
        student: m.student_id,
      })),
      teaching_assignments: teachingAssignments.map((t) => ({
        id: t.id,
        _id: t._id,
        subject_name: t.subject_name,
        subject_code: t.subject_code,
        faculty_id: (t.faculty_id as any)?._id || (t.faculty_id as any)?.id || t.faculty_id,
        faculty: t.faculty_id,
      })),
      assignments,
      quizzes,
      sessions: sessions.map((s) => ({
        id: s.id,
        _id: s._id,
        date: s.session_date,
        topic: s.topic_covered,
        teaching_notes: s.notes,
        teaching_assignment: {
          id: (s.teaching_assignment_id as any)?._id || (s.teaching_assignment_id as any)?.id,
          subject_name: (s.teaching_assignment_id as any)?.subject_name,
          faculty: { name: (s.faculty_id as any)?.name },
        },
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get classroom." });
  }
}

// Admin: Delete classroom
export async function deleteClassroom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Classroom.findByIdAndDelete(id);
    await ClassroomMember.deleteMany({ classroom_id: id });
    await TeachingAssignment.deleteMany({ classroom_id: id });
    res.json({ message: "Classroom deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete classroom." });
  }
}

// Admin: Enroll student in classroom
export async function enrollStudent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { student_id } = req.body;

    if (!student_id) {
      res.status(400).json({ error: "student_id is required." });
      return;
    }

    const existing = await ClassroomMember.findOne({ classroom_id: id, student_id });
    if (existing) {
      res.status(400).json({ error: "Student is already enrolled in this classroom." });
      return;
    }

    const membership = await ClassroomMember.create({
      classroom_id: id,
      student_id,
    });

    res.status(201).json(membership);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to enroll student." });
  }
}

// Admin: Remove student from classroom
export async function removeStudent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id, studentId } = req.params;
    await ClassroomMember.findOneAndDelete({ classroom_id: id, student_id: studentId });
    res.json({ message: "Student removed from classroom." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to remove student." });
  }
}

// Admin: Assign faculty to classroom subject
export async function assignFaculty(req: AuthRequest, res: Response): Promise<void> {
  try {
    const classroomId = req.params.id || req.body.classroom_id;
    const { faculty_id, subject_name, subject_code } = req.body;

    if (!classroomId || !faculty_id || !subject_name) {
      res.status(400).json({ error: "classroom_id, faculty_id and subject_name are required." });
      return;
    }

    const assignment = await TeachingAssignment.create({
      classroom_id: classroomId,
      faculty_id,
      subject_name: subject_name.trim(),
      subject_code: subject_code?.trim(),
    });

    res.status(201).json(assignment);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to assign faculty." });
  }
}

// Admin: Get all teaching assignments
export async function getAllTeachingAssignments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const assignments = await TeachingAssignment.find()
      .populate("faculty_id", "name faculty_id department designation")
      .populate("classroom_id", "name course branch section")
      .sort({ created_at: -1 });

    const formatted = assignments.map((a) => ({
      ...a.toJSON(),
      faculty: a.faculty_id,
      classroom: a.classroom_id,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch teaching assignments." });
  }
}

// Admin: Remove faculty teaching assignment
export async function removeTeachingAssignment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { assignmentId } = req.params;
    await TeachingAssignment.findByIdAndDelete(assignmentId);
    res.json({ message: "Teaching assignment removed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to remove teaching assignment." });
  }
}

// Student: Get current enrolled classroom and subjects
export async function getStudentCohort(req: AuthRequest, res: Response): Promise<void> {
  try {
    const studentId = req.user?._id;
    const member = await ClassroomMember.findOne({ student_id: studentId }).populate("classroom_id");

    if (!member || !member.classroom_id) {
      res.json({ classroom: null, subjects: [] });
      return;
    }

    const classroom = member.classroom_id as any;
    const teachingAssignments = await TeachingAssignment.find({ classroom_id: classroom._id }).populate("faculty_id", "name email");

    res.json({
      classroom: {
        id: classroom._id.toString(),
        name: classroom.name,
        course: classroom.course,
        branch: classroom.branch,
        year: classroom.year,
        section: classroom.section,
        academic_year: classroom.academic_year,
      },
      subjects: teachingAssignments.map((t) => ({
        id: t._id.toString(),
        subjectName: t.subject_name,
        subjectCode: t.subject_code,
        facultyName: (t.faculty_id as any)?.name || "Faculty",
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch student cohort." });
  }
}

// Faculty: Get assigned classrooms
export async function getFacultyClassrooms(req: AuthRequest, res: Response): Promise<void> {
  try {
    const facultyId = req.user?._id;
    const assignments = await TeachingAssignment.find({ faculty_id: facultyId }).populate("classroom_id");

    const result = await Promise.all(
      assignments.map(async (ta) => {
        const cls = ta.classroom_id as any;
        if (!cls) return null;
        const studentCount = await ClassroomMember.countDocuments({ classroom_id: cls._id });
        const assignmentCount = await Assignment.countDocuments({ classroom_id: cls._id });
        const quizCount = await Quiz.countDocuments({ classroom_id: cls._id });

        return {
          assignment_id: ta._id.toString(),
          id: cls._id.toString(),
          classroom_id: cls._id.toString(),
          name: cls.name,
          classroom_name: cls.name,
          course: cls.course,
          branch: cls.branch,
          year: cls.year,
          section: cls.section,
          academic_year: cls.academic_year,
          subject_name: ta.subject_name,
          subject_code: ta.subject_code,
          faculty_name: req.user?.name || "Faculty Member",
          student_count: studentCount,
          assignment_count: assignmentCount,
          quiz_count: quizCount,
        };
      })
    );

    res.json(result.filter(Boolean));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch faculty classrooms." });
  }
}

// Faculty/Admin: Get single teaching assignment with enrolled students, quizzes, assignments, and attempts
export async function getTeachingAssignmentDetail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { assignmentId } = req.params;
    const ta = await TeachingAssignment.findById(assignmentId).populate("classroom_id");
    if (!ta) {
      res.status(404).json({ error: "Teaching assignment not found." });
      return;
    }

    if (req.user?.role === "faculty" && ta.faculty_id.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: "Unauthorized access to this teaching assignment." });
      return;
    }

    const cls = ta.classroom_id as any;
    const members = await ClassroomMember.find({ classroom_id: cls?._id || cls }).populate(
      "student_id",
      "name email roll_number course branch year section"
    );
    const quizzes = await Quiz.find({ teaching_assignment_id: ta._id }).sort({ created_at: -1 });
    const assignments = await Assignment.find({ teaching_assignment_id: ta._id }).sort({ created_at: -1 });

    const quizIds = quizzes.map((q) => q._id);
    const attempts = await QuizAttempt.find({ quiz_id: { $in: quizIds } });

    res.json({
      teaching_assignment: {
        id: ta._id.toString(),
        faculty_id: ta.faculty_id,
        classroom_id: cls?._id?.toString() || cls?.toString(),
        subject_name: ta.subject_name,
        subject_code: ta.subject_code,
        classroom: cls,
      },
      students: members.map((m) => m.student_id).filter(Boolean),
      quizzes,
      assignments,
      quiz_attempts: attempts.map((att) => ({
        id: att._id.toString(),
        user_id: att.user_id.toString(),
        quiz_id: att.quiz_id.toString(),
        score: att.score,
        max_score: att.total_questions || att.max_score || 0,
        completed_at: att.completed_at || att.submitted_at || att.created_at,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch teaching assignment detail." });
  }
}

