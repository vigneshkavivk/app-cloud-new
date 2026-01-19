// server/routes/azureRoutes.js
import express from 'express';

// ✅ Import ALL needed functions — INCLUDING getAksClusterByName
import {
  connectAzure,
  getAzureAccounts,
  deleteAzureAccount,
  validateAzureCredentials,
  validateExistingAccount,
  getAksClusters,
  getAksClusterByName, // 👈 ADD THIS IMPORT
  listVnets,      // ✅ Add this
  listSubnets     // ✅ Add this
} from '../controllers/azureController.js';

import authenticate from '../middleware/auth.js';

const router = express.Router();

router.post('/connect', authenticate, connectAzure);
router.post('/validate-credentials', authenticate, validateAzureCredentials);
router.get('/accounts', authenticate, getAzureAccounts);
router.delete('/account/:id', authenticate, deleteAzureAccount);
router.post('/validate-account', authenticate, validateExistingAccount);

// List all AKS clusters (for dashboard)
router.get('/aks-clusters', authenticate, getAksClusters);
router.post('/aks-clusters', authenticate, getAksClusters);
router.get('/vnets', listVnets);
router.get('/subnets', listSubnets);
// 👉 NEW: Get SINGLE cluster details by name (for popup)
router.get('/aks-cluster/:name',getAksClusterByName); // ✅ CORRECT

export default router;
