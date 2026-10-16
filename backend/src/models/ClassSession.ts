import mongoose, { Schema, Document } from "mongoose";

export interface IClassSession extends Document {
  id: string;
  teaching_assignment_id: mongoose.Types.ObjectId;
  classroom_id: mongoose.Types.ObjectId;
  faculty_id: mongoose.Types.ObjectId;
  session_date: string;
  topic_covered: string;
  concepts_taught: string[];
  notes?: string;
  created_at: Date;
}

const ClassSessionSchema = new Schema<IClassSession>(
  {
    teaching_assignment_id: { type: Schema.Types.ObjectId, ref: "TeachingAssignment", required: true },
    classroom_id: { type: Schema.Types.ObjectId, ref: "Classroom", required: true },
    faculty_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    session_date: { type: String, required: true },
    topic_covered: { type: String, required: true, trim: true },
    concepts_taught: { type: [String], default: [] },
    notes: { type: String },
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

ClassSessionSchema.index({ classroom_id: 1, session_date: -1 });
ClassSessionSchema.index({ teaching_assignment_id: 1 });
ClassSessionSchema.index({ faculty_id: 1 });

export const ClassSession = mongoose.model<IClassSession>("ClassSession", ClassSessionSchema);
