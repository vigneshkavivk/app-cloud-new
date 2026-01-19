// server/controllers/awsController.js
import AWS from 'aws-sdk';
import CloudConnection from '../models/CloudConnectionModel.js';
import Cluster from '../models/ClusterModel.js'; // Required for cascade delete
import { encrypt, decrypt } from '../utils/encryption.js';

// ========================
// Pricing Logic (UNCHANGED)
// ========================
const fetchPricingFromAws = async (serviceCode, region, filters = [], awsConfig = null) => {
  if (!awsConfig || !awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
    throw new Error('AWS credentials missing for Pricing API');
  }
  const pricingConfig = {
    region: 'us-east-1',
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey
  };
  const pricing = new AWS.Pricing(pricingConfig);
  const params = {
    ServiceCode: serviceCode,
    Filters: [
      { Type: 'TERM_MATCH', Field: 'location', Value: getAwsRegionName(region) },
      ...filters
    ],
    FormatVersion: 'aws_v1'
  };
  try {
    const data = await pricing.getProducts(params).promise();
    const prices = {};
    data.PriceList.forEach(product => {
      const productObj = typeof product === 'string' ? JSON.parse(product) : product;
      const terms = productObj.terms?.OnDemand;
      if (!terms) return;
      const termKey = Object.keys(terms)[0];
      const priceDimensions = terms[termKey]?.priceDimensions;
      if (!priceDimensions) return;
      const priceKey = Object.keys(priceDimensions)[0];
      const pricePerUnit = parseFloat(priceDimensions[priceKey]?.pricePerUnit?.USD);
      let key = 'default';
      if (serviceCode === 'AmazonEC2') {
        key = productObj.product?.attributes?.instanceType || 'default';
      } else if (serviceCode === 'AmazonS3') {
        key = productObj.product?.attributes?.storageClass || 'STANDARD';
      }
      if (!isNaN(pricePerUnit)) {
        prices[key] = pricePerUnit;
      }
    });
    return prices;
  } catch (err) {
    console.error(`Pricing fetch error for ${serviceCode}:`, {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      retryable: err.retryable
    });
    return {};
  }
};

const getAwsRegionName = (regionCode) => {
  const map = {
    'us-east-1': 'US East (N. Virginia)',
    'us-west-2': 'US West (Oregon)',
    'eu-central-1': 'EU (Frankfurt)',
    'ap-southeast-1': 'Asia Pacific (Singapore)',
    'ap-south-1': 'Asia Pacific (Mumbai)',
  };
  return map[regionCode] || regionCode;
};

// ========================
// VALIDATE CREDENTIALS
// ========================
const validateAWSCredentials = async (req, res) => {
  const { accessKeyId, secretAccessKey, region = 'us-east-1' } = req.body;
  if (!accessKeyId || !secretAccessKey) {
    return res.status(400).json({ error: 'Access key and secret key are required' });
  }
  try {
    const config = { accessKeyId, secretAccessKey, region };
    const sts = new AWS.STS(config);
    const identity = await sts.getCallerIdentity().promise();
    const accountId = identity.Account;
    const arn = identity.Arn;
    const roleArn = `arn:aws:iam::${accountId}:role/CostExplorerAccessRole`;
    let accountAlias = null;
    try {
      const iam = new AWS.IAM(config);
      const aliases = await iam.listAccountAliases().promise();
      accountAlias = aliases.AccountAliases?.[0] || null;
    } catch (err) {
      // Ignore
    }
    let suggestedName = accountId;
    if (accountAlias) {
      suggestedName = accountAlias;
    } else if (arn.includes('user/')) {
      suggestedName = arn.split('user/')[1].split('/')[0];
    } else if (arn.includes('assumed-role/')) {
      const parts = arn.split('/');
      suggestedName = parts.length > 2 ? parts[1] : accountId;
    }
    res.json({
      valid: true,
      accountId,
      accountAlias,
      suggestedName,
      arn,
      roleArn,
      message: 'AWS credentials are valid',
    });
  } catch (err) {
    console.error('AWS validation error:', err.message || err);
    res.status(401).json({
      valid: false,
      error: err.message || 'Invalid AWS credentials',
    });
  }
};

// ========================
// CONNECT TO AWS
// ========================
const connectToAWS = async (req, res) => {
  const { accessKeyId, secretAccessKey, region = 'us-east-1', accountName = '', roleArn = '' } = req.body;
  if (!accessKeyId || !secretAccessKey) {
    return res.status(400).json({ error: 'Access key and secret key are required' });
  }
  try {
    const sts = new AWS.STS({ accessKeyId, secretAccessKey, region });
    const identity = await sts.getCallerIdentity().promise();
    const existingConnection = await CloudConnection.findOne({
      accountId: identity.Account,
      awsRegion: region
    });
    if (existingConnection) {
      return res.json({
        success: true,
        message: `✅ ${identity.Account} already connected in ${region}.`,
        reused: true
      });
    }
    let iamUserName = 'Unknown';
    if (identity.Arn && identity.Arn.includes('user/')) {
      iamUserName = identity.Arn.split('user/')[1];
    } else if (identity.Arn && identity.Arn.includes('assumed-role/')) {
      const parts = identity.Arn.split('/');
      iamUserName = parts.length > 2 ? parts[1] : 'AssumedRole';
    }
    const finalAccountName = accountName.trim() || iamUserName || identity.Account;
    const finalRoleArn = roleArn || `arn:aws:iam::${identity.Account}:role/CostExplorerAccessRole`;
    const cloudConnection = new CloudConnection({
      awsAccessKey: encrypt(accessKeyId),
      awsSecretKey: encrypt(secretAccessKey),
      awsRegion: region,
      accountId: identity.Account,
      iamUserName,
      accountName: finalAccountName,
      userId: req.user?._id || 'anonymous',
      arn: identity.Arn,
      roleArn: finalRoleArn,
    });
    await cloudConnection.save();
    res.json({ success: true, message: 'AWS account connected successfully' });
  } catch (err) {
    console.error('AWS connection error:', err);
    res.status(500).json({ error: 'Failed to connect AWS account', details: err.message });
  }
};

