// Clean structured logger for backend events without leaking sensitive data
export const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, Object.keys(meta).length ? meta : '');
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, Object.keys(meta).length ? meta : '');
  },
  error: (message, error = {}) => {
    const errorDetails = error?.message ? { message: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined } : error;
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, errorDetails);
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, Object.keys(meta).length ? meta : '');
    }
  }
};
