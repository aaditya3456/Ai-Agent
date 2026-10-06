import mongoose from 'mongoose';

const agentConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

agentConversationSchema.index({ userId: 1, updatedAt: -1 });

export const AgentConversation = mongoose.model('AgentConversation', agentConversationSchema);
