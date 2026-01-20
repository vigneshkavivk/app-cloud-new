// server/controllers/azureController.js
import mongoose from 'mongoose';
import AzureCredential from '../models/azureCredentialModel.js';
import { decrypt } from '../utils/encrypt.js';

// 👉 GET AKS CLUSTERS — WITHOUT COST
export const getAksClusters = async (req, res) => {
  try {
    // ✅ Accept from POST body (since frontend sends POST)
    const { accountId } = req.query;

    if (!accountId) {
      console.warn('Missing accountId in request body');
      return res.status(400).json([]); // or send error
    }

    const account = await AzureCredential.findById(accountId).lean();
    if (!account) {
      return res.json([]);
    }

    const { ClientSecretCredential } = await import('@azure/identity');
    const { ContainerServiceClient } = await import('@azure/arm-containerservice');

    const clientSecret = decrypt(account.clientSecret);
    if (!clientSecret) {
      console.error('Decryption failed for account:', account.accountName);
      return res.json([]);
    }

    const credential = new ClientSecretCredential(
      account.tenantId,
      account.clientId,
      clientSecret
    );

    const client = new ContainerServiceClient(credential, account.subscriptionId);

    const clusters = [];
    try {
      for await (const cluster of client.managedClusters.list()) {
        // ✅ ALWAYS determine real operational status using powerState
        let clusterStatus = 'unknown';
        if (cluster.powerState?.code) {
          clusterStatus = cluster.powerState.code.toLowerCase(); // "running", "stopped"
        } else if (cluster.provisioningState) {
          // Fallback for older API responses
          clusterStatus = cluster.provisioningState.toLowerCase(); // "succeeded", etc.
        }

        // ✅ Only show clusters that are RUNNING or SUCCEEDED (hide failed/deleting)
        if (clusterStatus === 'running' || clusterStatus === 'succeeded') {
          const addedToAppAt = account.createdAt 
            ? new Date(account.createdAt).toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }).replace(',', ' at')
            : "N/A";

          clusters.push({
            name: cluster.name,
            region: cluster.location,
            version: cluster.kubernetesVersion,
            liveNodeCount: cluster.agentPoolProfiles?.reduce((sum, p) => sum + (p.count || 0), 0) || 0,
            account: account.subscriptionId,
            accountName: account.accountName,
            addedToAppAt: addedToAppAt,
            status: clusterStatus,
            // ✅ ADD THIS LINE:
            resourceGroup: cluster.id.split('/')[4], // Extracts RG from Azure resource ID
          });
        }
      }
    } catch (err) {
      console.error('❌ Failed to list AKS clusters:', err.message);
      return res.json([]);
    }

    res.json(clusters);

  } catch (err) {
    console.error('❌ AKS controller error:', err.message);
    res.json([]);
  }
};

// �� 1. Validate Azure Credentials
export const validateAzureCredentials = async (req, res) => {
  const { clientId, clientSecret, tenantId, subscriptionId, region, accountName } = req.body;

  if (!clientId || !clientSecret || !tenantId || !subscriptionId || !region) {
    return res.status(400).json({
      valid: false,
      error: 'Missing required fields: clientId, clientSecret, tenantId, subscriptionId, region.',
    });
  }

  let ClientSecretCredential, ResourceManagementClient;
  try {
    const identity = await import('@azure/identity');
    const armResources = await import('@azure/arm-resources');
    ClientSecretCredential = identity.ClientSecretCredential;
    ResourceManagementClient = armResources.ResourceManagementClient;
  } catch (err) {
    const fallbackName = accountName || `Azure-${subscriptionId.slice(-6)}`;
    return res.json({
      valid: true,
      subscriptionName: fallbackName,
      message: '✅ Skipping SDK validation (not installed). Auto-fill name.',
    });
  }

  try {
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const resourceClient = new ResourceManagementClient(credential, subscriptionId);
    await resourceClient.resourceGroups.list();

    res.json({
      valid: true,
      subscriptionName: accountName || `Azure-${subscriptionId.slice(-6)}`,
      message: '✅ Azure credentials validated successfully.',
    });
  } catch (err) {
    console.error('Azure validation failed:', err);
    const errMsg = err.message || 'Invalid credentials or insufficient permissions.';
    res.status(400).json({
      valid: false,
      error: errMsg.includes('AuthenticationFailed')
        ? 'Authentication failed. Check Client ID, Client Secret, Tenant ID, and Subscription ID.'
        : errMsg,
    });
  }
};

