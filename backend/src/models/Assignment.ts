import mongoose, { Schema, Document } from "mongoose";

export interface IAssignment extends Document {
  id: string;
  classroom_id?: mongoose.Types.ObjectId;
  teaching_assignment_id?: mongoose.Types.ObjectId;
  group_id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  max_marks: number;
  deadline: string;
  attachment_url?: string;
  attachment_name?: string;
  topic?: string;
  estimated_effort?: string;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    classroom_id: { type: Schema.Types.ObjectId, ref: "Classroom" },
    teaching_assignment_id: { type: Schema.Types.ObjectId, ref: "TeachingAssignment" },
    group_id: { type: Schema.Types.ObjectId, ref: "Group" },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    max_marks: { type: Number, default: 20 },
    deadline: { type: String, required: true },
    attachment_url: { type: String },
    attachment_name: { type: String },
    topic: { type: String },
    estimated_effort: { type: String, default: "30 min" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

AssignmentSchema.index({ classroom_id: 1, deadline: 1 });
AssignmentSchema.index({ created_by: 1 });

export const Assignment = mongoose.model<IAssignment>("Assignment", AssignmentSchema);
