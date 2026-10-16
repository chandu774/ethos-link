import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { User } from "../models/User";
import { ClassroomMember } from "../models/ClassroomMember";
import { TeachingAssignment } from "../models/TeachingAssignment";
import { QuizAttempt } from "../models/QuizAttempt";
import { Assignment } from "../models/Assignment";
import { AssignmentSubmission } from "../models/AssignmentSubmission";
import { StudentConceptHistory } from "../models/StudentConceptHistory";
import { AttendanceRecord } from "../models/AttendanceRecord";
import bcrypt from "bcryptjs";

// List all students
export async function getStudents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const students = await User.find({ role: "student" }).sort({ name: 1 });

    const enriched = await Promise.all(
      students.map(async (s) => {
        const membership = await ClassroomMember.findOne({ student_id: s._id }).populate("classroom_id", "name course branch year section");
        return {
          ...s.toJSON(),
          classroom: membership ? membership.classroom_id : null,
          classroom_name: (membership?.classroom_id as any)?.name || "",
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch students." });
  }
}

// List all faculty
export async function getFaculty(req: AuthRequest, res: Response): Promise<void> {
  try {
    const faculty = await User.find({ role: "faculty" }).sort({ name: 1 });

    const enriched = await Promise.all(
      faculty.map(async (f) => {
        const assignments = await TeachingAssignment.find({ faculty_id: f._id }).populate("classroom_id", "name course branch section");
        return {
          ...f.toJSON(),
          teaching_assignments: assignments,
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch faculty." });
  }
}

// Admin: Create user (student or faculty)
export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, password, role, roll_number, faculty_id, department, designation, course, branch, year, section, classroom_id } = req.body;

    if (!name || !password) {
      res.status(400).json({ error: "Name and password are required." });
      return;
    }

    const finalEmail = (
      email ||
      (roll_number ? `${roll_number.toLowerCase().replace(/[^a-z0-9]/g, "")}@synapse.edu` : "") ||
      (faculty_id ? `${faculty_id.toLowerCase().replace(/[^a-z0-9]/g, "")}@synapse.edu` : "") ||
      `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}_${Date.now()}@synapse.edu`
    ).toLowerCase().trim();

    const existing = await User.findOne({ email: finalEmail });
    if (existing) {
      res.status(400).json({ error: "User with this email already exists." });
      return;
    }

    if (roll_number) {
      const existingRoll = await User.findOne({ roll_number: roll_number.trim() });
      if (existingRoll) {
        res.status(400).json({ error: `User with roll number ${roll_number} already exists.` });
        return;
      }
    }

    if (faculty_id) {
      const existingFac = await User.findOne({ faculty_id: faculty_id.trim() });
      if (existingFac) {
        res.status(400).json({ error: `Faculty with ID ${faculty_id} already exists.` });
        return;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: finalEmail,
      password: hashedPassword,
      role: role || "student",
      roll_number: roll_number?.trim(),
      faculty_id: faculty_id?.trim(),
      department: department?.trim(),
      designation: designation?.trim(),
      course: course?.trim(),
      branch: branch?.trim(),
      year: year?.toString().trim(),
      section: section?.trim(),
      must_change_password: true,
      created_by_admin: req.user?._id,
    });

    if (classroom_id) {
      await ClassroomMember.create({
        classroom_id,
        student_id: user._id,
      });
    }

    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create user." });
  }
}

// Admin: Delete user
export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    await ClassroomMember.deleteMany({ student_id: id });
    await TeachingAssignment.deleteMany({ faculty_id: id });
    res.json({ message: "User deleted." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete user." });
  }
}

// Search users
export async function searchUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { query } = req.query;
    if (!query) {
      const users = await User.find({ _id: { $ne: req.user?._id } })
        .select("id name roll_number avatar_url bio department course branch")
        .limit(50);
      res.json(users);
      return;
    }
    const regex = new RegExp(String(query), "i");
    const users = await User.find({
      _id: { $ne: req.user?._id },
      $or: [{ name: regex }, { roll_number: regex }, { email: regex }],
    })
      .select("id name roll_number avatar_url bio department course branch")
      .limit(20);
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to search users." });
  }
}

// Get public user profile
export async function getUserProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("id name roll_number email avatar_url bio department course branch year section role");
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch user profile." });
  }
}