// 👉 2. Connect Azure Account
export const connectAzure = async (req, res) => {
  const { clientId, clientSecret, tenantId, subscriptionId, region, accountName } = req.body;

  if (!clientId || !clientSecret || !tenantId || !subscriptionId || !region) {
    return res.status(400).json({ error: 'clientId, clientSecret, tenantId, subscriptionId, and region are required.' });
  }

  const cleanClientId = clientId.trim();
  const cleanTenantId = tenantId.trim();
  const cleanSubscriptionId = subscriptionId.trim();
  const cleanRegion = region.trim();
  const cleanAccountName = (accountName || `Azure-${cleanSubscriptionId.slice(-6)}`).trim();

  try {
    const existing = await AzureCredential.findOne({
      clientId: cleanClientId,
      tenantId: cleanTenantId,
      subscriptionId: cleanSubscriptionId,
    });

    if (existing) {
      return res.status(200).json({
        reused: true,
        message: `Azure account "${existing.accountName}" is already connected.`,
        accountId: existing._id,
      });
    }

    let detectedResourceGroup = 'cloudmasa-rg';
    try {
      const { ClientSecretCredential } = await import('@azure/identity');
      const { ContainerServiceClient } = await import('@azure/arm-containerservice');
      const credential = new ClientSecretCredential(cleanTenantId, cleanClientId, clientSecret);
      const client = new ContainerServiceClient(credential, cleanSubscriptionId);
      for await (const cluster of client.managedClusters.list()) {
        if (cluster.id) {
          detectedResourceGroup = cluster.id.split('/')[4];
          break;
        }
      }
    } catch (e) {
      console.warn('Could not auto-detect resource group, using default');
    }

    const newCred = new AzureCredential({
      cloudProvider: 'Azure',
      accountName: cleanAccountName,
      clientId: cleanClientId,
      clientSecret: encrypt(clientSecret),
      tenantId: cleanTenantId,
      subscriptionId: cleanSubscriptionId,
      region: cleanRegion,
      resourceGroup: detectedResourceGroup,
      createdBy: req.user?._id || new mongoose.Types.ObjectId('000000000000000000000000'),
    });

    await newCred.save();

    res.status(201).json({
      message: `✅ Azure account "${newCred.accountName}" connected successfully.`,
      accountId: newCred._id,
    });
  } catch (error) {
    console.error('Azure connect error:', error);
    res.status(500).json({
      error: 'Failed to save Azure credentials.',
      message: error.message,
    });
  }
};

// 👉 3. GET: Fetch all Azure accounts for current user
export const getAzureAccounts = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
    }

    const accounts = await AzureCredential.find(
      { createdBy: userId },
      {
        _id: 1,
        cloudProvider: 1,
        accountName: 1,
        subscriptionId: 1,
        tenantId: 1,
        region: 1,
        clientId: 1,
        isFavorite: 1, 
      }
    ).lean();

    const formatted = accounts.map((acc) => ({
      _id: acc._id.toString(),
      cloudProvider: acc.cloudProvider || 'Azure',
      accountName: acc.accountName || `Azure-${acc.subscriptionId?.slice(-6) || 'N/A'}`,
      subscriptionId: acc.subscriptionId || '',
      tenantId: acc.tenantId || '',
      region: acc.region || 'global',
      isFavorite: !!acc.isFavorite,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ Azure fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch Azure accounts.' });
  }
};

// 👉 4. Delete Azure Account
export const deleteAzureAccount = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid account ID.' });
    }

    const deleted = await AzureCredential.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Azure account not found.' });
    }

    res.json({ message: '✅ Azure account removed successfully.' });
  } catch (error) {
    console.error('Delete Azure account error:', error);
    res.status(500).json({ error: 'Failed to delete Azure account.' });
  }
};

