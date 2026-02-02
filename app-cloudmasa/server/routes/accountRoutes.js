// server/routes/accountRoutes.js
import express from 'express';
import CloudConnection from '../models/CloudConnectionModel.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only check AWS for now (you'll add GCP/Azure later)
    const awsAccount = await CloudConnection.findById(id);
    
    if (!awsAccount || awsAccount.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      _id: awsAccount._id,
      cloudProvider: 'AWS',
      accountId: awsAccount.accountId,
      accountName: awsAccount.accountName,
      region: awsAccount.awsRegion,
      roleArn: awsAccount.roleArn,
      iamUserName: awsAccount.iamUserName,
      arn: awsAccount.arn,
      isFavorite: awsAccount.isFavorite
    });
  } catch (err) {
    console.error('Account fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

export default router;
