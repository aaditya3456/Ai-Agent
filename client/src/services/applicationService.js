import api from './api.js';

export const applicationService = {
  createApplication: async (appData) => {
    const res = await api.post('/applications', appData);
    return res.data;
  },

  getApplications: async (params = {}) => {
    const res = await api.get('/applications', { params });
    return res.data;
  },

  getApplicationStats: async () => {
    const res = await api.get('/applications/stats');
    return res.data;
  },

  getApplicationById: async (id) => {
    const res = await api.get(`/applications/${id}`);
    return res.data;
  },

  updateApplication: async (id, updateData) => {
    const res = await api.patch(`/applications/${id}`, updateData);
    return res.data;
  },

  deleteApplication: async (id) => {
    const res = await api.delete(`/applications/${id}`);
    return res.data;
  },
};