// 👉 5. Validate Existing Azure Account
export const validateExistingAccount = async (req, res) => {
  const { accountId } = req.body;

  if (!accountId) {
    return res.status(400).json({ valid: false, error: 'accountId is required.' });
  }

  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    return res.status(400).json({ valid: false, error: 'Invalid accountId format.' });
  }

  try {
    const account = await AzureCredential.findById(accountId).lean();

    if (!account) {
      return res.status(404).json({ valid: false, error: 'Account not found.' });
    }

    res.json({
      valid: true,
      message: `✅ Account "${account.accountName}" is valid.`,
      accountId: account._id.toString(),
      accountName: account.accountName,
      subscriptionId: account.subscriptionId,
      tenantId: account.tenantId,
      region: account.region,
    });
  } catch (error) {
    console.error('Validate existing account error:', error);
    res.status(500).json({ valid: false, error: 'Failed to validate account.' });
  }
};

// 👉 GET SINGLE AKS CLUSTER BY NAME — WITHOUT COST
export const getAksClusterByName = async (req, res) => {
  try {
    const { name } = req.params;

    const account = await AzureCredential.findOne({ 
      createdBy: req.user?._id 
    });

    if (!account) {
      return res.status(404).json({ error: 'Azure account not found.' });
    }

    const { ClientSecretCredential } = await import('@azure/identity');
    const { ContainerServiceClient } = await import('@azure/arm-containerservice');
    const { ComputeManagementClient } = await import('@azure/arm-compute');

    const clientSecret = decrypt(account.clientSecret);
    const credential = new ClientSecretCredential(
      account.tenantId,
      account.clientId,
      clientSecret
    );

    const client = new ContainerServiceClient(credential, account.subscriptionId);

    let targetCluster = null;
    let actualResourceGroup = null;
    for await (const cluster of client.managedClusters.list()) {
      if (cluster.name === name) {
        targetCluster = cluster;
        actualResourceGroup = cluster.id.split('/')[4];
        break;
      }
    }

    if (!targetCluster || !actualResourceGroup) {
      return res.status(404).json({ error: 'Cluster not found.' });
    }

    // Node pools
    const nodePools = [];
    try {
      for await (const pool of client.agentPools.list(actualResourceGroup, name)) {
        nodePools.push(pool);
      }
    } catch (err) {
      console.warn('Failed to list node pools:', err.message);
    }

    const instanceType = nodePools[0]?.vmSize || 'Unknown';
    const totalNodes = nodePools.reduce((sum, p) => sum + (p.count || 0), 0);

    // vCPU & Memory
    let vcpu = 2, memoryGB = 8;
    try {
      const computeClient = new ComputeManagementClient(credential, account.subscriptionId);
      const skus = await computeClient.resourceSkus.list({
        filter: `name eq '${instanceType}' and location eq '${targetCluster.location}'`
      });
      const sku = skus.find(s => s.name === instanceType);
      if (sku?.capabilities) {
        vcpu = parseInt(sku.capabilities.find(c => c.name === 'vCPUs')?.value || '2', 10);
        memoryGB = parseFloat(sku.capabilities.find(c => c.name === 'MemoryGB')?.value || '8');
      }
    } catch (e) {
      console.warn('SKU fetch failed:', e.message);
    }

    // ✅ "Added to App" time
    const addedToAppAt = account.createdAt 
      ? new Date(account.createdAt).toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).replace(',', ' at')
      : "N/A";

    // Availability zones
    const availabilityZones = targetCluster.agentPoolProfiles?.flatMap(p => p.availabilityZones || []) || [];

    // ✅ Use powerState first, then provisioningState
    const clusterStatus = targetCluster.powerState?.code?.toLowerCase() || 
                          targetCluster.provisioningState?.toLowerCase() || 
                          'unknown';

    res.json({
      name: targetCluster.name,
      status: clusterStatus,
      clusterType: 'AKS',
      kubernetesVersion: targetCluster.kubernetesVersion,
      region: targetCluster.location,
      availabilityZones: availabilityZones.length > 0 ? availabilityZones.join(', ') : 'N/A',
      addedToAppAt: addedToAppAt,
      accountName: account.accountName,
      subscriptionId: account.subscriptionId,
      resourceGroup: actualResourceGroup,
      instanceType,
      totalNodes,
      totalVcpu: vcpu * totalNodes,
      totalMemory: `${memoryGB * totalNodes} GB`,
      billingAccount: account.subscriptionId
    });

  } catch (err) {
    console.error('❌ AKS cluster details error:', err.message);
    res.status(500).json({ error: 'Failed to fetch cluster details.' });
  }
};
// 👉 GET: List Virtual Networks for a subscription
export const listVnets = async (req, res) => {
  try {
    const { subscriptionId } = req.query;
    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId is required' });
    }

    // Find account by subscriptionId (like in connectAzure)
    const account = await AzureCredential.findOne({ subscriptionId }).lean();
    if (!account) {
      return res.status(404).json({ error: 'Azure account not found' });
    }

    const clientSecret = decrypt(account.clientSecret);
    if (!clientSecret) {
      return res.status(400).json({ error: 'Failed to decrypt credentials' });
    }

    const { ClientSecretCredential } = await import('@azure/identity');
    const { NetworkManagementClient } = await import('@azure/arm-network');

    const credential = new ClientSecretCredential(
      account.tenantId,
      account.clientId,
      clientSecret
    );

    const client = new NetworkManagementClient(credential, subscriptionId);
    const vnets = [];

    for await (const vnet of client.virtualNetworks.listAll()) {
      vnets.push({
        id: vnet.id,
        name: vnet.name,
        location: vnet.location,
        addressSpace: vnet.addressSpace?.addressPrefixes || []
      });
    }

    res.json(vnets);
  } catch (err) {
    console.error('❌ Failed to list VNets:', err.message);
    res.status(500).json({ error: 'Failed to fetch virtual networks' });
  }
};

