import mongoose, { Schema, Document } from "mongoose";

export interface IOpportunity extends Document {
  id: string;
  title: string;
  company: string;
  provider: string;
  stipend?: string;
  award_amount?: string;
  type: string;
  category: string;
  location?: string;
  link?: string;
  application_url?: string;
  official_source_name?: string;
  official_source_url?: string;
  eligibility_text?: string;
  course_level?: string;
  eligible_courses?: string[];
  eligible_branches?: string[];
  eligible_years?: string[];
  minimum_percentage?: number;
  income_limit?: number;
  gender_criteria?: string;
  category_criteria?: string;
  disability_criteria?: string;
  state_criteria?: string;
  age_criteria?: string;
  opening_date?: string;
  deadline?: string;
  required_documents?: string[];
  status: string;
  verified: boolean;
  verification_status: "VERIFIED" | "PENDING_REVIEW" | "EXPIRED" | "REJECTED";
  last_verified_at?: string;
  verification_notes?: string;
  description?: string;
  source?: string;
  skills: string[];
  created_at: Date;
  updated_at: Date;
}

const OpportunitySchema = new Schema<IOpportunity>(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    provider: { type: String, trim: true },
    stipend: { type: String },
    award_amount: { type: String },
    type: { type: String, default: "Scholarships" },
    category: { type: String, default: "Scholarships" },
    location: { type: String, default: "Remote" },
    link: { type: String },
    application_url: { type: String },
    official_source_name: { type: String },
    official_source_url: { type: String },
    eligibility_text: { type: String },
    course_level: { type: String },
    eligible_courses: { type: [String], default: [] },
    eligible_branches: { type: [String], default: [] },
    eligible_years: { type: [String], default: [] },
    minimum_percentage: { type: Number },
    income_limit: { type: Number },
    gender_criteria: { type: String, default: "ALL" },
    category_criteria: { type: String, default: "ALL" },
    disability_criteria: { type: String, default: "NONE" },
    state_criteria: { type: String, default: "ALL_INDIA" },
    age_criteria: { type: String },
    opening_date: { type: String },
    deadline: { type: String },
    required_documents: { type: [String], default: [] },
    status: { type: String, default: "OPEN" },
    verified: { type: Boolean, default: true },
    verification_status: {
      type: String,
      enum: ["VERIFIED", "PENDING_REVIEW", "EXPIRED", "REJECTED"],
      default: "VERIFIED",
    },
    last_verified_at: { type: String },
    verification_notes: { type: String },
    description: { type: String },
    source: { type: String },
    skills: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        ret.company = ret.company || ret.provider || "";
        ret.provider = ret.provider || ret.company || "";
        ret.type = ret.type || ret.category || "Scholarships";
        ret.category = ret.category || ret.type || "Scholarships";
        ret.link = ret.link || ret.application_url || "";
        ret.application_url = ret.application_url || ret.link || "";
        ret.stipend = ret.stipend || ret.award_amount || "";
        ret.award_amount = ret.award_amount || ret.stipend || "";
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

OpportunitySchema.index({ verified: 1 });
OpportunitySchema.index({ verification_status: 1 });

export const Opportunity = mongoose.model<IOpportunity>("Opportunity", OpportunitySchema);
