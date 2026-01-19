//routes/cost/costRoutes.js

import express from 'express';
import {
  getCostData,
  getTrend,
  getForecast,
  getResourceCount,
  getAccountBudgets,  
  getDeploymentCost,
} from '../../controllers/cost/costController.js';
import authenticate from '../../middleware/auth.js';

const router = express.Router();

// ✅ Existing (backward-compatible)
router.get('/', authenticate, getCostData); // → /api/costs
router.get('/summary', authenticate, getCostData);     // alias for /
router.get('/trend', authenticate, getTrend);
router.get('/forecast', authenticate, getForecast);
router.get('/resources', authenticate, getResourceCount);
router.get('/budgets', authenticate, getAccountBudgets);
router.get('/deployment-cost', authenticate, getDeploymentCost);
export default router;
