import mongoose, { Schema, Document } from "mongoose";

export interface ILecture extends Document {
  id: string;
  classroom_id: mongoose.Types.ObjectId;
  teaching_assignment_id: mongoose.Types.ObjectId;
  faculty_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  youtube_url: string;
  youtube_video_id: string;
  duration?: string;
  channel_name?: string;
  thumbnail_url?: string;
  topics: string[];
  concepts_taught: string[];
  transcript?: string;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
}

const LectureSchema = new Schema<ILecture>(
  {
    classroom_id: { type: Schema.Types.ObjectId, ref: "Classroom", required: true },
    teaching_assignment_id: { type: Schema.Types.ObjectId, ref: "TeachingAssignment", required: true },
    faculty_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    youtube_url: { type: String, required: true, trim: true },
    youtube_video_id: { type: String, required: true, trim: true },
    duration: { type: String, default: "15:00" },
    channel_name: { type: String },
    thumbnail_url: { type: String },
    topics: { type: [String], default: [] },
    concepts_taught: { type: [String], default: [] },
    transcript: { type: String },
    is_archived: { type: Boolean, default: false },
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

LectureSchema.index({ classroom_id: 1, is_archived: 1 });
LectureSchema.index({ faculty_id: 1 });

export const Lecture = mongoose.model<ILecture>("Lecture", LectureSchema);
