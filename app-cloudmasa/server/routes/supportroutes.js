import express from 'express';
import { 
  createTicket, 
  getUserTickets, 
  getAllTickets, 
  getTicketById, 
  updateTicket 
} from '../controllers/supportcontroller.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// 🔐 User routes
router.post('/tickets', authenticate, createTicket);
router.get('/tickets', authenticate, getUserTickets);

// 🛡️ Admin routes — MUST come BEFORE :id
router.get('/tickets/all', authenticate, getAllTickets);

// 🔧 Dynamic routes (MUST come LAST)
router.get('/tickets/:id', authenticate, getTicketById);
router.put('/tickets/:id', authenticate, updateTicket);
router.put('/tickets/:id/assign', authenticate, updateTicket);

export default router;
