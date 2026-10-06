import api from './api.js';

export const agentService = {
  listConversations: async () => {
    const res = await api.get('/agent/conversations');
    return res.data;
  },

  createConversation: async (title = 'New Conversation') => {
    const res = await api.post('/agent/conversations', { title });
    return res.data;
  },

  getConversationMessages: async (id) => {
    const res = await api.get(`/agent/conversations/${id}`);
    return res.data;
  },

  deleteConversation: async (id) => {
    const res = await api.delete(`/agent/conversations/${id}`);
    return res.data;
  },

  chat: async ({ conversationId, message }) => {
    const res = await api.post('/agent/chat', { conversationId, message });
    return res.data;
  },
};
