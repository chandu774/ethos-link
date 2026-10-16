import mongoose, { Schema, Document } from "mongoose";

export interface IAIConversation extends Document {
  id: string;
  user_id: mongoose.Types.ObjectId;
  summary?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
  }>;
  created_at: Date;
  updated_at: Date;
}

const AIConversationSchema = new Schema<IAIConversation>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    summary: { type: String },
    messages: {
      type: [
        {
          role: { type: String, enum: ["user", "assistant"], required: true },
          content: { type: String, required: true },
          timestamp: { type: String },
        },
      ],
      default: [],
    },
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

AIConversationSchema.index({ user_id: 1, updated_at: -1 });

export const AIConversation = mongoose.model<IAIConversation>("AIConversation", AIConversationSchema);
