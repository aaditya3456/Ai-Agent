import express from 'express';
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  analyzeJob,
  matchJob,
  generateJobMessage,
} from '../controllers/jobController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { validateJob } from '../validators/jobValidator.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect);

router.post('/', validateBody(validateJob), createJob);
router.get('/', getJobs);
router.get('/:id', getJobById);
router.patch('/:id', updateJob);
router.delete('/:id', deleteJob);
router.post('/:id/analyze', aiLimiter, analyzeJob);
router.post('/:id/match', aiLimiter, matchJob);
router.post('/:id/generate-message', aiLimiter, generateJobMessage);

export default router;
