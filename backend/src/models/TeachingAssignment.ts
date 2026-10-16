import mongoose, { Schema, Document } from "mongoose";

export interface ITeachingAssignment extends Document {
  id: string;
  classroom_id: mongoose.Types.ObjectId;
  faculty_id: mongoose.Types.ObjectId;
  subject_name: string;
  subject_code?: string;
  created_at: Date;
  updated_at: Date;
}

const TeachingAssignmentSchema = new Schema<ITeachingAssignment>(
  {
    classroom_id: { type: Schema.Types.ObjectId, ref: "Classroom", required: true },
    faculty_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject_name: { type: String, required: true, trim: true },
    subject_code: { type: String, trim: true },
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

TeachingAssignmentSchema.index({ classroom_id: 1, faculty_id: 1, subject_name: 1 });
TeachingAssignmentSchema.index({ faculty_id: 1 });

export const TeachingAssignment = mongoose.model<ITeachingAssignment>("TeachingAssignment", TeachingAssignmentSchema);
