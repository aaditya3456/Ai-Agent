import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { AppError } from '../middleware/errorMiddleware.js';
import { logger } from './logger.js';

/**
 * Extracts plain text from an uploaded file buffer based on MIME type or extension.
 * Supports PDF, DOCX, and TXT files.
 */
export const extractTextFromFile = async (fileBuffer, originalName, mimeType) => {
  const extension = originalName.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'pdf' || mimeType === 'application/pdf') {
      const data = await pdf(fileBuffer);
      const text = data.text?.trim();
      if (!text || text.length < 20) {
        throw new AppError('The PDF appears to be empty or contains scanned images without selectable text.', 400, 'EMPTY_RESUME_TEXT');
      }
      return { text, fileType: 'pdf' };
    }

    if (
      extension === 'docx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const text = result.value?.trim();
      if (!text || text.length < 20) {
        throw new AppError('The DOCX file appears to be empty.', 400, 'EMPTY_RESUME_TEXT');
      }
      return { text, fileType: 'docx' };
    }

    if (extension === 'txt' || mimeType === 'text/plain') {
      const text = fileBuffer.toString('utf-8').trim();
      if (!text || text.length < 20) {
        throw new AppError('The text file appears to be empty.', 400, 'EMPTY_RESUME_TEXT');
      }
      return { text, fileType: 'txt' };
    }

    throw new AppError('Unsupported file format. Please upload a PDF, DOCX, or TXT file.', 400, 'UNSUPPORTED_FILE_FORMAT');
  } catch (error) {
    logger.error(`Error parsing file ${originalName}: ${error.message}`, error);
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to read file content: ${error.message}`, 400, 'FILE_PARSING_FAILED');
  }
};