// ========================
// GET AWS ACCOUNTS
// ========================
const getAWSAccounts = async (req, res) => {
  try {
    const accounts = await CloudConnection.find(
      {},
      'accountId awsRegion arn userId iamUserName accountName roleArn isFavorite'
    ).lean();
    const accountsWithProvider = accounts.map(acc => ({
      ...acc,
      cloudProvider: 'AWS'
    }));
    res.json(accountsWithProvider);
  } catch (err) {
    console.error('Error fetching AWS accounts:', err);
    res.status(500).json({ error: 'Failed to fetch AWS accounts' });
  }
};

// ========================
// DELETE AWS ACCOUNT + CASCADE DELETE CLUSTERS
// ========================
const removeAWSAccount = async (req, res) => {
  const { _id } = req.params;
  if (!_id) {
    return res.status(400).json({ error: 'Account ID (_id) is required' });
  }
  try {
    const connection = await CloudConnection.findById(_id);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account connection not found' });
    }
    const { accountId } = connection;
    const result = await Cluster.deleteMany({
      $or: [
        { account: accountId },
        { cloudConnectionId: _id }
      ]
    });
    console.log(`✅ Deleted ${result.deletedCount} clusters for account: ${accountId}`);
    await CloudConnection.findByIdAndDelete(_id);
    res.json({
      message: 'AWS account and its associated clusters deleted successfully from database',
      clustersDeleted: result.deletedCount,
      success: true
    });
  } catch (err) {
    console.error('❌ Error during deletion:', err);
    res.status(500).json({
      error: 'Failed to delete AWS account and related clusters',
      details: err.message
    });
  }
};

// ========================
// GET VPCS + SUBNETS + SECURITY GROUPS
// ========================
const getVpcs = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ success: false, error: 'accountId (MongoDB ID) is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ success: false, error: 'AWS account connection not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const vpcData = await ec2.describeVpcs({}).promise();
    const enrichedVpcs = await Promise.all(
      vpcData.Vpcs.map(async (vpc) => {
        const vpcId = vpc.VpcId;
        const subnetData = await ec2.describeSubnets({
          Filters: [{ Name: 'vpc-id', Values: [vpcId] }]
        }).promise();
        const subnets = subnetData.Subnets.map(subnet => ({
          id: subnet.SubnetId,
          name: subnet.Tags?.find(tag => tag.Key === 'Name')?.Value || subnet.SubnetId,
          availabilityZone: subnet.AvailabilityZone,
          cidrBlock: subnet.CidrBlock,
          state: subnet.State,
          isPublic: subnet.MapPublicIpOnLaunch
        }));
        const sgData = await ec2.describeSecurityGroups({
          Filters: [{ Name: 'vpc-id', Values: [vpcId] }]
        }).promise();
        const securityGroups = sgData.SecurityGroups.map(sg => ({
          id: sg.GroupId,
          name: sg.GroupName,
          description: sg.Description
        }));
        return {
          id: vpc.VpcId,
          name: vpc.Tags?.find(tag => tag.Key === 'Name')?.Value || vpc.VpcId,
          cidrBlock: vpc.CidrBlock,
          state: vpc.State,
          isDefault: vpc.IsDefault,
          subnets,
          securityGroups
        };
      })
    );
    res.json({
      success: true,
      vpcs: enrichedVpcs.length,    // ✅ Number (count)
      vpcsList: enrichedVpcs        // ✅ Array (details)
    });
  } catch (err) {
    console.error('❌ VPC Fetch Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch VPCs, subnets, or security groups',
      details: err.message
    });
  }
};

// ========================
// GET FULL EKS CLUSTERS
// ========================
const getEksClusters = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId (MongoDB _id) is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account connection not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const eks = new AWS.EKS({ accessKeyId, secretAccessKey, region });
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const listResult = await eks.listClusters({}).promise();
    const clusterNames = listResult.clusters || [];
    const clusterDetails = await Promise.all(
      clusterNames.map(async (name) => {
        try {
          const { cluster } = await eks.describeCluster({ name }).promise();
          const dbCluster = await Cluster.findOne({ name: cluster.name, account: connection.accountId });
          const ec2Params = {
            Filters: [
              { Name: `tag:kubernetes.io/cluster/${name}`, Values: ['owned', 'shared'] },
              { Name: 'instance-state-name', Values: ['running'] }
            ]
          };
          const ec2Data = await ec2.describeInstances(ec2Params).promise();
          let liveNodeCount = 0;
          ec2Data.Reservations.forEach(res => {
            liveNodeCount += res.Instances.length;
          });
          const statusMap = {
            'ACTIVE': 'running',
            'CREATING': 'creating',
            'DELETING': 'deleting',
            'FAILED': 'failed'
          };
          const displayStatus = statusMap[cluster.status] || cluster.status.toLowerCase();
          return {
            _id: dbCluster?._id || `${connection._id}-${name}`,
            dbId: dbCluster?._id || null,
            name: cluster.name,
            status: displayStatus,
            region: cluster.region,
            version: cluster.version,
            account: connection.accountId,
            accountName: connection.accountName,
            liveNodeCount,
            endpoint: cluster.endpoint,
            createdAt: cluster.createdAt,
            isSaved: !!dbCluster
          };
        } catch (err) {
          console.warn(`⚠️ Failed to describe cluster "${name}":`, err.message);
          return null;
        }
      })
    );
    res.json(clusterDetails.filter(Boolean));
  } catch (err) {
    console.error('❌ EKS Fetch Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch EKS clusters',
      details: err.message
    });
  }
};

