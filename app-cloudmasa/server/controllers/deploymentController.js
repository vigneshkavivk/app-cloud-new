// server\controllers\deploymentController.js

import { exec } from 'node:child_process';
import { access, readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { load as yamlLoad } from 'js-yaml';
import { promisify } from 'node:util';
import { decrypt } from '../utils/encryption.js';
import CloudConnection from '../models/CloudConnectionModel.js';
import AzureCredential from '../models/azureCredentialModel.js';
import Deployment from '../models/DeploymentModel.js';

const execAsync = promisify(exec);

// Whitelisted GitHub org
const ALLOWED_ORG = 'CloudMasa-Tech';

// 🔐 Validate GitHub repo URL
const isValidRepo = (url) => {
  try {
    const u = new URL(url);
    return u.hostname === 'github.com' && u.pathname.startsWith(`/${ALLOWED_ORG}/`);
  } catch {
    return false;
  }
};

// 🧹 Sanitize folder name
const sanitizeFolder = (folder) => {
  return folder.replace(/[^a-zA-Z0-9._/-]/g, '').substring(0, 100);
};

// 🏷️ Sanitize Kubernetes label
const sanitizeK8sLabel = (value) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .substring(0, 63)
    .replace(/--+/g, '-');
};

// 🛡️ Sanitize Kubernetes name
const sanitizeK8sName = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
};

// Utility: shell escape
const shEscape = (str) => `'${String(str).replace(/'/g, "'\"'\"'")}'`;

// === Existing GET endpoints (unchanged) ===
export const getLatestDeployment = async (req, res) => {
  const { toolName } = req.query;
  if (!toolName) return res.status(400).json({ error: 'toolName query param required' });
  try {
    const deployment = await Deployment.findOne({ selectedTool: toolName })
      .sort({ createdAt: -1 })
      .select('selectedCluster namespace selectedAccount repoUrl')
      .lean();
    if (!deployment) return res.status(404).json({ error: 'No deployment found' });
    return res.json(deployment);
  } catch (err) {
    console.error('[getLatestDeployment] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch deployment record' });
  }
};

export const getDeploymentCount = async (req, res) => {
  try {
    const count = await Deployment.countDocuments({});
    return res.status(200).json({ count });
  } catch (err) {
    console.error('[getDeploymentCount] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch deployment count' });
  }
};

export const getDeployedInstances = async (req, res) => {
  const { toolName } = req.query;
  if (!toolName) return res.status(400).json({ error: 'toolName query param required' });
  try {
    const instances = await Deployment.find({ selectedTool: toolName }).sort({ createdAt: -1 }).lean();
    const enriched = await Promise.all(
      instances.map(async (inst) => {
        let accountName = 'Unknown';
        if (inst.selectedAccount && inst.selectedAccount._id) {
          try {
            const acc = await CloudConnection.findById(inst.selectedAccount._id);
            if (acc) {
              accountName = acc.accountName?.trim() || acc.accountId || 'Unknown';
            }
          } catch (e) {
            console.warn('Failed to fetch account for deployment:', inst._id, e.message);
          }
        }
        return { ...inst, accountName };
      })
    );
    return res.json({ toolName, instances: enriched });
  } catch (err) {
    console.error('[getDeployedInstances] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch deployment instances' });
  }
};

