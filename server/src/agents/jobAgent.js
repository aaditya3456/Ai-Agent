import { toolDefinitions, executeAgentTool, toolActionLabels } from '../tools/agentTools.js';
import { callLLMWithTools } from '../services/aiService.js';
import { AgentMessage } from '../models/AgentMessage.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const SYSTEM_PROMPT = `You are the AI Job Application Agent, an intelligent career copilot.
Your mission is to help the candidate manage job applications, assess job requirements against their resume, identify skill gaps, and craft tailored application messages.

OPERATING GUIDELINES:
1. Always use the provided tools to inspect data, retrieve resumes, search jobs, analyze postings, evaluate compatibility, and update application statuses.
2. Ground all answers strictly on factual data returned by tools. Never invent or hallucinate candidate experience, skills, degrees, or companies.
3. Be transparent: compatibility percentages are internal heuristics, not hiring promises.
4. When tool actions occur, be concise, professional, and actionable.
5. If the user asks about an action that failed, inform them honestly.
`;

const MAX_TOOL_ITERATIONS = 5;

/**
 * Executes a full multi-turn or tool-assisted agent turn.
 * Emits real-time action steps so the frontend can display user-friendly activity indicators.
 */
export const runAgentTurn = async ({ conversationId, userId, userMessageText, onActionStep = () => {} }) => {
  // 1. Fetch previous conversation history (last 10 messages for context)
  const previousMessages = await AgentMessage.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(10);

  // 2. Persist user message
  const userMsgDoc = await AgentMessage.create({
    conversationId,
    userId,
    role: 'user',
    content: userMessageText,
  });

  // Prepare LLM message history
  const llmMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...previousMessages.map((m) => {
      const msg = { role: m.role, content: m.content || '' };
      if (m.toolCalls && m.toolCalls.length > 0) msg.tool_calls = m.toolCalls;
      if (m.toolCallId) msg.tool_call_id = m.toolCallId;
      if (m.toolName) msg.name = m.toolName;
      return msg;
    }),
    { role: 'user', content: userMessageText },
  ];

  const recordedActionSteps = [];
  let iterations = 0;
  let finalAssistantMessage = null;

  // Controlled tool calling loop
  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations += 1;
    logger.info(`Agent loop iteration ${iterations} for user ${userId}`);

    const response = await callLLMWithTools({
      messages: llmMessages,
      tools: toolDefinitions,
      toolChoice: 'auto',
    });

    const assistantMsg = response.message;

    // Check if the LLM decided to invoke tool calls
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      // Append assistant's intent message to conversation history
      llmMessages.push({
        role: 'assistant',
        content: assistantMsg.content || '',
        tool_calls: assistantMsg.tool_calls,
      });

      // Save intermediate tool-call message in database
      await AgentMessage.create({
        conversationId,
        userId,
        role: 'assistant',
        content: assistantMsg.content || '',
        toolCalls: assistantMsg.tool_calls,
      });

      // Execute each requested tool
      for (const call of assistantMsg.tool_calls) {
        const functionName = call.function?.name;
        const callId = call.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        let functionArgs = {};
        try {
          if (typeof call.function?.arguments === 'object' && call.function.arguments !== null) {
            functionArgs = call.function.arguments;
          } else if (typeof call.function?.arguments === 'string') {
            functionArgs = JSON.parse(call.function.arguments || '{}');
          }
        } catch (e) {
          logger.warn(`Failed to parse arguments for tool ${functionName}`, e);
          functionArgs = {};
        }

        const actionLabel = toolActionLabels[functionName] || `Executing ${functionName}`;
        onActionStep({ step: actionLabel, status: 'pending' });
        recordedActionSteps.push({ step: actionLabel, status: 'completed' });

        let toolResult;
        try {
          toolResult = await executeAgentTool(functionName, functionArgs, userId);
        } catch (err) {
          logger.error(`Tool execution error for ${functionName}`, err);
          toolResult = { success: false, error: err.message };
        }

        onActionStep({ step: actionLabel, status: 'completed' });

        const serializedResult = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);

        // Add tool response to LLM context
        llmMessages.push({
          role: 'tool',
          tool_call_id: callId,
          name: functionName,
          content: serializedResult,
        });

        // Save tool response message in database
        await AgentMessage.create({
          conversationId,
          userId,
          role: 'tool',
          toolCallId: callId,
          toolName: functionName,
          content: serializedResult,
        });
      }
    } else {
      // No tool calls needed, or final response reached
      finalAssistantMessage = assistantMsg.content || 'I have completed your request.';
      break;
    }
  }

  // If loop exited due to max iterations limit
  if (!finalAssistantMessage) {
    finalAssistantMessage = 'I have analyzed the available information and finished the current task.';
  }

  // Save the final assistant message
  const assistantDoc = await AgentMessage.create({
    conversationId,
    userId,
    role: 'assistant',
    content: finalAssistantMessage,
    actionSteps: recordedActionSteps,
  });

  return {
    userMessage: userMsgDoc,
    assistantMessage: assistantDoc,
    actionSteps: recordedActionSteps,
  };
};
