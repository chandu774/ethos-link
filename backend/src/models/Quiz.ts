import mongoose, { Schema, Document } from "mongoose";

export interface IQuiz extends Document {
  id: string;
  classroom_id?: mongoose.Types.ObjectId;
  teaching_assignment_id?: mongoose.Types.ObjectId;
  faculty_id?: mongoose.Types.ObjectId;
  title: string;
  topic: string;
  subject: string;
  difficulty: string;
  duration_minutes: number;
  max_attempts: number;
  status: "draft" | "published" | "archived" | "PUBLISHED";
  created_at: Date;
  updated_at: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    classroom_id: { type: Schema.Types.ObjectId, ref: "Classroom" },
    teaching_assignment_id: { type: Schema.Types.ObjectId, ref: "TeachingAssignment" },
    faculty_id: { type: Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    difficulty: { type: String, default: "Medium" },
    duration_minutes: { type: Number, default: 15 },
    max_attempts: { type: Number, default: 3 },
    status: { type: String, default: "PUBLISHED" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

QuizSchema.index({ classroom_id: 1, status: 1 });
QuizSchema.index({ faculty_id: 1 });

export const Quiz = mongoose.model<IQuiz>("Quiz", QuizSchema);
