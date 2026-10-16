import mongoose, { Schema, Document } from "mongoose";

// Community
export interface ICommunity extends Document {
  id: string;
  name: string;
  description?: string;
  category: string;
  avatar_url?: string;
  is_private: boolean;
  member_count: number;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
}
const CommunitySchema = new Schema<ICommunity>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    category: { type: String, default: "General" },
    avatar_url: { type: String },
    is_private: { type: Boolean, default: false },
    member_count: { type: Number, default: 1 },
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    toJSON: { virtuals: true, transform: (_, ret) => { ret.id = ret._id.toString(); delete (ret as any).__v; return ret; } }
  }
);
export const Community = mongoose.model<ICommunity>("Community", CommunitySchema);

// Community Member
export interface ICommunityMember extends Document {
  id: string;
  community_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  role: "admin" | "member";
  joined_at: Date;
}
const CommunityMemberSchema = new Schema<ICommunityMember>(
  {
    community_id: { type: Schema.Types.ObjectId, ref: "Community", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    joined_at: { type: Date, default: Date.now },
  },
  { toJSON: { virtuals: true, transform: (_, ret) => { ret.id = ret._id.toString(); delete (ret as any).__v; return ret; } } }
);
CommunityMemberSchema.index({ community_id: 1, user_id: 1 }, { unique: true });
export const CommunityMember = mongoose.model<ICommunityMember>("CommunityMember", CommunityMemberSchema);

// Group
export interface IGroup extends Document {
  id: string;
  name: string;
  description?: string;
  invite_code?: string;
  avatar_url?: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}
const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    invite_code: { type: String, unique: true, sparse: true },
    avatar_url: { type: String },
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { virtuals: true, transform: (_, ret) => { ret.id = ret._id.toString(); delete (ret as any).__v; return ret; } }
  }
);
export const Group = mongoose.model<IGroup>("Group", GroupSchema);

// Group Member
export interface IGroupMember extends Document {
  id: string;
  group_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  role: "admin" | "member";
  joined_at: Date;
}
const GroupMemberSchema = new Schema<IGroupMember>(
  {
    group_id: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    joined_at: { type: Date, default: Date.now },
  },
  { toJSON: { virtuals: true, transform: (_, ret) => { ret.id = ret._id.toString(); delete (ret as any).__v; return ret; } } }
);
GroupMemberSchema.index({ group_id: 1, user_id: 1 }, { unique: true });
export const GroupMember = mongoose.model<IGroupMember>("GroupMember", GroupMemberSchema);

// Direct Message
export interface IMessage extends Document {
  id: string;
  sender_id: mongoose.Types.ObjectId;
  receiver_id: mongoose.Types.ObjectId;
  content: string;
  is_read: boolean;
  created_at: Date;
}
const MessageSchema = new Schema<IMessage>(
  {
    sender_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    is_read: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    toJSON: { virtuals: true, transform: (_, ret) => { ret.id = ret._id.toString(); delete (ret as any).__v; return ret; } }
  }
);
MessageSchema.index({ sender_id: 1, receiver_id: 1 });
MessageSchema.index({ receiver_id: 1, is_read: 1 });
export const Message = mongoose.model<IMessage>("Message", MessageSchema);

// Group Message
export interface IGroupMessage extends Document {
  id: string;
  group_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  content: string;
  created_at: Date;
}
const GroupMessageSchema = new Schema<IGroupMessage>(
  {
    group_id: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    toJSON: { virtuals: true, transform: (_, ret) => { ret.id = ret._id.toString(); delete (ret as any).__v; return ret; } }
  }
);
GroupMessageSchema.index({ group_id: 1, created_at: -1 });
export const GroupMessage = mongoose.model<IGroupMessage>("GroupMessage", GroupMessageSchema);

// Connection
export interface IConnection extends Document {
  id: string;
  requester_id: mongoose.Types.ObjectId;
  receiver_id: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  created_at: Date;
  updated_at: Date;
}
const ConnectionSchema = new Schema<IConnection>(
  {
    requester_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { virtuals: true, transform: (_, ret) => { ret.id = ret._id.toString(); delete (ret as any).__v; return ret; } }
  }
);
ConnectionSchema.index({ requester_id: 1, receiver_id: 1 }, { unique: true });
export const Connection = mongoose.model<IConnection>("Connection", ConnectionSchema);
