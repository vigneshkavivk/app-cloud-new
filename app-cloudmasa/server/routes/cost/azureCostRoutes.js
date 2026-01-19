// routes/cost/azureCostRoutes.js
import express from 'express';
import authenticate from '../../middleware/auth.js';
import * as ctrl from '../../controllers/cost/azureCostController.js';

const router = express.Router();
router.get('/summary', authenticate, ctrl.getCostData);
router.get('/trend', authenticate, ctrl.getTrend);
router.get('/forecast', authenticate, ctrl.getForecast);
router.get('/resources', authenticate, ctrl.getResourceCount);
router.get('/budgets', authenticate, ctrl.getAccountBudgets);
export default router;
