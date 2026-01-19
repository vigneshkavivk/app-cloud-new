// ✅ server/routes/supportroutes.js
import express from 'express';
import { createTicket } from '../controllers/supportcontroller.js';

const router = express.Router();

router.post('/ticket', createTicket); // ← ONLY this line (no auth for now)

export default router;
