import api from './api.js';

export const resumeService = {
  uploadResume: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/resumes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getResumes: async () => {
    const res = await api.get('/resumes');
    return res.data;
  },

  getResumeById: async (id) => {
    const res = await api.get(`/resumes/${id}`);
    return res.data;
  },

  analyzeResume: async (id) => {
    const res = await api.post(`/resumes/${id}/analyze`);
    return res.data;
  },

  deleteResume: async (id) => {
    const res = await api.delete(`/resumes/${id}`);
    return res.data;
  },
};
