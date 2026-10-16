import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Task } from "../models/Task";

export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const tasks = await Task.find({
      $or: [{ user_id: userId }, { assigned_to: userId }, { created_by: userId }],
    }).sort({ deadline: 1, created_at: -1 });

    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch tasks." });
  }
}

export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { title, description, deadline, due_date, priority, subject, estimated_minutes } = req.body;

    if (!title) {
      res.status(400).json({ error: "Title is required." });
      return;
    }

    const task = await Task.create({
      user_id: req.user?._id,
      created_by: req.user?._id,
      title: title.trim(),
      description,
      deadline: deadline || due_date,
      due_date: due_date || deadline,
      priority: priority || "MEDIUM",
      status: "pending",
      subject: subject || "Personal Task",
      estimated_minutes: Number(estimated_minutes) || 30,
      is_official: false,
    });

    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create task." });
  }
}

export async function updateTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndUpdate(id, req.body, { new: true });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update task." });
  }
}

export async function deleteTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Task.findByIdAndDelete(id);
    res.json({ message: "Task deleted." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete task." });
  }
}
