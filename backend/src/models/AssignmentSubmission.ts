import mongoose, { Schema, Document } from "mongoose";

export interface IAssignmentSubmission extends Document {
  id: string;
  assignment_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  submission_text?: string;
  attachment_url?: string;
  attachment_name?: string;
  status: "submitted" | "graded" | "late" | "resubmitted";
  marks_obtained?: number;
  feedback?: string;
  submitted_at: Date;
}

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignment_id: { type: Schema.Types.ObjectId, ref: "Assignment", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submission_text: { type: String },
    attachment_url: { type: String },
    attachment_name: { type: String },
    status: {
      type: String,
      enum: ["submitted", "graded", "late", "resubmitted"],
      default: "submitted",
      required: true,
    },
    marks_obtained: { type: Number },
    feedback: { type: String },
    submitted_at: { type: Date, default: Date.now },
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

AssignmentSubmissionSchema.index({ assignment_id: 1, user_id: 1 }, { unique: true });
AssignmentSubmissionSchema.index({ user_id: 1 });

export const AssignmentSubmission = mongoose.model<IAssignmentSubmission>(
  "AssignmentSubmission",
  AssignmentSubmissionSchema
);
