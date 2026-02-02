// server/routes/gcpterraformRoutes.js
import express from 'express';
import authenticate from '../middleware/auth.js';
import * as gcpTerraformController from '../controllers/gcpterraformController.js';

const router = express.Router();

// ✅ Authenticated routes
router.post('/deploy', authenticate, gcpTerraformController.deploy);
router.get('/logs/:deploymentId', authenticate, gcpTerraformController.getLogs);

// ✅ Resources management
router.get('/resources', authenticate, gcpTerraformController.getResources);
router.post('/destroy-resource', authenticate, gcpTerraformController.destroyResource);
router.post('/destroy-deployment', authenticate, gcpTerraformController.destroyDeployment);

export default router;