// ========================
// GET PRICING
// ========================
const getPricing = async (req, res) => {
  try {
    const { region, modules = [], accountId: connectionId } = req.body;
    if (!region || !connectionId) {
      return res.status(400).json({ success: false, error: 'Region and AWS account connection ID are required' });
    }
    const connection = await CloudConnection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, error: 'AWS connection not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const pricing = {};
    const pricingConfig = { accessKeyId, secretAccessKey, region: 'us-east-1' };
    if (modules.includes('ec2')) {
      pricing.ec2 = await fetchPricingFromAws('AmazonEC2', region, [
        { Type: 'TERM_MATCH', Field: 'operatingSystem', Value: 'Linux' },
        { Type: 'TERM_MATCH', Field: 'tenancy', Value: 'Shared' },
        { Type: 'TERM_MATCH', Field: 'preInstalledSw', Value: 'NA' },
        { Type: 'TERM_MATCH', Field: 'capacitystatus', Value: 'Used' }
      ], pricingConfig);
    }
    if (modules.includes('s3')) {
      pricing.s3 = await fetchPricingFromAws('AmazonS3', region, [], pricingConfig);
    }
    if (modules.includes('vpc')) {
      pricing.vpc = await fetchPricingFromAws('AmazonVPC', region, [
        { Type: 'TERM_MATCH', Field: 'usagetype', Value: `${region}-NatGateway-Hours` }
      ], pricingConfig);
    }
    if (modules.includes('lambda')) {
      pricing.lambda = { requests: 0.0000002, duration: 0.0000166667 };
    }
    if (modules.includes('dynamodb')) {
      pricing.dynamodb = { read: 0.25, write: 1.25, storage: 0.25 };
    }
    if (modules.includes('kms')) {
      pricing.kms = { key: 1.0 };
    }
    if (modules.includes('route53')) {
      pricing.route53 = { hostedZone: 0.5 };
    }
    if (modules.includes('efs')) {
      pricing.efs = { storage: 0.30 };
    }
    if (modules.includes('sns')) {
      pricing.sns = { publish: 0.5 / 1e6, sms: 0.00645 };
    }
    if (modules.includes('cloudwatch')) {
      pricing.cloudwatch = { logs: 0.57, metrics: 0.30 };
    }
    if (modules.includes('ecr')) {
      pricing.ecr = { storage: 0.10 };
    }
    if (modules.includes('lb')) {
      pricing.lb = { alb: 0.0225, nlb: 0.0225, gwlb: 0.012 };
    }
    res.json({ success: true, pricing });
  } catch (error) {
    console.error('Pricing API error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch live pricing', details: error.message });
  }
};

// ========================
// FETCH AMIs
// ========================
const getAmis = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId (MongoDB ID) is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account connection not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const params = {
      Filters: [
        { Name: 'state', Values: ['available'] },
        { Name: 'architecture', Values: ['x86_64', 'arm64'] }
      ]
    };
    const data = await ec2.describeImages(params).promise();
    const amis = data.Images.map(image => ({
      id: image.ImageId,
      name: image.Name || image.ImageId,
      description: image.Description || '',
      os: image.PlatformDetails || image.Platform || 'Unknown',
      architecture: image.Architecture,
      virtualizationType: image.VirtualizationType,
      creationDate: image.CreationDate
    }));
    res.json({ success: true, amis });
  } catch (err) {
    console.error('❌ AMI Fetch Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AMIs',
      details: err.message
    });
  }
};

// ========================
// FETCH KEY PAIRS
// ========================
const getKeyPairs = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId (MongoDB ID) is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account connection not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const data = await ec2.describeKeyPairs().promise();
    const keyPairs = data.KeyPairs.map(kp => ({
      name: kp.KeyName,
      fingerprint: kp.KeyFingerprint,
      // You can add more fields if needed
    }));
    res.json({ success: true, keyPairs });
  } catch (err) {
    console.error('❌ Key Pair Fetch Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Key Pairs',
      details: err.message
    });
  }
};

// ========================
// ✅ FETCH AVAILABLE AVAILABILITY ZONES FOR A REGION
// ========================
const getAvailabilityZones = async (req, res) => {
  const { accountId, region } = req.body;
  if (!accountId || !region) {
    return res.status(400).json({ error: 'accountId and region are required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account connection not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const data = await ec2.describeAvailabilityZones({
      Filters: [
        { Name: 'state', Values: ['available'] }
      ]
    }).promise();
    const azs = data.AvailabilityZones.map(az => ({
      name: az.ZoneName,
      group: az.GroupName,
      state: az.State
    }));
    res.json({ success: true, availabilityZones: azs });
  } catch (err) {
    console.error('❌ AZ Fetch Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Availability Zones',
      details: err.message
    });
  }
};

// ========================
// ✅ FETCH ALL EC2 INSTANCE TYPES (TOP-LEVEL)
// ========================
const getInstanceTypes = async (req, res) => {
  console.log("✅ getInstanceTypes called with body:", req.body);
  console.log("✅ User from auth middleware:", req.user); // Should NOT be undefined
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account connection not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const instanceTypes = [];
    let nextToken = null;
    do {
      const params = nextToken ? { NextToken: nextToken } : {};
      const data = await ec2.describeInstanceTypes(params).promise();
      instanceTypes.push(...data.InstanceTypes);
      nextToken = data.NextToken;
    } while (nextToken);
    const formatted = instanceTypes
      .map(it => ({
        name: it.InstanceType,
        vCpus: it.VCpuInfo?.DefaultVCpus || 0,
        memoryGiB: Math.round((it.MemoryInfo?.SizeInMiB || 0) / 1024),
        family: it.InstanceType.split('.')[0]
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ success: true, instanceTypes: formatted });
  } catch (err) {
    console.error('Failed to fetch instance types:', err);
    res.status(500).json({ error: 'Failed to fetch instance types', details: err.message });
  }
};