// Admin: Reset user password
export async function adminResetPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      res.status(400).json({ error: "userId and newPassword are required." });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      must_change_password: true,
    });

    res.json({ message: "Password updated successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to reset password." });
  }
}

// Get detailed student academic telemetry (Faculty / Admin)
export async function getStudentDetail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const student = await User.findById(id);
    if (!student) {
      res.status(404).json({ error: "Student not found." });
      return;
    }

    const membership = await ClassroomMember.findOne({ student_id: id }).populate("classroom_id", "name course branch year section");
    const classroom = membership?.classroom_id as any;

    const attempts = await QuizAttempt.find({ user_id: id })
      .populate("quiz_id", "title topic subject")
      .sort({ completed_at: -1 });

    const mappedAttempts = attempts.map((a: any) => ({
      id: a._id.toString(),
      quiz_id: a.quiz_id?._id?.toString() || a.quiz_id,
      score: a.score,
      max_score: a.total_questions || 100,
      percentage: a.percentage ?? 0,
      completed_at: a.completed_at ? a.completed_at.toISOString() : "",
      quiz_title: a.quiz_id?.title || "Assessment",
      subject: a.quiz_id?.subject || "Subject",
      topic: a.quiz_id?.topic || "Topic",
      quiz: a.quiz_id,
    }));

    const concepts = await StudentConceptHistory.find({ student_id: id }).sort({ mastery_percentage: 1 });
    const mappedConcepts = concepts.map((c) => ({
      concept_name: c.concept_name,
      subject: c.subject || "General",
      topic: c.topic || "Core",
      mastery_percentage: c.mastery_percentage || 0,
      total_questions: c.total_answers || 0,
      correct_count: c.correct_answers || 0,
    }));

    const attRecords = await AttendanceRecord.find({ student_id: id });
    const presentCount = attRecords.filter((r) => r.status === "present" || r.status === "late").length;
    const totalAtt = attRecords.length;
    const attendanceStats = {
      present: presentCount,
      total: totalAtt,
      percentage: totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : null,
    };

    const submissions = await AssignmentSubmission.find({ user_id: id })
      .populate("assignment_id", "title max_marks topic subject deadline")
      .sort({ submitted_at: -1 });

    let totalClassroomAssignments = 0;
    if (classroom?._id) {
      totalClassroomAssignments = await Assignment.countDocuments({ classroom_id: classroom._id });
    }

    const assignmentStats = {
      submitted: submissions.length,
      total: Math.max(totalClassroomAssignments, submissions.length),
    };

    const mappedAssignments = submissions.map((s: any) => ({
      id: s._id.toString(),
      status: s.status,
      marks_obtained: s.marks_obtained,
      submitted_at: s.submitted_at ? s.submitted_at.toISOString() : "",
      assignment: s.assignment_id,
    }));

    res.json({
      profile: {
        id: student._id.toString(),
        name: student.name,
        roll_number: student.roll_number,
        email: student.email,
        avatar_url: student.avatar_url,
        classroom_id: classroom?._id?.toString(),
        classroom_name: classroom?.name || "Enrolled Cohort",
        course_code: classroom?.course || "",
        course: student.course || classroom?.course,
        branch: student.branch || classroom?.branch,
        year: student.year || `${classroom?.year || ""}`,
        section: student.section || classroom?.section,
      },
      quizAttempts: mappedAttempts,
      conceptMastery: mappedConcepts,
      attendanceStats,
      assignmentStats,
      quizzes: mappedAttempts,
      assignments: mappedAssignments,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load student detail." });
  }
}

