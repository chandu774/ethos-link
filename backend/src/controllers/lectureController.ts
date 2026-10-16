import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Lecture } from "../models/Lecture";
import { ClassroomMember } from "../models/ClassroomMember";

// Get lectures
export async function getLectures(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { classroomId, teachingAssignmentId, includeArchived } = req.query;
    let filter: any = {};

    if (includeArchived !== "true") {
      filter.is_archived = { $ne: true };
    }

    if (classroomId) {
      filter.classroom_id = classroomId;
    } else if (teachingAssignmentId) {
      filter.teaching_assignment_id = teachingAssignmentId;
    } else if (req.user?.role === "student") {
      const member = await ClassroomMember.findOne({ student_id: req.user._id });
      if (member) filter.classroom_id = member.classroom_id;
    } else if (req.user?.role === "faculty") {
      filter.faculty_id = req.user._id;
    }

    const lectures = await Lecture.find(filter)
      .populate("classroom_id", "name course branch section")
      .populate("teaching_assignment_id", "subject_name subject_code")
      .populate("faculty_id", "name email")
      .sort({ created_at: -1 });

    res.json(lectures);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch lectures." });
  }
}

// Get single lecture
export async function getLectureById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const lecture = await Lecture.findById(id)
      .populate("classroom_id", "name course branch section")
      .populate("teaching_assignment_id", "subject_name subject_code")
      .populate("faculty_id", "name email");

    if (!lecture) {
      res.status(404).json({ error: "Lecture not found." });
      return;
    }

    res.json(lecture);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get lecture." });
  }
}

// Create lecture (Faculty)
export async function createLecture(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      classroom_id,
      teaching_assignment_id,
      title,
      description,
      youtube_url,
      youtube_video_id,
      duration,
      channel_name,
      thumbnail_url,
      topics,
      concepts_taught,
      transcript,
    } = req.body;

    if (!classroom_id || !teaching_assignment_id || !title || !youtube_url) {
      res.status(400).json({ error: "Missing required lecture fields." });
      return;
    }

    const lecture = await Lecture.create({
      classroom_id,
      teaching_assignment_id,
      faculty_id: req.user?._id,
      title: title.trim(),
      description,
      youtube_url: youtube_url.trim(),
      youtube_video_id: youtube_video_id || youtube_url,
      duration: duration || "15:00",
      channel_name,
      thumbnail_url,
      topics: Array.isArray(topics) ? topics : [],
      concepts_taught: Array.isArray(concepts_taught) ? concepts_taught : [],
      transcript,
    });

    res.status(201).json(lecture);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create lecture." });
  }
}

// Archive / Delete lecture
export async function updateLecture(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updated = await Lecture.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update lecture." });
  }
}

export async function deleteLecture(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Lecture.findByIdAndDelete(id);
    res.json({ message: "Lecture deleted." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete lecture." });
  }
}
