import mongoose, { Schema, Document } from "mongoose";

export interface INote extends Document {
  id: string;
  user_id: mongoose.Types.ObjectId;
  classroom_id?: mongoose.Types.ObjectId;
  group_id?: mongoose.Types.ObjectId;
  subject_name?: string;
  title: string;
  content: string;
  tags: string[];
  attachment_url?: string;
  attachment_name?: string;
  file_type?: string;
  file_size?: number;
  is_public: boolean;
  likes_count: number;
  created_at: Date;
  updated_at: Date;
}

const NoteSchema = new Schema<INote>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    classroom_id: { type: Schema.Types.ObjectId, ref: "Classroom" },
    group_id: { type: Schema.Types.ObjectId, ref: "Group" },
    subject_name: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    tags: { type: [String], default: [] },
    attachment_url: { type: String },
    attachment_name: { type: String },
    file_type: { type: String },
    file_size: { type: Number },
    is_public: { type: Boolean, default: true },
    likes_count: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

NoteSchema.index({ classroom_id: 1 });
NoteSchema.index({ user_id: 1 });
NoteSchema.index({ is_public: 1 });

export const Note = mongoose.model<INote>("Note", NoteSchema);
