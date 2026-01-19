// server/routes/awsRoutes.js
import express from 'express';
import * as awsController from '../controllers/awsController.js';
import authenticate from '../middleware/auth.js';


const router = express.Router();

router.post('/validate-credentials', awsController.validateAWSCredentials);
router.post('/connect', authenticate, awsController.connectToAWS);
router.get('/get-aws-accounts', authenticate, awsController.getAWSAccounts);
router.post('/update-account/:accountId', authenticate, awsController.updateAccount);
router.get('/:id/metrics', authenticate, awsController.getAwsMetrics);
router.get('/account-resources', authenticate, awsController.getAccountResources);  
router.get('/:id/clusters', authenticate, awsController.getAwsClustersForAccount);
router.get('/:id/ec2', authenticate, awsController.getAwsEc2Instances);
router.post('/:id/k8s-resources', authenticate, awsController.getK8sResourcesForCluster);
router.get('/:id/workloads', authenticate, (req, res) => {
  res.json([{ name: 'api-server', namespace: 'default', type: 'Deployment', replicas: '3/3' }]);
});
router.delete('/account/:_id', authenticate, awsController.removeAWSAccount);
router.post('/get-vpcs', authenticate, awsController.getVpcs);
router.get('/account-resources', authenticate, awsController.getAccountResources);
router.post('/eks-clusters', authenticate, awsController.getEksClusters);
router.post('/instance-types', authenticate, awsController.getInstanceTypes);
router.post('/amis', authenticate, awsController.getAmis);
router.post('/key-pairs', authenticate, awsController.getKeyPairs);
router.post('/availability-zones', authenticate, awsController.getAvailabilityZones);
router.post('/pricing', authenticate, awsController.getPricing);
router.post('/:id/s3', authenticate, awsController.getS3Buckets);
router.post('/:id/lambda', authenticate, awsController.getLambdaFunctions);
router.post('/:id/load-balancers', authenticate, awsController.getLoadBalancers);
router.post('/:id/vpcs', authenticate, awsController.getVpcs);
router.post('/:id/cost-explorer', authenticate, awsController.getCostExplorerData);
router.post('/:id/cloudwatch-metrics', authenticate, awsController.getCloudWatchMetrics);
router.post('/:id/ec2-metrics', authenticate, awsController.getEc2Metrics);
router.post('/:id/cloudwatch-metrics-with-credits', authenticate, awsController.getCloudWatchMetricsWithCredits);
export default router;
