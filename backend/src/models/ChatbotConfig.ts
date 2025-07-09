import mongoose, { Schema, Document } from 'mongoose';

export interface IChatbotConfig extends Document {
  zalo: {
    enabled: boolean;
    accessToken?: string;
    webhookUrl?: string;
  };
  facebook: {
    enabled: boolean;
    pageAccessToken?: string;
    verifyToken?: string;
    webhookUrl?: string;
  };
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChatbotConfigSchema: Schema = new Schema(
  {
    zalo: {
      enabled: {
        type: Boolean,
        default: false,
      },
      accessToken: {
        type: String,
      },
      webhookUrl: {
        type: String,
      },
    },
    facebook: {
      enabled: {
        type: Boolean,
        default: false,
      },
      pageAccessToken: {
        type: String,
      },
      verifyToken: {
        type: String,
      },
      webhookUrl: {
        type: String,
      },
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

export default mongoose.model<IChatbotConfig>('ChatbotConfig', ChatbotConfigSchema); 