import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
  id: string;
  user_id?: mongoose.Types.ObjectId;
  created_by?: mongoose.Types.ObjectId;
  assigned_to?: mongoose.Types.ObjectId;
  assignment_id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  subject?: string;
  deadline?: string;
  due_date?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "pending" | "in_progress" | "completed";
  estimated_minutes?: number;
  is_official: boolean;
  created_at: Date;
  updated_at: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
    assigned_to: { type: Schema.Types.ObjectId, ref: "User" },
    assignment_id: { type: Schema.Types.ObjectId, ref: "Assignment" },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    subject: { type: String },
    deadline: { type: String },
    due_date: { type: String },
    priority: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], default: "MEDIUM" },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
      required: true,
    },
    estimated_minutes: { type: Number, default: 30 },
    is_official: { type: Boolean, default: false },
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

TaskSchema.index({ created_by: 1 });
TaskSchema.index({ assigned_to: 1 });
TaskSchema.index({ user_id: 1 });

export const Task = mongoose.model<ITask>("Task", TaskSchema);
