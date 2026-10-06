import express from 'express';
import {
  createApplication,
  getApplications,
  getApplicationStats,
  getApplicationById,
  updateApplication,
  deleteApplication,
} from '../controllers/applicationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { validateCreateApplication, validateUpdateApplication } from '../validators/applicationValidator.js';

const router = express.Router();

router.use(protect);

router.post('/', validateBody(validateCreateApplication), createApplication);
router.get('/', getApplications);
router.get('/stats', getApplicationStats);
router.get('/:id', getApplicationById);
router.patch('/:id', validateBody(validateUpdateApplication), updateApplication);
router.delete('/:id', deleteApplication);

export default router;