// ========================
// FETCH TERRAFORM (IaC) RESOURCES ONLY
// ========================
const getAccountResources = async (req, res) => {
  const { accountId } = req.query;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId (MongoDB _id) is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account connection not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const s3 = new AWS.S3({ accessKeyId, secretAccessKey, region });
    const lambda = new AWS.Lambda({ accessKeyId, secretAccessKey, region });
    const [ec2Data, s3Data, lambdaData] = await Promise.all([
      ec2.describeInstances({}).promise().catch(() => ({ Reservations: [] })),
      s3.listBuckets({}).promise().catch(() => ({ Buckets: [] })),
      lambda.listFunctions({}).promise().catch(() => ({ Functions: [] }))
    ]);
    const isTerraformResource = (tags = []) => {
      if (!Array.isArray(tags)) return false;
      const tagMap = Object.fromEntries(tags.map(t => [t.Key?.toLowerCase(), t.Value?.toLowerCase()]));
      return (
        tagMap['terraform'] === 'true' ||
        tagMap['createdby'] === 'terraform' ||
        tagMap['tf']?.startsWith('aws_') ||
        tagMap['managed_by'] === 'terraform' ||
        tagMap['iac']?.includes('terraform')
      );
    };
    const terraformResources = { ec2: [], s3: [], lambda: [], total: 0 };
    ec2Data.Reservations.flatMap(r => r.Instances || []).forEach(inst => {
      if (isTerraformResource(inst.Tags)) {
        terraformResources.ec2.push({
          id: inst.InstanceId,
          name: inst.Tags?.find(t => t.Key === 'Name')?.Value || inst.InstanceId,
          type: 'EC2',
          state: inst.State.Name,
          region
        });
      }
    });
    const bucketSamples = s3Data.Buckets?.slice(0, 20) || [];
    for (const bucket of bucketSamples) {
      try {
        const tagRes = await s3.getBucketTagging({ Bucket: bucket.Name }).promise();
        const tags = tagRes.TagSet || [];
        if (isTerraformResource(tags)) {
          terraformResources.s3.push({
            id: bucket.Name,
            name: bucket.Name,
            type: 'S3',
            region
          });
        }
      } catch (err) {
        if (err.code !== 'NoSuchTagSet' && err.code !== 'AccessDenied') {
          console.warn(`S3 tagging error for ${bucket.Name}:`, err.code);
        }
      }
    }
    lambdaData.Functions?.forEach(fn => {
      const tags = Object.entries(fn.Tags || {}).map(([k, v]) => ({ Key: k, Value: v }));
      if (isTerraformResource(tags)) {
        terraformResources.lambda.push({
          id: fn.FunctionName,
          name: fn.FunctionName,
          type: 'Lambda',
          runtime: fn.Runtime,
          region
        });
      }
    });
    terraformResources.total =
      terraformResources.ec2.length +
      terraformResources.s3.length +
      terraformResources.lambda.length;
    res.status(200).json({
      success: true,
      iacOnly: true,
      provider: 'aws',
      accountId: connection.accountId,
      region,
      resources: terraformResources
    });
  } catch (err) {
    console.error('❌ getAccountResources (IaC-only) error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to scan for IaC resources',
      details: err.message
    });
  }
};

const updateAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { isFavorite } = req.body;
    // Validate isFavorite
    if (typeof isFavorite !== 'boolean') {
      return res.status(400).json({ error: 'isFavorite must be a boolean' });
    }
    // 🔒 Update ONLY if the account exists AND belongs to the current user
    const account = await CloudConnection.findOneAndUpdate(
      {
        _id: accountId,
        userId: req.user?._id // ← Enforce ownership
      },
      { $set: { isFavorite } },
      { new: true, runValidators: true }
    );
    if (!account) {
      // Either not found OR doesn't belong to user → treat as 404 or 403
      return res.status(404).json({ error: 'AWS account not found or access denied' });
    }
    res.json({ success: true, account });
  } catch (error) {
    console.error('Error updating AWS account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
};

// GET /api/aws/:id/clusters
const getAwsClustersForAccount = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await CloudConnection.findById(id);
    if (!connection || connection.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Account not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const eks = new AWS.EKS({ accessKeyId, secretAccessKey, region });
    const listResult = await eks.listClusters({}).promise();
    const clusters = await Promise.all(
      (listResult.clusters || []).map(async (name) => {
        const { cluster } = await eks.describeCluster({ name }).promise();
        return {
          name: cluster.name,
          location: cluster.region,
          version: cluster.version,
          nodePools: cluster.resourcesVpcConfig?.subnetIds?.length || 0,
          status: cluster.status
        };
      })
    );
    res.json(clusters);
  } catch (err) {
    console.error('Cluster fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch clusters' });
  }
};

// GET /api/aws/:id/ec2
const getAwsEc2Instances = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await CloudConnection.findById(id);
    if (!connection || connection.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Account not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const data = await ec2.describeInstances({}).promise();
    const instances = [];
    data.Reservations?.forEach(r => {
      r.Instances?.forEach(i => {
        if (i.State.Name === 'terminated') return;
        let name = i.Tags?.find(t => t.Key === 'Name')?.Value || '—';
        instances.push({
          instanceId: i.InstanceId,
          name,
          instanceType: i.InstanceType,
          state: i.State.Name,
          availabilityZone: i.Placement.AvailabilityZone,
          internalIp: i.PrivateIpAddress || null,
          externalIp: i.PublicIpAddress || null
        });
      });
    });
    res.json(instances);
  } catch (err) {
    console.error('EC2 fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch EC2 instances' });
  }
};

