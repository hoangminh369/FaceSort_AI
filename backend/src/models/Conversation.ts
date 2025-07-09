import { Schema, model, Document } from 'mongoose'

export interface IConversation extends Document {
  userId: Schema.Types.ObjectId
  title: string
  lastMessage?: string
  platform: 'web' | 'zalo' | 'facebook'
  createdAt: Date
  updatedAt: Date
}

const ConversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'New Conversation'
    },
    lastMessage: {
      type: String,
      trim: true,
    },
    platform: {
      type: String,
      enum: ['web', 'zalo', 'facebook'],
      default: 'web',
    },
  },
  {
    timestamps: true,
  }
)

export default model<IConversation>('Conversation', ConversationSchema) 