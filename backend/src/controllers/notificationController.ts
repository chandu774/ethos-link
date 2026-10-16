import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Notification } from "../models/Notification";

export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const notifications = await Notification.find({ user_id: req.user?._id }).sort({ created_at: -1 });
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch notifications." });
  }
}

export async function markAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { read: true, is_read: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to mark notification as read." });
  }
}

export async function markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    await Notification.updateMany({ user_id: req.user?._id }, { read: true, is_read: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to mark all as read." });
  }
}
