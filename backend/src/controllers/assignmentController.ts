import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Assignment } from "../models/Assignment";
import { AssignmentSubmission } from "../models/AssignmentSubmission";
import { ClassroomMember } from "../models/ClassroomMember";
import { Task } from "../models/Task";

// Get assignments for student or faculty
export async function getAssignments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { classroomId } = req.query;
    let filter: any = {};

    if (classroomId) {
      filter.classroom_id = classroomId;
    } else if (req.user?.role === "student") {
      // Find student's classroom
      const member = await ClassroomMember.findOne({ student_id: req.user._id });
      if (member) {
        filter.classroom_id = member.classroom_id;
      }
    } else if (req.user?.role === "faculty") {
      filter.created_by = req.user._id;
    }

    const assignments = await Assignment.find(filter)
      .populate("teaching_assignment_id", "subject_name subject_code")
      .populate("classroom_id", "name course branch section")
      .populate("created_by", "name")
      .sort({ deadline: 1, created_at: -1 });

    // If student, attach submission status
    if (req.user?.role === "student") {
      const assignmentIds = assignments.map((a) => a._id);
      const submissions = await AssignmentSubmission.find({
        assignment_id: { $in: assignmentIds },
        user_id: req.user._id,
      });

      const submissionMap = new Map<string, any>();
      submissions.forEach((s) => {
        submissionMap.set(s.assignment_id.toString(), s);
      });

      const enriched = assignments.map((a) => {
        const sub = submissionMap.get(a._id.toString());
        return {
          ...a.toJSON(),
          submission: sub ? sub.toJSON() : null,
          has_submitted: !!sub,
          status: sub ? sub.status : "pending",
        };
      });

      res.json(enriched);
      return;
    }

    // If faculty, attach submission counts
    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const submissionCount = await AssignmentSubmission.countDocuments({ assignment_id: a._id });
        return {
          ...a.toJSON(),
          submissions_count: submissionCount,
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch assignments." });
  }
}

// Get single assignment detail
export async function getAssignmentById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id)
      .populate("teaching_assignment_id", "subject_name subject_code")
      .populate("classroom_id", "name course branch section")
      .populate("created_by", "name email");

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found." });
      return;
    }

    let submission = null;
    if (req.user?.role === "student") {
      submission = await AssignmentSubmission.findOne({
        assignment_id: id,
        user_id: req.user._id,
      });
    }

    res.json({
      ...assignment.toJSON(),
      submission: submission ? submission.toJSON() : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get assignment." });
  }
}

// Create assignment (Faculty)
export async function createAssignment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      classroom_id,
      teaching_assignment_id,
      title,
      description,
      max_marks,
      deadline,
      attachment_url,
      attachment_name,
      topic,
      estimated_effort,
    } = req.body;

    if (!title || !deadline) {
      res.status(400).json({ error: "Title and deadline are required." });
      return;
    }

    const assignment = await Assignment.create({
      classroom_id,
      teaching_assignment_id,
      title: title.trim(),
      description,
      max_marks: Number(max_marks) || 20,
      deadline,
      attachment_url,
      attachment_name,
      topic,
      estimated_effort: estimated_effort || "30 min",
      created_by: req.user?._id,
    });

    // Auto-create official Task for assigned students
    if (classroom_id) {
      const members = await ClassroomMember.find({ classroom_id });
      const tasks = members.map((m) => ({
        user_id: m.student_id,
        assigned_to: m.student_id,
        assignment_id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        deadline: assignment.deadline,
        due_date: assignment.deadline,
        priority: "HIGH",
        status: "pending",
        is_official: true,
        subject: topic || "Coursework",
      }));
      if (tasks.length > 0) {
        await Task.insertMany(tasks);
      }
    }

    res.status(201).json(assignment);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create assignment." });
  }
}

// Submit assignment (Student)
export async function submitAssignment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { submission_text, attachment_url, attachment_name } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      res.status(404).json({ error: "Assignment not found." });
      return;
    }

    const submission = await AssignmentSubmission.findOneAndUpdate(
      { assignment_id: id, user_id: req.user?._id },
      {
        submission_text,
        attachment_url,
        attachment_name,
        status: "submitted",
        submitted_at: new Date(),
      },
      { upsert: true, new: true }
    );

    // Update corresponding Task status to completed
    await Task.updateMany(
      { assignment_id: id, user_id: req.user?._id },
      { status: "completed" }
    );

    res.status(201).json(submission);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to submit assignment." });
  }
}

// Get all submissions for an assignment (Faculty)
export async function getAssignmentSubmissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const submissions = await AssignmentSubmission.find({ assignment_id: id })
      .populate("user_id", "name email roll_number course branch section")
      .sort({ submitted_at: -1 });

    res.json(submissions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get submissions." });
  }
}

// Grade submission (Faculty)
export async function gradeSubmission(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { submissionId } = req.params;
    const { marks_obtained, feedback } = req.body;

    const submission = await AssignmentSubmission.findByIdAndUpdate(
      submissionId,
      {
        marks_obtained: Number(marks_obtained),
        feedback,
        status: "graded",
      },
      { new: true }
    );

    res.json(submission);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to grade submission." });
  }
}

// Update assignment (Faculty / Admin)
export async function updateAssignment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;

    const assignment = await Assignment.findByIdAndUpdate(id, updates, { new: true });
    if (!assignment) {
      res.status(404).json({ error: "Assignment not found." });
      return;
    }

    if (updates.deadline) {
      await Task.updateMany(
        { assignment_id: id },
        { deadline: updates.deadline, due_date: updates.deadline }
      );
    }

    res.json(assignment);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update assignment." });
  }
}

// Get all submissions across assignments (Faculty / Admin)
export async function getAllSubmissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    let filter: any = {};
    if (req.user?.role === "faculty") {
      const myAssignments = await Assignment.find({ created_by: req.user._id }).select("_id");
      const assignmentIds = myAssignments.map((a) => a._id);
      filter.assignment_id = { $in: assignmentIds };
    }

    const submissions = await AssignmentSubmission.find(filter)
      .populate("user_id", "name roll_number email")
      .populate("assignment_id", "title deadline max_marks")
      .sort({ submitted_at: -1 });

    const formatted = submissions.map((s) => {
      const json = s.toJSON() as any;
      return {
        ...json,
        student: json.user_id,
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get submissions." });
  }
}

// Delete assignment (Faculty / Admin)
export async function deleteAssignment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Assignment.findByIdAndDelete(id);
    await AssignmentSubmission.deleteMany({ assignment_id: id });
    await Task.deleteMany({ assignment_id: id });
    res.json({ message: "Assignment deleted." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete assignment." });
  }
}

