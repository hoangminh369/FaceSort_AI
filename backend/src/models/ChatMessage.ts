import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  conversationId: Schema.Types.ObjectId;
  userId: string;
  message: string;
  response?: string;
  platform: 'web' | 'zalo' | 'facebook';
  type: 'text' | 'image' | 'notification';
  imageUrl?: string;
  attachments?: Array<{
    id: string;
    url: string;
    type: 'image' | 'file';
    name?: string;
  }>;
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
    message: { 
      type: String, 
      required: function(this: IChatMessage) {
        return this.type !== 'image';
      }
    },
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
    imageUrl: {
      type: String,
    },
    attachments: [{
      id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ['image', 'file'],
        required: true,
      },
      name: {
        type: String,
      },
    }],
  },
  { timestamps: true }
);

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema); 