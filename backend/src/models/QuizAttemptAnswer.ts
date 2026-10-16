import mongoose, { Schema, Document } from "mongoose";

export interface IQuizAttemptAnswer extends Document {
  id: string;
  attempt_id: mongoose.Types.ObjectId;
  question_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  selected_option_index: number;
  is_correct: boolean;
  concept?: string;
  topic?: string;
  marks_awarded?: number;
}

const QuizAttemptAnswerSchema = new Schema<IQuizAttemptAnswer>(
  {
    attempt_id: { type: Schema.Types.ObjectId, ref: "QuizAttempt", required: true },
    question_id: { type: Schema.Types.ObjectId, ref: "QuizQuestion", required: true },
    student_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    selected_option_index: { type: Number, required: true },
    is_correct: { type: Boolean, required: true },
    concept: { type: String },
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

QuizAttemptAnswerSchema.index({ attempt_id: 1 });
QuizAttemptAnswerSchema.index({ student_id: 1, concept: 1 });

export const QuizAttemptAnswer = mongoose.model<IQuizAttemptAnswer>("QuizAttemptAnswer", QuizAttemptAnswerSchema);
