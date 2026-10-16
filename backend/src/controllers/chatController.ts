import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Community, CommunityMember, Group, GroupMember, Message, GroupMessage, Connection } from "../models/SocialChat";
import { User } from "../models/User";

// Direct Messages
export async function getDirectMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender_id: userId, receiver_id: otherUserId },
        { sender_id: otherUserId, receiver_id: userId },
      ],
    })
      .populate("sender_id", "name email avatar_url")
      .populate("receiver_id", "name email avatar_url")
      .sort({ created_at: 1 });

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch messages." });
  }
}

export async function sendDirectMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const senderId = req.user?._id;
    const { receiver_id, content } = req.body;

    if (!receiver_id || !content) {
      res.status(400).json({ error: "receiver_id and content are required." });
      return;
    }

    const message = await Message.create({
      sender_id: senderId,
      receiver_id,
      content: content.trim(),
    });

    const populated = await Message.findById(message._id)
      .populate("sender_id", "name email avatar_url")
      .populate("receiver_id", "name email avatar_url");

    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to send message." });
  }
}

export async function markDirectMessagesSeen(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { messageIds } = req.body;
    if (Array.isArray(messageIds) && messageIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: messageIds }, receiver_id: userId },
        { status: "seen", seen_at: new Date() }
      );
    }
    res.json({ message: "Messages marked as seen." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to mark messages seen." });
  }
}

// Groups
export async function getGroups(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const memberships = await GroupMember.find({ user_id: userId });
    const groupIds = memberships.map((m) => m.group_id);

    const groups = await Group.find({ _id: { $in: groupIds } }).sort({ updated_at: -1 });
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch groups." });
  }
}

export async function createGroup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, description, avatar_url } = req.body;
    if (!name) {
      res.status(400).json({ error: "Group name is required." });
      return;
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const group = await Group.create({
      name: name.trim(),
      description,
      avatar_url,
      invite_code: inviteCode,
      created_by: req.user?._id,
    });

    await GroupMember.create({
      group_id: group._id,
      user_id: req.user?._id,
      role: "admin",
    });

    res.status(201).json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create group." });
  }
}

export async function getGroupMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const messages = await GroupMessage.find({ group_id: groupId })
      .populate("user_id", "name email avatar_url")
      .sort({ created_at: 1 });

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch group messages." });
  }
}

export async function sendGroupMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: "Content is required." });
      return;
    }

    const message = await GroupMessage.create({
      group_id: groupId,
      user_id: req.user?._id,
      content: content.trim(),
    });

    const populated = await GroupMessage.findById(message._id).populate("user_id", "name email avatar_url");
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to send group message." });
  }
}

// Connections
export async function getConnections(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const connections = await Connection.find({
      $or: [{ requester_id: userId }, { receiver_id: userId }],
    })
      .populate("requester_id", "name email avatar_url branch year")
      .populate("receiver_id", "name email avatar_url branch year")
      .sort({ updated_at: -1 });

    res.json(connections);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch connections." });
  }
}

export async function requestConnection(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { receiver_id } = req.body;
    const requesterId = req.user?._id;

    if (!receiver_id) {
      res.status(400).json({ error: "receiver_id is required." });
      return;
    }

    const existing = await Connection.findOne({
      $or: [
        { requester_id: requesterId, receiver_id },
        { requester_id: receiver_id, receiver_id: requesterId },
      ],
    });

    if (existing) {
      res.status(400).json({ error: "Connection request already exists or connected." });
      return;
    }

    const connection = await Connection.create({
      requester_id: requesterId,
      receiver_id,
      status: "pending",
    });

    res.status(201).json(connection);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to request connection." });
  }
}

export async function updateConnectionStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const connection = await Connection.findByIdAndUpdate(id, { status }, { new: true });
    res.json(connection);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update connection." });
  }
}

// Communities
export async function getCommunities(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const communities = await Community.find().sort({ name: 1 });
    res.json(communities);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch communities." });
  }
}

export async function createCommunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, description, category, avatar_url, is_private } = req.body;
    if (!name) {
      res.status(400).json({ error: "Community name is required." });
      return;
    }

    const community = await Community.create({
      name: name.trim(),
      description,
      category: category || "General",
      avatar_url,
      is_private: !!is_private,
      created_by: req.user?._id,
    });

    await CommunityMember.create({
      community_id: community._id,
      user_id: req.user?._id,
      role: "admin",
    });

    res.status(201).json(community);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create community." });
  }
}

export async function updateCommunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const community = await Community.findByIdAndUpdate(id, req.body, { new: true });
    res.json(community);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update community." });
  }
}

export async function approveCommunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const community = await Community.findByIdAndUpdate(id, { approval_status: "approved" }, { new: true });
    res.json(community);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to approve community." });
  }
}

export async function rejectCommunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Community.findByIdAndDelete(id);
    res.json({ message: "Community rejected." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to reject community." });
  }
}
