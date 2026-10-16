import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "administrator" | "faculty" | "student";

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  roll_number?: string;
  faculty_id?: string;
  department?: string;
  designation?: string;
  course?: string;
  branch?: string;
  year?: string;
  section?: string;
  must_change_password: boolean;
  avatar_url?: string;
  bio?: string;
  mindset_traits?: Record<string, number>;
  is_admin?: boolean;
  created_by_admin?: mongoose.Types.ObjectId;
  created_by_faculty?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["administrator", "faculty", "student"],
      default: "student",
      required: true,
    },
    roll_number: { type: String, sparse: true, trim: true },
    faculty_id: { type: String, sparse: true, trim: true },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    course: { type: String, trim: true },
    branch: { type: String, trim: true },
    year: { type: String, trim: true },
    section: { type: String, trim: true },
    must_change_password: { type: Boolean, default: false },
    avatar_url: { type: String },
    bio: { type: String },
    mindset_traits: { type: Schema.Types.Mixed, default: {} },
    is_admin: { type: Boolean, default: false },
    created_by_admin: { type: Schema.Types.ObjectId, ref: "User" },
    created_by_faculty: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.password;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

UserSchema.index({ role: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);
