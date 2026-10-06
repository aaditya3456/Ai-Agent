import { AgentConversation } from '../models/AgentConversation.js';
import { AgentMessage } from '../models/AgentMessage.js';
import { runAgentTurn } from '../agents/jobAgent.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { successResponse } from '../utils/apiResponse.js';

export const listConversations = async (req, res, next) => {
  try {
    const conversations = await AgentConversation.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    return successResponse(res, 200, 'Conversations retrieved', { conversations });
  } catch (error) {
    next(error);
  }
};

export const createConversation = async (req, res, next) => {
  try {
    const { title = 'New Conversation' } = req.body;
    const conversation = await AgentConversation.create({
      userId: req.user._id,
      title,
    });
    return successResponse(res, 201, 'Conversation created', { conversation });
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (req, res, next) => {
  try {
    const conversation = await AgentConversation.findOne({ _id: req.params.id, userId: req.user._id });
    if (!conversation) {
      return next(new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND'));
    }

    const messages = await AgentMessage.find({
      conversationId: conversation._id,
      role: { $in: ['user', 'assistant'] }, // Hide raw internal tool protocol messages from simple UI view
    }).sort({ createdAt: 1 });

    return successResponse(res, 200, 'Messages retrieved', { conversation, messages });
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await AgentConversation.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!conversation) {
      return next(new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND'));
    }

    await AgentMessage.deleteMany({ conversationId: req.params.id });
    return successResponse(res, 200, 'Conversation cleared successfully');
  } catch (error) {
    next(error);
  }
};

export const chatWithAgent = async (req, res, next) => {
  try {
    let { conversationId, message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return next(new AppError('Message text is required.', 400, 'INVALID_MESSAGE'));
    }

    let conversation;
    if (conversationId) {
      conversation = await AgentConversation.findOne({ _id: conversationId, userId: req.user._id });
      if (!conversation) {
        return next(new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND'));
      }
    } else {
      // Auto-create new conversation
      const summaryTitle = message.trim().substring(0, 36) + (message.length > 36 ? '...' : '');
      conversation = await AgentConversation.create({
        userId: req.user._id,
        title: summaryTitle,
      });
      conversationId = conversation._id;
    }

    // Run agent turn with real tool execution
    const result = await runAgentTurn({
      conversationId,
      userId: req.user._id,
      userMessageText: message.trim(),
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    return successResponse(res, 200, 'Agent response received', {
      conversationId: conversation._id,
      userMessage: result.userMessage,
      assistantMessage: result.assistantMessage,
      actionSteps: result.actionSteps,
    });
  } catch (error) {
    next(error);
  }
};
