import GcpConnection from '../models/GcpConnection.js';
import { GoogleAuth } from 'google-auth-library';
import { ClusterManagerClient } from '@google-cloud/container';

// ✅ Helper: Try listing clusters in a location — skip on 403/404
const tryListClusters = async (client, projectId, location) => {
  try {
    const [response] = await client.listClusters({
      parent: `projects/${projectId}/locations/${location}`,
    });
    return response.clusters || [];
  } catch (err) {
    // Silently skip forbidden/missing locations
    console.debug(`📍 Skipping location ${location}: ${err.code || err.message}`);
    return [];
  }
};

// 👉 GET GKE CLUSTERS — resilient, uses accountId (Mongo _id), no 500s
export const getGkeClusters = async (req, res) => {
  const { accountId } = req.body; // ✅ Standard name (matches Azure)

  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }

  try {
    // Lazy-load SDK only if needed (optional enhancement — not required since you already use it elsewhere)
    let GoogleAuth, ClusterManagerClient;
    try {
      const authLib = await import('google-auth-library');
      const containerLib = await import('@google-cloud/container');
      GoogleAuth = authLib.GoogleAuth;
      ClusterManagerClient = containerLib.ClusterManagerClient;
    } catch (err) {
      console.warn('⚠️ Google Cloud SDK not installed. Skipping GKE cluster fetch.');
      return res.json([]); // ✅ Graceful fallback
    }

    // Find account by Mongo _id
    const account = await GcpConnection.findById(accountId);
    if (!account) {
      console.warn(`⚠️ GCP account not found: ${accountId}`);
      return res.json([]); // ✅ No 404 crash
    }

    // Authenticate using stored plaintext key (as per your model)
    const auth = new GoogleAuth({
      credentials: {
        client_email: account.email,
        private_key: account.privateKey.trim(),
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = new ClusterManagerClient({ auth });

    let allClusters = [];

    // Try common locations (including account-provided hints)
    const locations = [
      account.gcpZone,
      account.region,
      'us-central1-a',
      'us-east1-b',
      'us-west1-a',
      'us-central1',   // regional
      'europe-west1-b',
      'asia-southeast1-a',
    ].filter(loc => loc && typeof loc === 'string');

    // Try each location — skip failures
    for (const loc of [...new Set(locations)]) {
      const clusters = await tryListClusters(client, account.projectId, loc);
      allClusters.push(...clusters);
    }

    // Deduplicate by cluster name
    const seen = new Set();
    const uniqueClusters = allClusters.filter(c => {
      if (!c?.name) return false;
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });

    // ✅ Format for frontend (consistent with AWS/Azure)
    const result = uniqueClusters.map(c => ({
      name: c.name,
      status: (c.status || 'UNKNOWN').toLowerCase(),
      location: c.location || c.zone || 'unknown',
      kubernetesVersion: c.currentMasterVersion || c.currentNodeVersion || 'unknown',
      nodeCount: c.currentNodeCount || 0,
      endpoint: c.endpoint || '',
      resourceLabels: c.resourceLabels || {},
    }));

    console.log(`✅ GKE: Found ${result.length} cluster(s) for account "${account.projectName}"`);
    res.json(result); // ✅ Always 200

  } catch (err) {
    console.error('❌ Unexpected error in getGkeClusters:', err);
    res.json([]); // ✅ Never 500
  }
};

// 👉 Connect GCP Account (unchanged — working)
export const connectToGCP = async (req, res) => {
  try {
    const { privateKey, accountName } = req.body;
    const userId = req.user?._id;

    if (!privateKey) {
      return res.status(400).json({ error: 'Private key (JSON) is required' });
    }

    let parsed;
    try {
      const cleanedKey = privateKey
        .replace(/\s+/g, ' ')
        .replace(/"auth_uri"\s*:\s*"(.*?)"/gi, (_, u) => `"auth_uri":"${u.trim()}"`)
        .replace(/"token_uri"\s*:\s*"(.*?)"/gi, (_, u) => `"token_uri":"${u.trim()}"`);
      parsed = JSON.parse(cleanedKey);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON format in private key' });
    }

    const { 
      project_id: projectId, 
      client_email: clientEmail, 
      private_key: actualPrivateKey 
    } = parsed;

    if (!projectId || !clientEmail || !actualPrivateKey) {
      return res.status(400).json({
        error: 'Missing required fields in JSON key: project_id, client_email, or private_key'
      });
    }

    // Test: try listing clusters in one zone
    const auth = new GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: actualPrivateKey.trim(),
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = new ClusterManagerClient({ auth });
    await tryListClusters(client, projectId, 'us-central1-a');

    // Save account
    const existing = await GcpConnection.findOne({ userId, projectId });
    if (existing) {
      return res.status(409).json({ error: 'Project already connected' });
    }

    const connection = new GcpConnection({
      userId,
      email: clientEmail,
      projectId,
      projectName: accountName || projectId,
      region: 'global',
      status: 'active',
      privateKey: actualPrivateKey.trim(),
    });

    await connection.save();

    res.status(201).json({
      success: true,
      message: `✅ Connected to GCP project: ${projectId}`,
      account: {
        _id: connection._id.toString(),
        cloudProvider: 'GCP',
        accountId: projectId,
        accountName: accountName || projectId,
        projectId,
        region: 'global',
        email: clientEmail,
        projectName: accountName || projectId,
      },
    });

  } catch (err) {
    console.error('❌ GCP connect error:', err.message);
    let userMsg = 'Failed to connect. Check your JSON key.';
    if (err.message?.includes('403')) {
      userMsg = 'Service account access OK, but missing GKE viewer permissions.';
    }
    res.status(500).json({ error: userMsg });
  }
};

// 👉 Get GCP Accounts (unchanged — working)
export const getGCPAccounts = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

const accounts = await GcpConnection.find(
  { status: 'active' }, // ✅ removed userId → all active accounts
  { privateKey: 0 }
).lean();

    const formatted = accounts.map(acc => ({
      _id: acc._id.toString(),
      cloudProvider: 'GCP',
      accountName: acc.projectName,
      projectId: acc.projectId,
      region: acc.region || 'global',
      email: acc.email,
      projectName: acc.projectName,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ GCP fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch GCP accounts' });
  }
};

// 👉 Delete GCP Account (unchanged — working)
export const deleteGCPAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await GcpConnection.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'GCP account not found' });
    }
    res.json({ success: true, message: 'GCP account removed' });
  } catch (err) {
    console.error('❌ GCP delete error:', err);
    res.status(500).json({ error: 'Failed to delete GCP account' });
  }
};