export const validateJob = (body) => {
  const errors = [];
  const { title, company, description } = body || {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Job title is required' });
  }

  if (!company || typeof company !== 'string' || company.trim().length === 0) {
    errors.push({ field: 'company', message: 'Company name is required' });
  }

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    errors.push({ field: 'description', message: 'Job description must be at least 10 characters' });
  }

  return errors;
};
