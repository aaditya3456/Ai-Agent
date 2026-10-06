import api from './api.js';

export const jobService = {
  createJob: async (jobData) => {
    const res = await api.post('/jobs', jobData);
    return res.data;
  },

  getJobs: async (params = {}) => {
    const res = await api.get('/jobs', { params });
    return res.data;
  },

  getJobById: async (id) => {
    const res = await api.get(`/jobs/${id}`);
    return res.data;
  },

  updateJob: async (id, updateData) => {
    const res = await api.patch(`/jobs/${id}`, updateData);
    return res.data;
  },

  deleteJob: async (id) => {
    const res = await api.delete(`/jobs/${id}`);
    return res.data;
  },

  analyzeJob: async (id) => {
    const res = await api.post(`/jobs/${id}/analyze`);
    return res.data;
  },

  matchJob: async (id) => {
    const res = await api.post(`/jobs/${id}/match`);
    return res.data;
  },

  generateMessage: async (id, tone = 'Professional') => {
    const res = await api.post(`/jobs/${id}/generate-message`, { tone });
    return res.data;
  },
};