// 📦 Create or Update Argo CD Application (Multi-Cloud GitOps)
export const updateArgoCDApplication = async (req, res) => {
  const {
    cloudProvider,
    accountId,
    selectedCluster,
    namespace,
    repoUrl,
    selectedFolder,
    selectedTool,
    gitHubToken,
    isUpdateMode
  } = req.body;

  // === Validations ===
  if (!cloudProvider || !['aws', 'azure', 'gcp'].includes(cloudProvider)) {
    return res.status(400).json({ error: 'Valid cloudProvider (aws/azure/gcp) is required' });
  }
  if (!accountId) {
    return res.status(400).json({ error: 'Cloud account ID is required' });
  }
  if (!selectedCluster || typeof selectedCluster !== 'string') {
    return res.status(400).json({ error: 'Valid cluster name is required' });
  }
  if (!namespace || namespace.length === 0 || namespace.length > 63) {
    return res.status(400).json({ error: 'Namespace must be 1–63 characters' });
  }
  if (!repoUrl || !isValidRepo(repoUrl)) {
    return res.status(400).json({ error: `Repository must belong to ${ALLOWED_ORG} on GitHub` });
  }
  if (!selectedFolder) {
    return res.status(400).json({ error: 'Folder path is required' });
  }
  if (!gitHubToken) {
    return res.status(400).json({ error: 'GitHub token is required' });
  }
  if (!selectedCluster || typeof selectedCluster !== 'string') {
  return res.status(400).json({ error: 'Valid cluster name is required' });
}

  const cleanFolder = sanitizeFolder(selectedFolder);
  const appName = sanitizeK8sName(`${namespace}-${selectedTool}`);
  const timestamp = Date.now();
  const tempDir = join(process.cwd(), 'temp');
  const tempKubeconfig = join(tempDir, `kubeconfig-${selectedCluster}-${timestamp}.yaml`);
  const tempManifest = join(tempDir, `${appName}.yaml`);
  let savedDeployment;

  try {
    await mkdir(tempDir, { recursive: true });

    // === 🔐 Fetch cloud account ===
    let dbAccount;
    if (cloudProvider === 'azure') {
      dbAccount = await AzureCredential.findById(accountId);
      if (!dbAccount) {
        return res.status(404).json({ error: 'Azure account not found' });
      }
    } else {
      dbAccount = await CloudConnection.findById(accountId);
      if (!dbAccount) {
        return res.status(404).json({ error: `${cloudProvider.toUpperCase()} account not found` });
      }
    }

    let env = { ...process.env };
    let kubeconfigCmd = '';

    // === 🌐 Generate kubeconfig based on provider ===
    if (cloudProvider === 'aws') {
      const awsAccessKeyId = decrypt(dbAccount.awsAccessKey);
      const awsSecretAccessKey = decrypt(dbAccount.awsSecretKey);
      const awsRegion = dbAccount.awsRegion;
      if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion) {
        return res.status(400).json({ error: 'AWS credentials missing' });
      }
      env.AWS_ACCESS_KEY_ID = awsAccessKeyId;
      env.AWS_SECRET_ACCESS_KEY = awsSecretAccessKey;
      env.AWS_DEFAULT_REGION = awsRegion;

      const describeCmd = `aws eks describe-cluster --name ${shEscape(selectedCluster)} --region ${shEscape(awsRegion)} --query 'cluster.status' --output text`;
      const { stdout: status } = await execAsync(describeCmd, { timeout: 10_000, env });
      if (status.trim() !== 'ACTIVE') {
        return res.status(400).json({ error: `Cluster "${selectedCluster}" is not ACTIVE` });
      }

      kubeconfigCmd = `aws eks update-kubeconfig --name ${shEscape(selectedCluster)} --region ${shEscape(awsRegion)} --kubeconfig ${shEscape(tempKubeconfig)}`;
    } else if (cloudProvider === 'azure') {
  const tenantId = dbAccount.tenantId;
  const clientId = dbAccount.clientId;
  const clientSecret = dbAccount.decryptedClientSecret;
  const subscriptionId = dbAccount.subscriptionId;

  // ✅ Use resourceGroup from frontend, fallback to DB if missing
  let resourceGroup = req.body.resourceGroup;
  if (!resourceGroup) {
    resourceGroup = dbAccount.resourceGroup || 'cloudmasa-rg';
  }

  if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
    return res.status(400).json({ error: 'Azure credentials missing' });
  }

  // ✅ STEP 1: Login with service principal
  const loginCmd = `az login --service-principal -u ${shEscape(clientId)} -p ${shEscape(clientSecret)} -t ${shEscape(tenantId)}`;
  await execAsync(loginCmd, { timeout: 10_000, env });

  // ✅ STEP 2: Set subscription explicitly
  const setSubCmd = `az account set --subscription ${shEscape(subscriptionId)}`;
  await execAsync(setSubCmd, { timeout: 5_000, env });

  // ✅ STEP 3: Now get kubeconfig
  kubeconfigCmd = `az aks get-credentials --name ${shEscape(selectedCluster)} --resource-group ${shEscape(resourceGroup)} --subscription ${shEscape(subscriptionId)} --file ${shEscape(tempKubeconfig)} --overwrite-existing`;
} else if (cloudProvider === 'gcp') {
      const serviceAccountKey = decrypt(dbAccount.serviceAccountKey);
      const projectId = dbAccount.projectId;
      const location = dbAccount.location || 'us-central1';
      if (!serviceAccountKey || !projectId) {
        return res.status(400).json({ error: 'GCP credentials missing' });
      }
      const gcpKeyPath = join(tempDir, `gcp-key-${timestamp}.json`);
      await writeFile(gcpKeyPath, serviceAccountKey, 'utf8');
      env.GOOGLE_APPLICATION_CREDENTIALS = gcpKeyPath;

      kubeconfigCmd = `gcloud container clusters get-credentials ${selectedCluster} --project ${projectId} --zone ${location} --kubeconfig ${shEscape(tempKubeconfig)}`;
    }

    // === 📥 Generate kubeconfig ===
    await execAsync(kubeconfigCmd, { timeout: 20_000, env });

    // === 🔍 CHECK ARGO CD CRD IS INSTALLED ===
    const checkCrdCmd = `KUBECONFIG=${shEscape(tempKubeconfig)} kubectl get crd applications.argoproj.io`;
    try {
      await execAsync(checkCrdCmd, { timeout: 5000, env });
    } catch (crdErr) {
      return res.status(400).json({
        error: 'Argo CD CRD not installed in cluster',
        suggestion: 'Run: kubectl apply -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/crds/application-crd.yaml'
      });
    }

    // === 👤 Get GitHub username ===
    let gitHubUsername = 'x-access-token';
    try {
      const ghUserRes = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${gitHubToken}`, 'User-Agent': 'CloudMasa-Deployer' },
        signal: AbortSignal.timeout(5000)
      });
      if (ghUserRes.ok) {
        const userData = await ghUserRes.json();
        gitHubUsername = userData.login || 'x-access-token';
      }
    } catch (e) {
      console.warn('[GitHub] Using fallback username');
    }

    // === 📥 Save deployment metadata ===
    try {
      const deploymentDoc = new Deployment({
        selectedTool,
        selectedCluster,
        namespace,
        repoUrl,
        selectedFolder: cleanFolder,
        cloudProvider,
        gitHubUsername,
        // ✅ Save resourceGroup for Azure
        ...(cloudProvider === 'azure' && { resourceGroup: req.body.resourceGroup || dbAccount.resourceGroup || 'cloudmasa-rg' }),
        selectedAccount: {
          _id: dbAccount._id,
          accountId: cloudProvider === 'aws' ? dbAccount.accountId :
                    cloudProvider === 'azure' ? dbAccount.subscriptionId :
                    dbAccount.projectId,
          name: dbAccount.accountName || 'N/A'
        },
        selectedToken: {
          type: 'github-pat',
          masked: gitHubToken ? `${gitHubToken.substring(0, 4)}****${gitHubToken.slice(-4)}` : null
        }
      });
      savedDeployment = await deploymentDoc.save();
    } catch (dbErr) {
      console.error('[DB] Failed to save deployment:', dbErr.message);
    }

    // === 🔑 Create GitHub secret in argocd namespace ===
    const secretName = `github-token-${Buffer.from(repoUrl).toString('base64').substring(0, 16).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
    const secretManifest = `apiVersion: v1
kind: Secret
metadata:
  name: ${secretName}
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  url: ${repoUrl.trim()}
  password: ${gitHubToken}
  username: ${gitHubUsername}
`;
    const tempSecret = join(tempDir, `secret.yaml`);
    await writeFile(tempSecret, secretManifest, 'utf8');
    const applySecretCmd = `KUBECONFIG=${shEscape(tempKubeconfig)} kubectl apply -f ${shEscape(tempSecret)}`;
    await execAsync(applySecretCmd, { timeout: 10_000, env });

    // === 📄 Create Argo CD application manifest ===
    const manifest = `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${appName}
  namespace: argocd
  labels:
    tool: ${sanitizeK8sLabel(selectedTool)}
    cluster: ${selectedCluster}
    cloudProvider: ${cloudProvider}
    accountId: "${dbAccount._id}"
spec:
  project: default
  source:
    repoURL: ${repoUrl.trim()}
    targetRevision: HEAD
    path: ${cleanFolder}
  destination:
    server: https://kubernetes.default.svc
    namespace: ${namespace}
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
`;

    yamlLoad(manifest); // validate
    await writeFile(tempManifest, manifest, 'utf8');

    // === 🚀 Apply to cluster ===
    const applyCmd = `KUBECONFIG=${shEscape(tempKubeconfig)} kubectl apply -f ${shEscape(tempManifest)}`;
    await execAsync(applyCmd, { timeout: 45_000, env });

    if (savedDeployment) {
      savedDeployment.status = 'deployed';
      savedDeployment.argoAppName = appName;
      await savedDeployment.save();
    }

    // === 🔄 Optional sync ===
    try {
      await execAsync(`KUBECONFIG=${shEscape(tempKubeconfig)} kubectl argo app sync ${shEscape(appName)} -n argocd`, { timeout: 30_000, env });
    } catch (syncErr) {
      console.warn('[Sync] Non-fatal error:', syncErr.message);
    }

    return res.status(200).json({
      message: `Argo CD app "${appName}" deploying to ${cloudProvider.toUpperCase()} cluster "${selectedCluster}" in namespace "${namespace}".`,
      appName,
      cloudProvider,
      cluster: selectedCluster,
      namespace,
      deploymentId: savedDeployment?._id
    });

  } catch (err) {
    console.error(`[${cloudProvider.toUpperCase()} Deploy] Error:`, {
      cluster: selectedCluster,
      error: err.message,
      stderr: err.stderr?.toString(),
      stdout: err.stdout?.toString()
    });

    if (savedDeployment) {
      savedDeployment.status = 'failed';
      savedDeployment.errorMessage = err.message;
      await savedDeployment.save().catch(e => console.error('[DB] Save failed:', e));
    }

    let errorMsg = 'Deployment failed';
    if (err.message?.includes?.('timeout')) {
      errorMsg = 'Deployment timed out';
    } else if (err.stderr?.includes?.('credentials')) {
      errorMsg = 'Cloud credentials invalid or missing';
    } else if (err.stderr?.includes?.('not found')) {
      errorMsg = `Cluster "${selectedCluster}" not found`;
    }
    return res.status(500).json({
      error: errorMsg,
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    // 🧹 Cleanup
    await unlink(tempKubeconfig).catch(() => {});
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      await unlink(process.env.GOOGLE_APPLICATION_CREDENTIALS).catch(() => {});
    }
    await unlink(join(tempDir, 'secret.yaml')).catch(() => {});
    await unlink(tempManifest).catch(() => {});
  }
};

// 🗑️ DELETE /deploy/:toolName — supports ?deploymentId=... + deletes namespace (Multi-Cloud)
export const deleteArgoCDApplication = async (req, res) => {
  const { toolName } = req.params;
  const { deploymentId } = req.query;

  if (!toolName) {
    return res.status(400).json({ error: 'toolName is required' });
  }

  try {
    let deployment;
    if (deploymentId) {
      deployment = await Deployment.findById(deploymentId);
      if (!deployment) return res.status(404).json({ error: 'Deployment not found' });
      if (deployment.selectedTool !== toolName) return res.status(400).json({ error: 'Tool mismatch' });
    } else {
      deployment = await Deployment.findOne({ selectedTool: toolName }).sort({ createdAt: -1 }).lean();
      if (!deployment) return res.status(404).json({ error: 'No deployment found' });
    }

    const { selectedCluster, namespace, argoAppName, selectedAccount } = deployment;

// 💡 Auto-detect or use existing cloudProvider
let cloudProvider = deployment.cloudProvider;

// If missing, infer it
if (!cloudProvider) {
  const accountId = String(deployment.selectedAccount?._id);
  const isAzure = await AzureCredential.exists({ _id: accountId });
  cloudProvider = isAzure ? 'azure' : 'aws'; // Default to AWS

  console.log(`[Auto-Detect] Set cloudProvider = "${cloudProvider}" for deployment ${deployment._id}`);
  
  // 🔁 Optional: Backfill in DB so future calls are faster
  await Deployment.updateOne({ _id: deployment._id }, { $set: { cloudProvider } });
}
    if (!argoAppName) return res.status(400).json({ error: 'Argo CD app name missing' });

    // 🔐 Fetch cloud account based on provider
    let dbAccount;
    const provider = cloudProvider?.toLowerCase(); // Safely handle undefined

    if (!provider || !['aws', 'azure', 'gcp'].includes(provider)) {
      return res.status(400).json({ error: 'Deployment missing valid cloudProvider (aws/azure/gcp)' });
    }

    if (provider === 'azure') {
      dbAccount = await AzureCredential.findById(selectedAccount?._id);
      if (!dbAccount) return res.status(404).json({ error: 'Azure account not found' });
    } else {
      dbAccount = await CloudConnection.findById(selectedAccount?._id);
      if (!dbAccount) return res.status(404).json({ error: `${provider.toUpperCase()} account not found` });
    }

    const timestamp = Date.now();
    const tempDir = join(process.cwd(), 'temp');
    const tempKubeconfig = join(tempDir, `kubeconfig-${selectedCluster}-${timestamp}.yaml`);
    await mkdir(tempDir, { recursive: true });

    const shEscape = (str) => `'${String(str).replace(/'/g, "'\"'\"'")}'`;

    let env = { ...process.env };

    // 🌐 Generate kubeconfig based on provider
    let kubeconfigCmd = '';
    if (cloudProvider === 'aws') {
      const awsAccessKeyId = decrypt(dbAccount.awsAccessKey);
      const awsSecretAccessKey = decrypt(dbAccount.awsSecretKey);
      const awsRegion = dbAccount.awsRegion;
      if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion) {
        return res.status(400).json({ error: 'AWS credentials missing' });
      }
      env.AWS_ACCESS_KEY_ID = awsAccessKeyId;
      env.AWS_SECRET_ACCESS_KEY = awsSecretAccessKey;
      env.AWS_DEFAULT_REGION = awsRegion;
      kubeconfigCmd = `aws eks update-kubeconfig --name ${shEscape(selectedCluster)} --region ${shEscape(awsRegion)} --kubeconfig ${shEscape(tempKubeconfig)}`;
    } else if (cloudProvider === 'azure') {
      const tenantId = dbAccount.tenantId;
      const clientId = dbAccount.clientId;
      const clientSecret = dbAccount.decryptedClientSecret;
      const subscriptionId = dbAccount.subscriptionId;
      const resourceGroup = deployment.resourceGroup || dbAccount.resourceGroup || 'cloudmasa-rg';
      
      if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
        return res.status(400).json({ error: 'Azure credentials missing' });
      }

      // Login & set subscription
      const loginCmd = `az login --service-principal -u ${shEscape(clientId)} -p ${shEscape(clientSecret)} -t ${shEscape(tenantId)}`;
      await execAsync(loginCmd, { timeout: 10_000, env });
      const setSubCmd = `az account set --subscription ${shEscape(subscriptionId)}`;
      await execAsync(setSubCmd, { timeout: 5_000, env });

      kubeconfigCmd = `az aks get-credentials --name ${shEscape(selectedCluster)} --resource-group ${shEscape(resourceGroup)} --subscription ${shEscape(subscriptionId)} --file ${shEscape(tempKubeconfig)} --overwrite-existing`;
    } else if (cloudProvider === 'gcp') {
      const serviceAccountKey = decrypt(dbAccount.serviceAccountKey);
      const projectId = dbAccount.projectId;
      const location = dbAccount.location || 'us-central1';
      if (!serviceAccountKey || !projectId) {
        return res.status(400).json({ error: 'GCP credentials missing' });
      }
      const gcpKeyPath = join(tempDir, `gcp-key-${timestamp}.json`);
      await writeFile(gcpKeyPath, serviceAccountKey, 'utf8');
      env.GOOGLE_APPLICATION_CREDENTIALS = gcpKeyPath;
      kubeconfigCmd = `gcloud container clusters get-credentials ${selectedCluster} --project ${projectId} --zone ${location} --kubeconfig ${shEscape(tempKubeconfig)}`;
    } else {
      return res.status(400).json({ error: 'Unsupported cloud provider' });
    }

    // 📥 Generate kubeconfig
    await execAsync(kubeconfigCmd, { timeout: 20_000, env });

    // 🗑️ 1. Delete Argo CD Application CR
    await execAsync(
      `KUBECONFIG=${shEscape(tempKubeconfig)} kubectl delete application ${shEscape(argoAppName)} -n argocd --ignore-not-found`,
      { timeout: 20_000, env }
    );

    // 🗑️ 2. ✅ DELETE NAMESPACE (CRITICAL FIX)
    if (namespace && !['default', 'kube-system', 'argocd'].includes(namespace)) {
      console.log(`[NS] Deleting namespace: ${namespace}`);
      try {
        await execAsync(
          `KUBECONFIG=${shEscape(tempKubeconfig)} kubectl delete namespace ${shEscape(namespace)} --ignore-not-found`,
          { timeout: 30_000, env }
        );
        console.log(`[NS] ✅ Namespace "${namespace}" deleted.`);
      } catch (nsErr) {
        console.warn(`[NS] Warning: Failed to delete namespace "${namespace}":`, nsErr.message);
        // Proceed anyway (e.g., namespace may be stuck in Terminating)
      }
    }

    // 🧹 3. Delete deployment record
    await Deployment.findByIdAndDelete(deployment._id);

    // 🧹 Cleanup
    await unlink(tempKubeconfig).catch(() => {});
    if (env.GOOGLE_APPLICATION_CREDENTIALS) {
      await unlink(env.GOOGLE_APPLICATION_CREDENTIALS).catch(() => {});
    }

    return res.status(200).json({
      message: `✅ ${toolName} and namespace "${namespace}" deleted.`,
      tool: toolName,
      deploymentId: deployment._id,
      cluster: selectedCluster,
      namespace,
      cloudProvider
    });

  } catch (err) {
    console.error('[deleteArgoCDApplication] Error:', err);
    return res.status(500).json({
      error: 'Failed to delete tool and namespace',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// === Remaining GET endpoints (unchanged) ===
export const getArgoCDStatus = async (req, res) => {
  const { appName, cluster } = req.query;
  if (!appName || !cluster) return res.status(400).json({ error: 'appName and cluster query params required' });
  return res.json({ status: 'Healthy', message: 'Application is synced.', syncStatus: 'Synced', healthStatus: 'Healthy' });
};

export const getAllDeployments = async (req, res) => {
  try {
    const deployments = await Deployment.find({}).sort({ createdAt: -1 }).lean();
    const enrichedDeployments = await Promise.all(
      deployments.map(async (dep) => {
        let accountName = 'Unknown';
        try {
          const acc = await CloudConnection.findById(dep.selectedAccount._id);
          accountName = acc?.accountName?.trim() || acc?.accountId || 'Unknown';
        } catch (e) {
          accountName = dep.selectedAccount.name || dep.selectedAccount.accountId || 'Unknown';
        }
        return { ...dep, accountName };
      })
    );
    return res.status(200).json(enrichedDeployments);
  } catch (err) {
    console.error('[getAllDeployments] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch deployments' });
  }
};

// ❌ DEPRECATED — Use CloudConnection instead
export const getClusters = async (req, res) => {
  return res.status(400).json({ error: 'Use account-based cluster listing instead' });
};
