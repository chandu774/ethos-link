import mongoose, { Schema, Document } from "mongoose";

export interface IStorageFile extends Document {
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  data: Buffer;
  bucket?: string;
  uploaded_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const StorageFileSchema = new Schema<IStorageFile>(
  {
    filename: { type: String, required: true, unique: true, index: true },
    original_name: { type: String, required: true },
    mime_type: { type: String, required: true, default: "application/octet-stream" },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    bucket: { type: String, default: "general", index: true },
    uploaded_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete (ret as any).data;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

export const StorageFile = mongoose.model<IStorageFile>("StorageFile", StorageFileSchema);
