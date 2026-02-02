// server/routes/logRoutes.js
import express from 'express';
import { createLog, getLogs } from '../controllers/logController.js';

const router = express.Router();

router.post('/', createLog);
router.get('/', getLogs);

export default router;
