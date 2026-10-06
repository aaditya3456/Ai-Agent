import mongoose from 'mongoose';

const agentMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentConversation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system', 'tool'],
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    toolCalls: [
      {
        id: { type: String },
        type: { type: String, default: 'function' },
        function: {
          name: { type: String },
          arguments: { type: String },
        },
        thoughtSignature: { type: String },
      },
    ],
    toolCallId: {
      type: String,
    },
    toolName: {
      type: String,
    },
    actionSteps: [
      {
        step: { type: String },
        status: { type: String, enum: ['pending', 'completed', 'failed'] },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

agentMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const AgentMessage = mongoose.model('AgentMessage', agentMessageSchema);
