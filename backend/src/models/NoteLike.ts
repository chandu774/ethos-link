import mongoose, { Schema, Document } from "mongoose";

export interface INoteLike extends Document {
  id: string;
  note_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  created_at: Date;
}

const NoteLikeSchema = new Schema<INoteLike>(
  {
    note_id: { type: Schema.Types.ObjectId, ref: "Note", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    created_at: { type: Date, default: Date.now },
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

NoteLikeSchema.index({ note_id: 1, user_id: 1 }, { unique: true });

export const NoteLike = mongoose.model<INoteLike>("NoteLike", NoteLikeSchema);
