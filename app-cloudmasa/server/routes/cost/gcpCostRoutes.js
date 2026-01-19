// server/routes/cost/gcpCostRoutes.js
import express from 'express';
import authenticate from '../../middleware/auth.js';
import * as ctrl from '../../controllers/cost/gcpCostController.js';

const router = express.Router();

// ✅ GCP cost endpoints (mirroring AWS structure)
router.get('/summary', authenticate, ctrl.getCostData);     // → /api/gcp-costs/summary
router.get('/trend', authenticate, ctrl.getTrend);         // → /api/gcp-costs/trend
router.get('/forecast', authenticate, ctrl.getForecast);   // → /api/gcp-costs/forecast
router.get('/resources', authenticate, ctrl.getResourceCount); // → /api/gcp-costs/resources
router.get('/budgets', authenticate, ctrl.getAccountBudgets); // → /api/gcp-costs/budgets

export default router;
