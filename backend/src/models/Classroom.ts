import mongoose, { Schema, Document } from "mongoose";

export interface IClassroom extends Document {
  id: string;
  name: string;
  course: string;
  branch: string;
  year: number | string;
  section: string;
  academic_year: string;
  class_code?: string;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const ClassroomSchema = new Schema<IClassroom>(
  {
    name: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    branch: { type: String, required: true, trim: true },
    year: { type: Schema.Types.Mixed, required: true },
    section: { type: String, required: true, trim: true },
    academic_year: { type: String, required: true, trim: true, default: "2026-27" },
    class_code: { type: String, trim: true },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
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

ClassroomSchema.index({ class_code: 1 }, { sparse: true });

export const Classroom = mongoose.model<IClassroom>("Classroom", ClassroomSchema);
