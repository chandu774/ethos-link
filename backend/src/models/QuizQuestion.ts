import mongoose, { Schema, Document } from "mongoose";

export interface IQuizQuestion extends Document {
  id: string;
  quiz_id: mongoose.Types.ObjectId;
  question_text: string;
  question?: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
  concept: string;
  topic?: string;
  marks?: number;
  difficulty?: string;
  created_at: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    quiz_id: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    question_text: { type: String, required: true },
    options: { type: [String], required: true },
    correct_option_index: { type: Number, required: true },
    explanation: { type: String },
    concept: { type: String, required: true, trim: true },
    topic: { type: String, trim: true },
    marks: { type: Number, default: 1 },
    difficulty: { type: String, default: "Medium" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        ret.question = ret.question_text;
        delete ret.__v;
        return ret;
      },
    },
  }
);

QuizQuestionSchema.index({ quiz_id: 1 });
QuizQuestionSchema.index({ concept: 1 });

export const QuizQuestion = mongoose.model<IQuizQuestion>("QuizQuestion", QuizQuestionSchema);
