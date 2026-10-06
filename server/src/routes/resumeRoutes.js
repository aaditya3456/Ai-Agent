import express from 'express';
import {
  uploadResume as uploadResumeController,
  getResumes,
  getResumeById,
  analyzeResumeById,
  deleteResumeById,
} from '../controllers/resumeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadResume } from '../middleware/uploadMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect); // All resume routes are protected

router.post('/', uploadResume.single('file'), uploadResumeController);
router.get('/', getResumes);
router.get('/:id', getResumeById);
router.post('/:id/analyze', aiLimiter, analyzeResumeById);
router.delete('/:id', deleteResumeById);

export default router;