// ========================
// ✅ FETCH REAL K8S RESOURCES FROM EKS CLUSTER
// ========================
const getK8sResourcesForCluster = async (req, res) => {
  const { clusterName, accountId } = req.body;
  if (!clusterName || !accountId) {
    return res.status(400).json({ error: 'clusterName and accountId required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    // Get EKS cluster info
    const eks = new AWS.EKS({ accessKeyId, secretAccessKey, region });
    const { cluster } = await eks.describeCluster({ name: clusterName }).promise();
    // Get auth token
    const token = await getEksAuthToken(clusterName, region, accessKeyId, secretAccessKey);
    // Initialize Kubernetes client
    const k8s = require('@kubernetes/client-node');
    const kc = new k8s.KubeConfig();
    kc.loadFromOptions({
      clusters: [
        {
          name: clusterName,
          server: cluster.endpoint,
          caData: Buffer.from(cluster.certificateAuthority.data, 'base64').toString('utf8')
        }
      ],
      users: [
        {
          name: 'aws',
          token
        }
      ],
      contexts: [
        {
          name: 'aws',
          cluster: clusterName,
          user: 'aws'
        }
      ],
      currentContext: 'aws'
    });
    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    const appsApi = kc.makeApiClient(k8s.AppsV1Api);
    const networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
    // Fetch Namespaces
    const nsRes = await k8sApi.listNamespace();
    const namespaces = nsRes.body.items.map(ns => ({
      name: ns.metadata.name,
      status: ns.status.phase,
      pods: 0 // Will be counted below
    }));
    // Fetch Pods per Namespace
    const podPromises = namespaces.map(async ns => {
      const podRes = await k8sApi.listNamespacedPod(ns.name);
      const podCount = podRes.body.items.length;
      return { ...ns, pods: podCount };
    });
    const namespacesWithPods = await Promise.all(podPromises);
    // Fetch Deployments, StatefulSets, DaemonSets
    const deploymentsRes = await appsApi.listDeploymentForAllNamespaces();
    const statefulsetsRes = await appsApi.listStatefulSetForAllNamespaces();
    const daemonsetsRes = await appsApi.listDaemonSetForAllNamespaces();
    const workloads = [
      ...deploymentsRes.body.items.map(d => ({
        name: d.metadata.name,
        namespace: d.metadata.namespace,
        type: 'Deployment',
        replicas: d.spec.replicas || 0,
        readyReplicas: d.status.readyReplicas || 0,
        status: d.status.conditions?.find(c => c.type === 'Available')?.status || 'Unknown'
      })),
      ...statefulsetsRes.body.items.map(s => ({
        name: s.metadata.name,
        namespace: s.metadata.namespace,
        type: 'StatefulSet',
        replicas: s.spec.replicas || 0,
        readyReplicas: s.status.readyReplicas || 0,
        status: s.status.conditions?.find(c => c.type === 'Ready')?.status || 'Unknown'
      })),
      ...daemonsetsRes.body.items.map(d => ({
        name: d.metadata.name,
        namespace: d.metadata.namespace,
        type: 'DaemonSet',
        replicas: d.status.currentNumberScheduled || 0,
        readyReplicas: d.status.numberReady || 0,
        status: d.status.conditions?.find(c => c.type === 'Available')?.status || 'Unknown'
      }))
    ];
    // Fetch Services
    const servicesRes = await k8sApi.listServiceForAllNamespaces();
    const services = servicesRes.body.items.map(s => ({
      name: s.metadata.name,
      namespace: s.metadata.namespace,
      type: s.spec.type || 'ClusterIP',
      clusterIP: s.spec.clusterIP,
      ports: s.spec.ports?.map(p => `${p.port}/${p.protocol}`) || []
    }));
    // Link services to workloads (by namespace & label selectors)
    const workloadsWithServices = workloads.map(w => {
      const relatedServices = services.filter(s =>
        s.namespace === w.namespace &&
        // Basic match: service selector matches workload labels
        Object.entries(s.spec.selector || {}).every(([key, value]) =>
          w.labels?.[key] === value
        )
      );
      return {
        ...w,
        services: relatedServices
      };
    });
    res.json({
      success: true,
      cluster: clusterName,
      namespaces: namespacesWithPods,
      workloads: workloadsWithServices,
      services: services,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ K8s Resource Fetch Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live Kubernetes resources',
      details: err.message
    });
  }
};

// GET S3 BUCKETS WITH METRICS
const getS3Buckets = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const s3 = new AWS.S3({ accessKeyId, secretAccessKey, region });
    const cloudwatch = new AWS.CloudWatch({ accessKeyId, secretAccessKey, region });
    // List buckets
    const listRes = await s3.listBuckets().promise();
    const buckets = listRes.Buckets || [];
    // Get metrics for each bucket (last 1 hour)
    const bucketMetrics = await Promise.all(
      buckets.map(async (bucket) => {
        try {
          // Number of objects
          const objMetric = await cloudwatch.getMetricStatistics({
            Namespace: 'AWS/S3',
            MetricName: 'NumberOfObjects',
            Dimensions: [
              { Name: 'BucketName', Value: bucket.Name },
              { Name: 'StorageType', Value: 'AllStorageTypes' }
            ],
            StartTime: new Date(Date.now() - 3600000),
            EndTime: new Date(),
            Period: 3600,
            Statistics: ['Average']
          }).promise();
          // Bucket size
          const sizeMetric = await cloudwatch.getMetricStatistics({
            Namespace: 'AWS/S3',
            MetricName: 'BucketSizeBytes',
            Dimensions: [
              { Name: 'BucketName', Value: bucket.Name },
              { Name: 'StorageType', Value: 'StandardStorage' }
            ],
            StartTime: new Date(Date.now() - 3600000),
            EndTime: new Date(),
            Period: 3600,
            Statistics: ['Average']
          }).promise();
          const objects = objMetric.Datapoints?.[0]?.Average || 0;
          const sizeBytes = sizeMetric.Datapoints?.[0]?.Average || 0;
          const sizeGB = (sizeBytes / (1024 ** 3)).toFixed(2);
          return {
            name: bucket.Name,
            region: region,
            creationDate: bucket.CreationDate,
            objects: Math.round(objects),
            size: `${sizeGB} GB`
          };
        } catch (err) {
          console.warn(`⚠️ Failed to get metrics for bucket ${bucket.Name}:`, err.message);
          return {
            name: bucket.Name,
            region: region,
            creationDate: bucket.CreationDate,
            objects: 0,
            size: '0.00 GB'
          };
        }
      })
    );
    res.json({
      success: true,
      s3Buckets: bucketMetrics.length,
      s3BucketsList: bucketMetrics
    });
  } catch (err) {
    console.error('❌ S3 Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch S3 buckets', details: err.message });
  }
};

