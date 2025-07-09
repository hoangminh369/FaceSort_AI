import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  conversationId: Schema.Types.ObjectId;
  userId: string;
  message: string;
  response?: string;
  platform: 'web' | 'zalo' | 'facebook';
  type: 'text' | 'image' | 'notification';
  createdAt: Date;
}

const ChatMessageSchema: Schema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    message: { type: String, required: true },
    response: { type: String },
    platform: {
      type: String,
      enum: ['web', 'zalo', 'facebook'],
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'notification'],
      default: 'text',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema); 