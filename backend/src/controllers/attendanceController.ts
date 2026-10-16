import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ClassSession } from "../models/ClassSession";
import { AttendanceRecord } from "../models/AttendanceRecord";
import { TeachingAssignment } from "../models/TeachingAssignment";
import { ClassroomMember } from "../models/ClassroomMember";
import mongoose from "mongoose";

// Faculty: Record class session and attendance in batch
export async function recordSessionAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teaching_assignment_id, classroom_id, session_date, topic_covered, concepts_taught, notes, attendance_data, session_id } = req.body;

    if (!teaching_assignment_id || !session_date || !topic_covered) {
      res.status(400).json({ error: "Missing required session parameters." });
      return;
    }

    let session: any = null;
    if (session_id) {
      session = await ClassSession.findByIdAndUpdate(
        session_id,
        {
          topic_covered: topic_covered.trim(),
          concepts_taught: Array.isArray(concepts_taught) ? concepts_taught : [topic_covered.trim()],
          notes,
        },
        { new: true }
      );
      if (session) {
        await AttendanceRecord.deleteMany({ session_id: session._id });
      }
    }

    if (!session) {
      let cid = classroom_id;
      if (!cid) {
        const ta = await TeachingAssignment.findById(teaching_assignment_id);
        cid = ta?.classroom_id;
      }

      session = await ClassSession.create({
        teaching_assignment_id,
        classroom_id: cid,
        faculty_id: req.user?._id,
        session_date,
        topic_covered: topic_covered.trim(),
        concepts_taught: Array.isArray(concepts_taught) ? concepts_taught : [topic_covered.trim()],
        notes,
      });
    }

    // Process attendance data: array of { student_id, status: 'present' | 'absent' }
    if (Array.isArray(attendance_data) && attendance_data.length > 0) {
      const records = attendance_data.map((item) => ({
        session_id: session._id,
        student_id: item.student_id,
        status: item.status || "present",
        remarks: item.remarks || "",
      }));

      await AttendanceRecord.insertMany(records);
    }

    res.status(201).json({
      message: "Attendance recorded successfully.",
      session,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to record attendance." });
  }
}

// Get sessions for a classroom or teaching assignment
export async function getSessions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { classroomId, teachingAssignmentId, date } = req.query;
    const filter: any = {};
    if (classroomId) filter.classroom_id = classroomId;
    if (teachingAssignmentId) filter.teaching_assignment_id = teachingAssignmentId;
    if (date) filter.session_date = date;

    const sessions = await ClassSession.find(filter)
      .populate("teaching_assignment_id", "subject_name subject_code")
      .populate("faculty_id", "name")
      .sort({ session_date: -1, created_at: -1 });

    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const records = await AttendanceRecord.find({ session_id: s._id }).populate("student_id", "name roll_number");
        const presents = records
          .filter((r) => r.status === "present")
          .map((r: any) => `${r.student_id?.name} (${r.student_id?.roll_number})`);
        const absents = records
          .filter((r) => r.status === "absent")
          .map((r: any) => `${r.student_id?.name} (${r.student_id?.roll_number})`);

        return {
          id: s._id.toString(),
          date: s.session_date,
          topic: s.topic_covered,
          teaching_notes: s.notes,
          present_count: presents.length,
          absent_count: absents.length,
          total_students: records.length,
          present_students: presents,
          absent_students: absents,
          attendance_records: records.map((r: any) => ({
            student_id: r.student_id?._id?.toString() || r.student_id?.toString() || r.student_id,
            status: r.status,
          })),
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get sessions." });
  }
}

// Get attendance for a specific session
export async function getSessionAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const records = await AttendanceRecord.find({ session_id: sessionId })
      .populate("student_id", "name email roll_number")
      .sort({ created_at: 1 });

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get session attendance." });
  }
}

// Student: Get personal attendance metrics and history
export async function getStudentAttendanceMetrics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const studentId = req.user?._id;

    // Find student's classroom
    const membership = await ClassroomMember.findOne({ student_id: studentId });
    if (!membership) {
      res.json({
        totalClasses: 0,
        attendedClasses: 0,
        percentage: 0,
        subjectAttendance: [],
        recentMissedClass: null,
      });
      return;
    }

    // Get all sessions for this classroom
    const sessions = await ClassSession.find({ classroom_id: membership.classroom_id })
      .populate("teaching_assignment_id", "subject_name subject_code")
      .sort({ session_date: -1 });

    const sessionIds = sessions.map((s) => s._id);

    // Get student's records for these sessions
    const records = await AttendanceRecord.find({
      session_id: { $in: sessionIds },
      student_id: studentId,
    });

    const recordMap = new Map<string, string>();
    records.forEach((r) => {
      recordMap.set(r.session_id.toString(), r.status);
    });

    let totalClasses = 0;
    let attendedClasses = 0;
    const subjectMap = new Map<string, { total: number; present: number }>();
    let recentMissedClass: any = null;

    sessions.forEach((s) => {
      const status = recordMap.get(s._id.toString()) || "present"; // default to present if cohort was logged
      totalClasses++;
      if (status === "present") {
        attendedClasses++;
      } else if (!recentMissedClass) {
        recentMissedClass = {
          date: s.session_date,
          subjectName: (s.teaching_assignment_id as any)?.subject_name || "Academic Subject",
          topic: s.topic_covered,
          conceptsTaught: s.concepts_taught || [],
          hasFacultyLecture: false,
        };
      }

      const subName = (s.teaching_assignment_id as any)?.subject_name || "General";
      const current = subjectMap.get(subName) || { total: 0, present: 0 };
      current.total++;
      if (status === "present") current.present++;
      subjectMap.set(subName, current);
    });

    const subjectAttendance = Array.from(subjectMap.entries()).map(([name, data]) => ({
      subjectName: name,
      total: data.total,
      present: data.present,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 100,
    }));

    const percentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 100;

    res.json({
      totalClasses,
      attendedClasses,
      percentage,
      subjectAttendance,
      recentMissedClass,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to calculate attendance metrics." });
  }
}