// GET LAMBDA FUNCTIONS
const getLambdaFunctions = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const lambda = new AWS.Lambda({ accessKeyId, secretAccessKey, region });
    const functions = [];
    let nextMarker = null;
    do {
      const params = nextMarker ? { Marker: nextMarker } : {};
      const data = await lambda.listFunctions(params).promise();
      functions.push(...data.Functions);
      nextMarker = data.NextMarker;
    } while (nextMarker);
    const formatted = functions.map(fn => ({
      functionName: fn.FunctionName,
      runtime: fn.Runtime,
      memorySize: fn.MemorySize,
      timeout: fn.Timeout,
      lastModified: fn.LastModified,
      description: fn.Description || ''
    }));
    res.json({
      success: true,
      lambdaFunctions: formatted.length,
      lambdaFunctionsList: formatted
    });
  } catch (err) {
    console.error('❌ Lambda Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch Lambda functions', details: err.message });
  }
};

// GET LOAD BALANCERS
const getLoadBalancers = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const elbv2 = new AWS.ELBv2({ accessKeyId, secretAccessKey, region });
    const lbs = [];
    let nextMarker = null;
    do {
      const params = nextMarker ? { Marker: nextMarker } : {};
      const data = await elbv2.describeLoadBalancers(params).promise();
      lbs.push(...data.LoadBalancers);
      nextMarker = data.NextMarker;
    } while (nextMarker);
    const formatted = lbs.map(lb => ({
      name: lb.LoadBalancerName,
      type: lb.Type, // application | network
      state: lb.State.Code,
      region: region,
      dnsName: lb.DNSName,
      createdTime: lb.CreatedTime
    }));
    res.json({
      success: true,
      loadBalancers: formatted.length,
      loadBalancerList: formatted
    });
  } catch (err) {
    console.error('❌ Load Balancer Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch Load Balancers', details: err.message });
  }
};

const getAwsMetrics = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await CloudConnection.findById(id);
    if (!connection || connection.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'AWS account not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const eks = new AWS.EKS({ accessKeyId, secretAccessKey, region });
    const elbv2 = new AWS.ELBv2({ accessKeyId, secretAccessKey, region });
    const s3 = new AWS.S3({ accessKeyId, secretAccessKey, region });
    const lambda = new AWS.Lambda({ accessKeyId, secretAccessKey, region });
    // Parallel fetch
    const [
      ec2Data,
      eksData,
      lbData,
      s3Data,
      lambdaData
    ] = await Promise.all([
      ec2.describeInstances({}).promise().catch(() => ({ Reservations: [] })),
      eks.listClusters({}).promise().catch(() => ({ clusters: [] })),
      elbv2.describeLoadBalancers({}).promise().catch(() => ({ LoadBalancers: [] })),
      s3.listBuckets({}).promise().catch(() => ({ Buckets: [] })),
      lambda.listFunctions({}).promise().catch(() => ({ Functions: [] }))
    ]);
    // Count EC2 (non-terminated)
    let ec2Count = 0;
    ec2Data.Reservations.forEach(r => {
      r.Instances?.forEach(i => {
        if (i.State.Name !== 'terminated') ec2Count++;
      });
    });
    const metrics = {
      // Existing
      clusters: eksData.clusters?.length || 0,
      namespaces: 0, // ← Still needs k8s API
      ec2: ec2Count,
      pods: 0,       // ← Still needs k8s API
      workloads: 0,
      services: 0,
      // NEW
      loadBalancers: lbData.LoadBalancers?.length || 0,
      s3Buckets: s3Data.Buckets?.length || 0,
      lambdaFunctions: lambdaData.Functions?.length || 0,
      vpcs: 0, // ← We'll fetch VPC count separately if needed
      // Mock utilization (replace later)
      storage: { used: 192, total: 256, percent: 75, unit: 'GB' },
      cpu: { used: 480, total: 512, percent: 94, unit: 'vCPU' },
      memory: { used: 890, total: 1024, percent: 87, unit: 'GB' },
      networkIn: 165,
      networkOut: 240,
      costCurrent: 12450.75,
      costProjected: 21300.50
    };
    res.json(metrics);
  } catch (err) {
    console.error('AWS metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch AWS metrics' });
  }
};

// ========================
// ✅ FETCH LIVE COST DATA USING COST EXPLORER
// ========================
const getCostExplorerData = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const ce = new AWS.CostExplorer({
      accessKeyId,
      secretAccessKey,
      region: 'us-east-1' // Cost Explorer is global
    });
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = firstDayOfMonth.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    const params = {
      TimePeriod: {
        Start: startDate,
        End: endDate
      },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE'
        }
      ]
    };
    const data = await ce.getCostAndUsage(params).promise();
    let totalCost = 0;
    data.ResultsByTime.forEach(result => {
      result.Groups.forEach(group => {
        totalCost += parseFloat(group.Metrics.UnblendedCost.Amount);
      });
    });
    // Projected cost (simple estimate: daily avg * days left)
    const daysPassed = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dailyAvg = totalCost / daysPassed;
    const projectedCost = dailyAvg * daysInMonth;
    res.json({
      success: true,
      currentMonth: totalCost,
      projected: projectedCost,
      currency: data.ResultsByTime[0]?.Groups?.[0]?.Metrics?.UnblendedCost?.Unit || 'USD',
      details: data.ResultsByTime
    });
  } catch (err) {
    console.error('❌ Cost Explorer Fetch Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live cost data',
      details: err.message
    });
  }
};

