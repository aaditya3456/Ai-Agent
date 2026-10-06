import { APPLICATION_STATUSES } from '../models/Application.js';

export const validateCreateApplication = (body) => {
  const errors = [];
  const { jobId, status } = body || {};

  if (!jobId || typeof jobId !== 'string') {
    errors.push({ field: 'jobId', message: 'Valid Job ID is required' });
  }

  if (status && !APPLICATION_STATUSES.includes(status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${APPLICATION_STATUSES.join(', ')}` });
  }

  return errors;
};

export const validateUpdateApplication = (body) => {
  const errors = [];
  const { status } = body || {};

  if (status && !APPLICATION_STATUSES.includes(status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${APPLICATION_STATUSES.join(', ')}` });
  }

  return errors;
};
