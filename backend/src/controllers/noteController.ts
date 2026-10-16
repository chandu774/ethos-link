import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Note } from "../models/Note";
import { NoteLike } from "../models/NoteLike";
import { ClassroomMember } from "../models/ClassroomMember";

// Get notes
export async function getNotes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { classroomId, subjectName, query } = req.query;
    let filter: any = {};

    if (classroomId) {
      filter.classroom_id = classroomId;
    } else if (req.user?.role === "student") {
      const member = await ClassroomMember.findOne({ student_id: req.user._id });
      if (member) filter.classroom_id = member.classroom_id;
    }

    if (subjectName) {
      filter.subject_name = subjectName;
    }

    if (query) {
      filter.$or = [
        { title: { $regex: query as string, $options: "i" } },
        { content: { $regex: query as string, $options: "i" } },
        { tags: { $in: [new RegExp(query as string, "i")] } },
      ];
    }

    const notes = await Note.find(filter)
      .populate("user_id", "name email roll_number avatar_url")
      .populate("classroom_id", "name course branch section")
      .sort({ created_at: -1 });

    // Check if liked by current user
    const noteIds = notes.map((n) => n._id);
    const userLikes = req.user
      ? await NoteLike.find({ note_id: { $in: noteIds }, user_id: req.user._id })
      : [];
    const likedSet = new Set(userLikes.map((l) => l.note_id.toString()));

    const enriched = notes.map((n) => ({
      ...n.toJSON(),
      is_liked: likedSet.has(n._id.toString()),
    }));

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch notes." });
  }
}

// Create note
export async function createNote(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { title, content, subject_name, tags, attachment_url, attachment_name, file_type, file_size, is_public } = req.body;
    let { classroom_id } = req.body;

    if (!title) {
      res.status(400).json({ error: "Title is required." });
      return;
    }

    // Auto-resolve classroom for student if not provided
    if (!classroom_id && req.user?.role === "student") {
      const member = await ClassroomMember.findOne({ student_id: req.user._id });
      if (member) classroom_id = member.classroom_id;
    }

    const note = await Note.create({
      user_id: req.user?._id,
      classroom_id,
      subject_name,
      title: title.trim(),
      content: content || "",
      tags: Array.isArray(tags) ? tags : [],
      attachment_url,
      attachment_name,
      file_type,
      file_size,
      is_public: is_public !== undefined ? is_public : true,
    });

    res.status(201).json(note);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create note." });
  }
}

// Like / unlike note
export async function toggleLikeNote(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const existing = await NoteLike.findOne({ note_id: id, user_id: userId });
    if (existing) {
      await NoteLike.findByIdAndDelete(existing._id);
      await Note.findByIdAndUpdate(id, { $inc: { likes_count: -1 } });
      res.json({ liked: false });
    } else {
      await NoteLike.create({ note_id: id, user_id: userId });
      await Note.findByIdAndUpdate(id, { $inc: { likes_count: 1 } });
      res.json({ liked: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to toggle note like." });
  }
}

// Delete note
export async function deleteNote(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const note = await Note.findById(id);

    if (!note) {
      res.status(404).json({ error: "Note not found." });
      return;
    }

    if (note.user_id.toString() !== req.user?.id && req.user?.role !== "administrator") {
      res.status(403).json({ error: "Unauthorized to delete this note." });
      return;
    }

    await Note.findByIdAndDelete(id);
    await NoteLike.deleteMany({ note_id: id });
    res.json({ message: "Note deleted." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete note." });
  }
}