// ========================
// ✅ FETCH LIVE CLOUDWATCH METRICS (CPU, Memory, Storage)
// ========================
const getCloudWatchMetrics = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const cloudwatch = new AWS.CloudWatch({
      accessKeyId,
      secretAccessKey,
      region
    });
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000); // Last 1 hour
    // Get CPU utilization for all EC2 instances
    const cpuParams = {
      Namespace: 'AWS/EC2',
      MetricName: 'CPUUtilization',
      Period: 300, // 5 minutes
      StartTime: oneHourAgo,
      EndTime: now,
      Statistics: ['Average'],
      Dimensions: []
    };
    // Get Memory utilization (if you have custom metrics)
    // For now, we'll use EC2 instance types to estimate memory
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const instances = await ec2.describeInstances({}).promise();
    let totalMemoryUsed = 0;
    let totalMemoryTotal = 0;
    instances.Reservations.forEach(r => {
      r.Instances.forEach(i => {
        if (i.State.Name === 'running') {
          // Estimate memory based on instance type (mock for now)
          const memoryMap = {
            't2.micro': 1,
            't2.small': 2,
            't2.medium': 4,
            't2.large': 8,
            'm5.large': 8,
            'm5.xlarge': 16,
            'm5.2xlarge': 32,
            'm5.4xlarge': 64,
            'm5.8xlarge': 128,
            'm5.12xlarge': 192,
            'm5.16xlarge': 256,
            'm5.24xlarge': 384,
            'r5.large': 16,
            'r5.xlarge': 32,
            'r5.2xlarge': 64,
            'r5.4xlarge': 128,
            'r5.8xlarge': 256,
            'r5.12xlarge': 384,
            'r5.16xlarge': 512,
            'r5.24xlarge': 768
          };
          const memoryPerInstance = memoryMap[i.InstanceType] || 0;
          totalMemoryTotal += memoryPerInstance;
          // Assume 80% usage for demo
          totalMemoryUsed += memoryPerInstance * 0.8;
        }
      });
    });
    // Get Storage (EBS + S3)
    const ebs = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const ebsVolumes = await ebs.describeVolumes({}).promise();
    let totalStorageUsed = 0;
    let totalStorageTotal = 0;
    ebsVolumes.Volumes.forEach(v => {
      totalStorageTotal += v.Size;
      // Assume 75% usage for demo
      totalStorageUsed += v.Size * 0.75;
    });
    // Get Network In/Out from CloudWatch
    const networkInParams = {
      Namespace: 'AWS/EC2',
      MetricName: 'NetworkIn',
      Period: 300,
      StartTime: oneHourAgo,
      EndTime: now,
      Statistics: ['Sum'],
      Dimensions: []
    };
    const networkOutParams = {
      Namespace: 'AWS/EC2',
      MetricName: 'NetworkOut',
      Period: 300,
      StartTime: oneHourAgo,
      EndTime: now,
      Statistics: ['Sum'],
      Dimensions: []
    };
    const [cpuData, networkInData, networkOutData] = await Promise.all([
      cloudwatch.getMetricStatistics(cpuParams).promise(),
      cloudwatch.getMetricStatistics(networkInParams).promise(),
      cloudwatch.getMetricStatistics(networkOutParams).promise()
    ]);
    // Calculate averages
    const avgCpu = cpuData.Datapoints?.length ? cpuData.Datapoints.reduce((sum, d) => sum + d.Average, 0) / cpuData.Datapoints.length : 0;
    const totalNetworkIn = networkInData.Datapoints?.reduce((sum, d) => sum + d.Sum, 0) || 0;
    const totalNetworkOut = networkOutData.Datapoints?.reduce((sum, d) => sum + d.Sum, 0) || 0;
    res.json({
      success: true,
      storage: {
        used: Math.round(totalStorageUsed),
        total: Math.round(totalStorageTotal),
        percent: totalStorageTotal > 0 ? Math.round((totalStorageUsed / totalStorageTotal) * 100) : 0,
        unit: 'GB'
      },
      cpu: {
        used: Math.round(avgCpu),
        total: 100, // Max is 100%
        percent: Math.round(avgCpu),
        unit: '%'
      },
      memory: {
        used: Math.round(totalMemoryUsed),
        total: Math.round(totalMemoryTotal),
        percent: totalMemoryTotal > 0 ? Math.round((totalMemoryUsed / totalMemoryTotal) * 100) : 0,
        unit: 'GB'
      },
      networkIn: Math.round(totalNetworkIn / (1024 ** 3)), // Convert to GB
      networkOut: Math.round(totalNetworkOut / (1024 ** 3)) // Convert to GB
    });
  } catch (err) {
    console.error('❌ CloudWatch Metrics Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live resource utilization',
      details: err.message
    });
  }
};

// ========================
// FETCH PER-INSTANCE CLOUDWATCH METRICS
// ========================
const getEc2Metrics = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const cloudwatch = new AWS.CloudWatch({ accessKeyId, secretAccessKey, region });
    // Get all running instances
    const instancesData = await ec2.describeInstances({
      Filters: [{ Name: 'instance-state-name', Values: ['running'] }]
    }).promise();
    const instances = [];
    instancesData.Reservations.forEach(r => {
      r.Instances.forEach(i => {
        instances.push({
          InstanceId: i.InstanceId,
          InstanceType: i.InstanceType,
          Name: i.Tags?.find(t => t.Key === 'Name')?.Value || i.InstanceId
        });
      });
    });
    // Fetch metrics for each instance
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 300000); // Last 5 mins
    const metricsPromises = instances.map(async (inst) => {
      const params = {
        Namespace: 'AWS/EC2',
        MetricName: 'CPUUtilization',
        Dimensions: [{ Name: 'InstanceId', Value: inst.InstanceId }],
        StartTime: fiveMinutesAgo,
        EndTime: now,
        Period: 300,
        Statistics: ['Average']
      };
      const data = await cloudwatch.getMetricStatistics(params).promise();
      const avgCpu = data.Datapoints?.length
        ? data.Datapoints.reduce((sum, d) => sum + d.Average, 0) / data.Datapoints.length
        : 0;
      // Estimate memory (replace with real data if using CloudWatch Agent)
      const memoryMap = {
        't2.micro': 1, 't2.small': 2, 't2.medium': 4, 't2.large': 8,
        'm5.large': 8, 'm5.xlarge': 16, 'm5.2xlarge': 32, 'r5.large': 16
      };
      const memoryGB = memoryMap[inst.InstanceType] || 0;
      const memoryUsed = memoryGB * 0.75; // Assume 75% usage
      return {
        id: inst.InstanceId,
        name: inst.Name,
        type: inst.InstanceType,
        cpu: Math.round(avgCpu),
        memoryUsed: Math.round(memoryUsed),
        memoryTotal: memoryGB,
        memoryPercent: memoryGB > 0 ? Math.round((memoryUsed / memoryGB) * 100) : 0
      };
    });
    const instanceMetrics = await Promise.all(metricsPromises);
    res.json({ success: true, instanceMetrics });
  } catch (err) {
    console.error('❌ Per-instance metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch per-instance metrics' });
  }
};

