import mongoose, { Schema, Document } from 'mongoose';

export interface IDriveConfig extends Document {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  folderId: string;
  scanInterval: number;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DriveConfigSchema: Schema = new Schema(
  {
    clientId: {
      type: String,
      required: true,
    },
    clientSecret: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
    folderId: {
      type: String,
      required: true,
    },
    scanInterval: {
      type: Number,
      default: 60, // minutes
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IDriveConfig>('DriveConfig', DriveConfigSchema); 