// 👉 GET: List Subnets in a Virtual Network
export const listSubnets = async (req, res) => {
  try {
    const { vnetId } = req.query;
    if (!vnetId) {
      return res.status(400).json({ error: 'vnetId is required' });
    }

    // Parse subscriptionId and resource group from vnetId
    // Format: /subscriptions/SUBID/resourceGroups/RG/providers/.../virtualNetworks/VNET
    const match = vnetId.match(/\/subscriptions\/([^\/]+)\/resourceGroups\/([^\/]+)/i);
    if (!match) {
      return res.status(400).json({ error: 'Invalid vnetId format' });
    }

    const subscriptionId = match[1];
    const resourceGroupName = decodeURIComponent(match[2]);
    const vnetName = vnetId.split('/').pop();

    const account = await AzureCredential.findOne({ subscriptionId }).lean();
    if (!account) {
      return res.status(404).json({ error: 'Azure account not found' });
    }

    const clientSecret = decrypt(account.clientSecret);
    if (!clientSecret) {
      return res.status(400).json({ error: 'Failed to decrypt credentials' });
    }

    const { ClientSecretCredential } = await import('@azure/identity');
    const { NetworkManagementClient } = await import('@azure/arm-network');

    const credential = new ClientSecretCredential(
      account.tenantId,
      account.clientId,
      clientSecret
    );

    const client = new NetworkManagementClient(credential, subscriptionId);
    const subnets = [];

    for await (const subnet of client.subnets.list(resourceGroupName, vnetName)) {
      subnets.push({
        id: subnet.id,
        name: subnet.name,
        addressPrefix: subnet.addressPrefix
      });
    }

    res.json(subnets);
  } catch (err) {
    console.error('❌ Failed to list subnets:', err.message);
    res.status(500).json({ error: 'Failed to fetch subnets' });
  }
};

// �� NEW: Update Azure Account (e.g., toggle favorite)
export const updateAzureAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFavorite } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid account ID.' });
    }

    // Ensure user owns this account
    const account = await AzureCredential.findOne({
      _id: id,
      createdBy: req.user?._id
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found or access denied.' });
    }

    if (typeof isFavorite === 'boolean') {
      account.isFavorite = isFavorite;
      await account.save();
    }

    res.json({
      message: '✅ Account updated successfully.',
      isFavorite: account.isFavorite
    });

  } catch (error) {
    console.error('Update Azure account error:', error);
    res.status(500).json({ error: 'Failed to update account.' });
  }
};


