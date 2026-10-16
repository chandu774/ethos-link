import mongoose, { Schema, Document } from "mongoose";

export interface IStudentSavedOpportunity extends Document {
  id: string;
  student_id: mongoose.Types.ObjectId;
  opportunity_id: mongoose.Types.ObjectId;
  status: "Interested" | "Planning to Apply" | "Documents Pending" | "Applied" | "Submitted" | "Approved" | "Rejected";
  notes?: string;
  applied_date?: Date;
  created_at: Date;
  updated_at: Date;
}

const StudentSavedOpportunitySchema = new Schema<IStudentSavedOpportunity>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    opportunity_id: { type: Schema.Types.ObjectId, ref: "Opportunity", required: true },
    status: {
      type: String,
      enum: ["Interested", "Planning to Apply", "Documents Pending", "Applied", "Submitted", "Approved", "Rejected"],
      default: "Interested",
    },
    notes: { type: String },
    applied_date: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
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

StudentSavedOpportunitySchema.index({ student_id: 1, opportunity_id: 1 }, { unique: true });

export const StudentSavedOpportunity = mongoose.model<IStudentSavedOpportunity>(
  "StudentSavedOpportunity",
  StudentSavedOpportunitySchema
);
