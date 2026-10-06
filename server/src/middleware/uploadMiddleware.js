import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from './errorMiddleware.js';

// Use memory storage for clean stateless processing without orphaned temporary disk files
const storage = multer.memoryStorage();

const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
];

const allowedExtensions = ['.pdf', '.docx', '.txt'];

const fileFilter = (req, file, cb) => {
  const extension = '.' + file.originalname.split('.').pop()?.toLowerCase();

  const isAllowedExt = allowedExtensions.includes(extension);
  const isAllowedMime = allowedMimeTypes.includes(file.mimetype) || file.mimetype === 'application/octet-stream';

  if (isAllowedExt && isAllowedMime) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid file type. Only PDF (.pdf), Word (.docx), and plain text (.txt) files are accepted.',
        400,
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }
};

export const uploadResume = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, // in bytes
    files: 1,
  },
  fileFilter,
});
