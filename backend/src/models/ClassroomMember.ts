import mongoose, { Schema, Document } from "mongoose";

export interface IClassroomMember extends Document {
  id: string;
  classroom_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  enrolled_at: Date;
}

const ClassroomMemberSchema = new Schema<IClassroomMember>(
  {
    classroom_id: { type: Schema.Types.ObjectId, ref: "Classroom", required: true },
    student_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    enrolled_at: { type: Date, default: Date.now },
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

ClassroomMemberSchema.index({ classroom_id: 1, student_id: 1 }, { unique: true });
ClassroomMemberSchema.index({ student_id: 1 });

export const ClassroomMember = mongoose.model<IClassroomMember>("ClassroomMember", ClassroomMemberSchema);
