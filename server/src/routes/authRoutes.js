import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { validateRegister, validateLogin } from '../validators/authValidator.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, validateBody(validateRegister), register);
router.post('/login', authLimiter, validateBody(validateLogin), login);
router.get('/me', protect, getMe);

export default router;
