import mongoose, { Schema, Document } from 'mongoose';

export interface IImage extends Document {
  filename: string;
  originalName: string;
  path: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  faceDetected: boolean;
  faceCount: number;
  qualityScore?: number;
  userId: mongoose.Types.ObjectId;
  status: 'uploaded' | 'processing' | 'processed' | 'selected' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema: Schema = new Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    faceDetected: {
      type: Boolean,
      default: false,
    },
    faceCount: {
      type: Number,
      default: 0,
    },
    qualityScore: {
      type: Number,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'processed', 'selected', 'error'],
      default: 'uploaded',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IImage>('Image', ImageSchema); 