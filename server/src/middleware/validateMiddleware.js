import { AppError } from './errorMiddleware.js';

export const validateBody = (validatorFn) => {
  return (req, res, next) => {
    const errors = validatorFn(req.body);
    if (errors && errors.length > 0) {
      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors));
    }
    next();
  };
};