// ========================
// ✅ ADD FREE CREDITS CALCULATION FUNCTION
// ========================
const getFreeCreditsData = async (accountId) => {
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      throw new Error('AWS account not found');
    }
    
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const ce = new AWS.CostExplorer({
      accessKeyId,
      secretAccessKey,
      region: 'us-east-1'
    });
    
    // Get total spend from Cost Explorer (since account creation)
    const startDate = new Date(connection.createdAt).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    const costData = await ce.getCostAndUsage({
      TimePeriod: { Start: startDate, End: endDate },
      Granularity: 'MONTHLY',
      Metrics: ['UNBLENDED_COST']
    }).promise();
    
    // Sum all costs
    const totalSpend = costData.ResultsByTime.reduce((sum, month) => {
      return sum + parseFloat(month.Total?.UnblendedCost?.Amount || 0);
    }, 0);
    
    // Free Tier = $5000 for 12 months
    const freeCreditTotal = 5000;
    const freeCreditUsed = Math.min(totalSpend, freeCreditTotal);
    const freeCreditBalance = freeCreditTotal - freeCreditUsed;
    
    // Calculate expiry (12 months from account creation)
    const freeCreditExpiry = new Date(connection.createdAt);
    freeCreditExpiry.setFullYear(freeCreditExpiry.getFullYear() + 1);
    
    // Daily burn rate
    const daysSinceCreation = Math.max(1, Math.floor((new Date() - new Date(connection.createdAt)) / (1000 * 60 * 60 * 24)));
    const dailyBurnRate = totalSpend / daysSinceCreation;
    const daysRemaining = freeCreditBalance > 0 ? Math.ceil(freeCreditBalance / dailyBurnRate) : 0;
    
    return {
      freeCreditBalance,
      freeCreditTotal,
      freeCreditUsed,
      freeCreditExpiry: freeCreditExpiry.toISOString(),
      dailyBurnRate,
      daysRemaining
    };
  } catch (err) {
    console.error('Free credits calculation error:', err);
    // Return default values if calculation fails
    return {
      freeCreditBalance: 0,
      freeCreditTotal: 5000,
      freeCreditUsed: 0,
      freeCreditExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      dailyBurnRate: 0,
      daysRemaining: 0
    };
  }
};

const getCloudWatchMetricsWithCredits = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }

  let regularMetrics = {};
  try {
    // Simulate calling getCloudWatchMetrics and capture its result
    const mockRes = {
      json(data) {
        regularMetrics = data;
      },
      status(code) {
        if (code >= 400) {
          throw new Error('Failed to fetch base CloudWatch metrics');
        }
        return this;
      }
    };
    await getCloudWatchMetrics(req, mockRes);
  } catch (err) {
    console.warn('⚠️ Base CloudWatch metrics failed. Using fallback.');
    regularMetrics = {
      storage: { used: 0, total: 0, percent: 0, unit: 'GB' },
      cpu: { used: 0, total: 100, percent: 0, unit: '%' },
      memory: { used: 0, total: 0, percent: 0, unit: 'GB' },
      networkIn: 0,
      networkOut: 0
    };
  }

  let creditsData = {};
  try {
    creditsData = await getFreeCreditsData(accountId);
  } catch (err) {
    console.warn('⚠️ Free credits data failed. Using defaults.');
    creditsData = {
      freeCreditBalance: 0,
      freeCreditTotal: 5000,
      freeCreditUsed: 0,
      freeCreditExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      dailyBurnRate: 0,
      daysRemaining: 0
    };
  }

  // Fetch EC2 for CPU breakdown
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const ec2Data = await ec2.describeInstances({}).promise();

    const cpuBreakdown = [];
    ec2Data.Reservations?.forEach(r => {
      r.Instances?.forEach(i => {
        if (i.State.Name !== 'running') return;
        const name = i.Tags?.find(t => t.Key === 'Name')?.Value || i.InstanceId;
        const vCpus = getVCpuFromInstanceType(i.InstanceType);
        cpuBreakdown.push({
          name,
          type: 'EC2',
          used: vCpus,
          instanceId: i.InstanceId,
          instanceType: i.InstanceType
        });
      });
    });

    const enhancedMetrics = {
      ...regularMetrics,
      ...creditsData,
      cpu: {
        ...(regularMetrics.cpu || {}),
        breakdown: cpuBreakdown
      }
    };

    return res.json(enhancedMetrics);
  } catch (err) {
    console.error('❌ Final metrics composition error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to compose final metrics with credits',
      details: err.message
    });
  }
}

const getVCpuFromInstanceType = (instanceType) => {
  const mapping = {
    't2.micro': 1, 't2.small': 1, 't2.medium': 2, 't2.large': 2,
    'm5.large': 2, 'm5.xlarge': 4, 'm5.2xlarge': 8, 'm5.4xlarge': 16,
    'r5.large': 2, 'r5.xlarge': 4, 'c5.large': 2, 'c5.xlarge': 4,
  };
  return mapping[instanceType] || 2; 
};

// ========================
// EXPORTS
// ========================
export {
  validateAWSCredentials,
  connectToAWS,
  getAWSAccounts,
  removeAWSAccount,
  getVpcs,
  getEksClusters,
  getPricing,
  getInstanceTypes,
  getAmis,
  getKeyPairs,
  getAvailabilityZones,
  getAccountResources,
  updateAccount,
  getAwsMetrics,
  getAwsClustersForAccount,
  getAwsEc2Instances,
  getK8sResourcesForCluster,
  getS3Buckets,
  getLambdaFunctions,
  getLoadBalancers,
  getCostExplorerData,
  getCloudWatchMetrics,
  getEc2Metrics,
  getCloudWatchMetricsWithCredits // ✅ Export the new combined function
};
