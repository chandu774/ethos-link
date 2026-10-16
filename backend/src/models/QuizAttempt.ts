import mongoose, { Schema, Document } from "mongoose";

export interface IQuizAttempt extends Document {
  id: string;
  quiz_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  score: number;
  total_questions: number;
  max_score?: number;
  percentage: number;
  answers?: Record<string, any>;
  started_at: Date;
  completed_at: Date;
  submitted_at?: Date;
  created_at?: Date;
}

const QuizAttemptSchema = new Schema<IQuizAttempt>(
  {
    quiz_id: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, required: true },
    total_questions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    answers: { type: Schema.Types.Mixed },
    started_at: { type: Date, default: Date.now },
    completed_at: { type: Date, default: Date.now },
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

QuizAttemptSchema.index({ quiz_id: 1, user_id: 1 });
QuizAttemptSchema.index({ user_id: 1 });

export const QuizAttempt = mongoose.model<IQuizAttempt>("QuizAttempt", QuizAttemptSchema);
