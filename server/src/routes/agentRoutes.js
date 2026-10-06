import express from 'express';
import {
  listConversations,
  createConversation,
  getConversationMessages,
  deleteConversation,
  chatWithAgent,
} from '../controllers/agentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect);

router.get('/conversations', listConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getConversationMessages);
router.delete('/conversations/:id', deleteConversation);
router.post('/chat', aiLimiter, chatWithAgent);

export default router;
