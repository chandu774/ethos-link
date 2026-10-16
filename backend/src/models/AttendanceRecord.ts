import mongoose, { Schema, Document } from "mongoose";

export interface IAttendanceRecord extends Document {
  id: string;
  session_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  status: "present" | "absent" | "late";
  remarks?: string;
  created_at: Date;
}

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    session_id: { type: Schema.Types.ObjectId, ref: "ClassSession", required: true },
    student_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["present", "absent", "late"], required: true, default: "present" },
    remarks: { type: String },
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

AttendanceRecordSchema.index({ session_id: 1, student_id: 1 }, { unique: true });
AttendanceRecordSchema.index({ student_id: 1, status: 1 });

export const AttendanceRecord = mongoose.model<IAttendanceRecord>("AttendanceRecord", AttendanceRecordSchema);
