// src/routes/azureTerraformRoutes.js
import express from 'express';
import { 
  deploy, 
  getLogs, 
  destroyResource, 
  destroyDeployment, 
  getResources,
  getDeploymentStatus,
  listDeployments,
} from '../controllers/azureTerraformController.js';

const router = express.Router();

// Deployment lifecycle
router.post('/deploy', deploy);
router.post('/destroy-resource', destroyResource);
router.post('/destroy-deployment', destroyDeployment);

// Status & logs
router.get('/logs/:deploymentId', getLogs);
router.get('/status/:deploymentId', getDeploymentStatus);
router.get('/deployments', listDeployments);

// Resource listing (stub)
router.get('/resources', getResources);

export default router;
