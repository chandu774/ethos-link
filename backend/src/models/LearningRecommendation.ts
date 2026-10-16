import mongoose, { Schema, Document } from "mongoose";

export interface ILearningRecommendation extends Document {
  id: string;
  student_id: mongoose.Types.ObjectId;
  subject_name: string;
  topic: string;
  concept?: string;
  recommendation_type: string;
  title: string;
  video_id: string;
  video_url: string;
  thumbnail_url?: string;
  channel_name?: string;
  duration?: string;
  score?: number;
  reason?: string;
  status: "ACTIVE" | "COMPLETED" | "DISMISSED";
  created_at: Date;
}

const LearningRecommendationSchema = new Schema<ILearningRecommendation>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject_name: { type: String, required: true },
    topic: { type: String, required: true },
    concept: { type: String },
    recommendation_type: { type: String, default: "WEAK_CONCEPT" },
    title: { type: String, required: true },
    video_id: { type: String, required: true },
    video_url: { type: String, required: true },
    thumbnail_url: { type: String },
    channel_name: { type: String },
    duration: { type: String },
    score: { type: Number },
    reason: { type: String },
    status: { type: String, enum: ["ACTIVE", "COMPLETED", "DISMISSED"], default: "ACTIVE" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
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

LearningRecommendationSchema.index({ student_id: 1, status: 1 });

export const LearningRecommendation = mongoose.model<ILearningRecommendation>(
  "LearningRecommendation",
  LearningRecommendationSchema
);

export interface IStudentVideoEngagement extends Document {
  id: string;
  student_id: mongoose.Types.ObjectId;
  video_id: string;
  watch_duration_seconds: number;
  completed: boolean;
  notes?: string;
  last_watched_at: Date;
}

const StudentVideoEngagementSchema = new Schema<IStudentVideoEngagement>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    video_id: { type: String, required: true },
    watch_duration_seconds: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    notes: { type: String },
    last_watched_at: { type: Date, default: Date.now },
  },
  {
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

StudentVideoEngagementSchema.index({ student_id: 1, video_id: 1 }, { unique: true });

export const StudentVideoEngagement = mongoose.model<IStudentVideoEngagement>(
  "StudentVideoEngagement",
  StudentVideoEngagementSchema
);
