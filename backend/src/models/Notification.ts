import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  id: string;
  user_id: mongoose.Types.ObjectId;
  actor_id?: mongoose.Types.ObjectId;
  title?: string;
  message: string;
  type: string;
  entity_id?: string;
  read: boolean;
  is_read: boolean;
  created_at: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actor_id: { type: Schema.Types.ObjectId, ref: "User" },
    title: { type: String },
    message: { type: String, required: true },
    type: { type: String, default: "system" },
    entity_id: { type: String },
    read: { type: Boolean, default: false },
    is_read: { type: Boolean, default: false },
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

NotificationSchema.index({ user_id: 1, created_at: -1 });

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
