import mongoose, { Schema, Document } from "mongoose";

export interface IStudentConceptHistory extends Document {
  id: string;
  student_id: mongoose.Types.ObjectId;
  concept_name: string;
  subject: string;
  topic?: string;
  attempts: number;
  correct_answers: number;
  total_answers: number;
  mastery_percentage: number;
  status: "Mastered" | "Developing" | "Needs Review" | "Not Assessed";
  trend: "improving" | "declining" | "stable";
  last_assessed_at?: Date;
}

const StudentConceptHistorySchema = new Schema<IStudentConceptHistory>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    concept_name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    topic: { type: String, trim: true },
    attempts: { type: Number, default: 0 },
    correct_answers: { type: Number, default: 0 },
    total_answers: { type: Number, default: 0 },
    mastery_percentage: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Mastered", "Developing", "Needs Review", "Not Assessed"],
      default: "Not Assessed",
    },
    trend: { type: String, enum: ["improving", "declining", "stable"], default: "stable" },
    last_assessed_at: { type: Date },
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

StudentConceptHistorySchema.index({ student_id: 1, concept_name: 1, subject: 1 });
StudentConceptHistorySchema.index({ student_id: 1, mastery_percentage: 1 });

export const StudentConceptHistory = mongoose.model<IStudentConceptHistory>(
  "StudentConceptHistory",
  StudentConceptHistorySchema
);
