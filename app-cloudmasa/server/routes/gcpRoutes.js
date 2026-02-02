// server/routes/gcpRoutes.js
import express from 'express';

// ✅ CORRECT: import named exports
import { 
  connectToGCP, 
  getGCPAccounts, 
  deleteGCPAccount,
  getGkeClusters,
  toggleGcpFavorite,
} from '../controllers/gcpController.js';

import authenticate from '../middleware/auth.js';

const router = express.Router();

router.post('/connect', authenticate, connectToGCP);
router.get('/accounts', authenticate, getGCPAccounts);
router.delete('/account/:id', authenticate, deleteGCPAccount);
router.post('/gke-clusters', authenticate, getGkeClusters);
router.post('/update-account/:id', authenticate, toggleGcpFavorite); 

export default router;

