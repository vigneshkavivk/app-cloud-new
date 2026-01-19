// src/controllers/azureTerraformController.js
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import AzureCredential from '../models/azureCredentialModel.js';
import { decrypt } from '../utils/encrypt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TERRAFORM_DIR = path.resolve(__dirname, '..', '..', '..', 'terraform-azure');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

// In-memory store for deployment statuses (use Redis in production)
const deployments = new Map();

await fsPromises.mkdir(LOGS_DIR, { recursive: true }).catch(console.error);

/**
 * Fetch and decrypt Azure credentials
 */
async function getAzureAccountById(id) {
  try {
    const credential = await AzureCredential.findById(id).lean();
    if (!credential) return null;

    let decryptedSecret = null;
    if (credential.clientSecret && typeof credential.clientSecret === 'object') {
      try {
        decryptedSecret = decrypt(credential.clientSecret);
      } catch (err) {
        console.error('Decryption failed:', err.message);
        return null;
      }
    }

    return {
      ...credential,
      clientSecret: decryptedSecret,
      _id: credential._id.toString(),
    };
  } catch (err) {
    console.error('DB error:', err);
    return null;
  }
}

/**
 * Safely quote a string for .tfvars (escape quotes)
 */
function quoteTfVar(value) {
  if (typeof value !== 'string') return JSON.stringify(value);
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * Write to terraform.tfvars (OVERWRITE entire file with new values)
 */
async function writeGlobalTfvars(moduleConfig, region, subscriptionId) {
  const tfvarsPath = path.join(TERRAFORM_DIR, 'terraform.tfvars');
  const lines = [];

  const azureRegionMap = {
    'us-east-1': 'eastus',
    'us-east-2': 'eastus2',
    'us-west-1': 'westus',
    'us-west-2': 'westus2',
    'eu-west-1': 'westeurope',
    'eu-central-1': 'germanywestcentral',
    'ap-south-1': 'centralindia',
    'ap-southeast-1': 'southeastasia',
    'ap-southeast-2': 'australiaeast',
  };
  const azureLocation = azureRegionMap[region] || region;

  if (azureLocation) {
    lines.push(`location = ${quoteTfVar(azureLocation)}`);
  }
  if (subscriptionId) {
    lines.push(`subscription_id = ${quoteTfVar(subscriptionId)}`);
  }

  // VNet config
  let vnetName = "default-vnet";
  if (moduleConfig?.vnet) {
    const vnet = moduleConfig.vnet;
    if (vnet.name && vnet.name.trim()) {
      vnetName = vnet.name.trim();
      lines.push(`vnet_name = ${quoteTfVar(vnetName)}`);
    }
    if (vnet.cidrBlock && vnet.cidrBlock.trim()) {
      lines.push(`vnet_address_space = ${quoteTfVar(vnet.cidrBlock.trim())}`);
    }
  }

  // Always set resource_group_name to avoid prompts
  const rgName = `${vnetName}-rg`;
  lines.push(`resource_group_name = ${quoteTfVar(rgName)}`);

  const moduleName = Object.keys(moduleConfig || {})[0];
  if (moduleName) {
    lines.push(`module_to_deploy = ${quoteTfVar(moduleName)}`);
  }

   if (moduleName === 'storage_account' && moduleConfig.storage_account) {
    const storageConfig = moduleConfig.storage_account;

    // Map UI values to Terraform variable names
    if (storageConfig.resourceName) {
      lines.push(`resource_name = ${quoteTfVar(storageConfig.resourceName)}`);
    }
    if (storageConfig.performance) {
      lines.push(`performance = ${quoteTfVar(storageConfig.performance)}`);
    }
    if (storageConfig.redundancy) {
      lines.push(`redundancy = ${quoteTfVar(storageConfig.redundancy)}`);
    }
    if (storageConfig.encryption) {
      lines.push(`encryption = ${quoteTfVar(storageConfig.encryption)}`);
    }
    if (storageConfig.accessControl) {
      lines.push(`access_control = ${quoteTfVar(storageConfig.accessControl)}`);
    }
  }
      // Handle AKS module
    if (moduleName === 'aks' && moduleConfig.aks) {
      const aks = moduleConfig.aks;

      if (aks.cluster_name) {
        lines.push(`cluster_name = ${quoteTfVar(aks.cluster_name)}`);
      }
      if (typeof aks.node_count === 'number') {
        lines.push(`node_count = ${aks.node_count}`);
      }
      if (aks.vnet_id) {
    lines.push(`vnet_id = ${quoteTfVar(aks.vnet_id)}`);
  }
  if (aks.subnet_ids && Array.isArray(aks.subnet_ids) && aks.subnet_ids.length >= 2) {
    lines.push(`subnet_ids = [${aks.subnet_ids.map(id => quoteTfVar(id)).join(', ')}]`);
      }
    }

  const content = lines.join('\n') + '\n';
  await fsPromises.writeFile(tfvarsPath, content, 'utf8');
  return tfvarsPath;
}

/**
 * Run Terraform command within a specific workspace
 */
async function runTerraformCommand(dir, cmd, env, deploymentId, workspace) {
  const logPath = path.join(LOGS_DIR, `${deploymentId}.log`);
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  return new Promise((resolve, reject) => {
    // Switch to workspace (create if needed)
    const setupCmd = `terraform workspace select ${workspace} || terraform workspace new ${workspace}`;
    const fullCmd = `${setupCmd} && ${cmd}`;

    const terraform = exec(fullCmd, { cwd: dir, env, maxBuffer: 1024 * 1024 * 10 });

    terraform.stdout.on('data', (data) => {
      logStream.write(data);
      console.log(`[Terraform][${deploymentId}] stdout:`, data.toString());
    });

    terraform.stderr.on('data', (data) => {
      logStream.write(data);
      console.error(`[Terraform][${deploymentId}] stderr:`, data.toString());
    });

    terraform.on('close', (code) => {
      logStream.end();
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Terraform failed with code ${code}`));
      }
    });

    terraform.on('error', (err) => {
      logStream.write(`Error: ${err.message}\n`);
      logStream.end();
      reject(err);
    });
  });
}

// 🔧 DEPLOY with isolated workspace
export const deploy = async (req, res) => {
  const { moduleConfig, region, account: accountId, modules } = req.body;
  const deploymentId = `az-${uuidv4().slice(0, 8)}`;

  if (!accountId || !region || !modules || modules.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required fields: account, region, or modules' });
  }

  deployments.set(deploymentId, { status: 'deploying', startedAt: new Date() });

  try {
    const account = await getAzureAccountById(accountId);
    if (!account) {
      deployments.set(deploymentId, { status: 'failed', error: 'Azure account not found', completedAt: new Date() });
      return res.status(404).json({ success: false, error: 'Azure account not found' });
    }

    const requiredFields = ['subscriptionId', 'tenantId', 'clientId', 'clientSecret'];
    for (const field of requiredFields) {
      if (!account[field]) {
        const errorMsg = `Missing ${field}`;
        deployments.set(deploymentId, { status: 'failed', error: errorMsg, completedAt: new Date() });
        return res.status(400).json({ success: false, error: errorMsg });
      }
    }
     
    const env = {
      ...process.env,
      ARM_SUBSCRIPTION_ID: account.subscriptionId,
      ARM_TENANT_ID: account.tenantId,
      ARM_CLIENT_ID: account.clientId,
      ARM_CLIENT_SECRET: account.clientSecret,
    };

    await writeGlobalTfvars(moduleConfig, region, account.subscriptionId);
    await runTerraformCommand(TERRAFORM_DIR, 'terraform init', env, deploymentId, deploymentId);
    await runTerraformCommand(TERRAFORM_DIR, 'terraform apply -auto-approve', env, deploymentId, deploymentId);

    deployments.set(deploymentId, { status: 'success', completedAt: new Date() });
    res.status(200).json({ success: true, deploymentId });

  } catch (error) {
    console.error('Deploy error:', error);
    deployments.set(deploymentId, { status: 'failed', error: error.message, completedAt: new Date() });
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🗑️ Destroy using workspace
// 🗑️ Destroy using workspace
async function _destroy(deploymentId, accountId, res) {
  if (!deploymentId || !accountId) {
    return res.status(400).json({ success: false, error: 'Missing deployment ID or account ID' });
  }

  try {
    const account = await getAzureAccountById(accountId);
    if (!account) {
      return res.status(404).json({ success: false, error: 'Azure account not found' });
    }

    const env = {
      ...process.env,
      ARM_SUBSCRIPTION_ID: account.subscriptionId,
      ARM_TENANT_ID: account.tenantId,
      ARM_CLIENT_ID: account.clientId,
      ARM_CLIENT_SECRET: account.clientSecret,
    };

    // Run the destroy command
    await runTerraformCommand(
      TERRAFORM_DIR,
      'terraform destroy -auto-approve',
      env,
      deploymentId,
      deploymentId // use same workspace
    );

    // ✅ UPDATE: Mark the deployment as 'destroyed' in the in-memory store
    deployments.set(deploymentId, {
      status: 'destroyed', // 👈 New status
      completedAt: new Date()
    });

    // Clean up logs
    await fsPromises.unlink(path.join(LOGS_DIR, `${deploymentId}.log`)).catch(() => {});

    return res.status(200).json({ success: true, message: 'Resources destroyed successfully' });
  } catch (error) {
    console.error('Destroy error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export const destroy = (req, res) => _destroy(req.body.deploymentId, req.body.account, res);
export const destroyResource = (req, res) => _destroy(req.body.deploymentId, req.body.account, res);
export const destroyDeployment = (req, res) => _destroy(req.body.deploymentId, req.body.account, res);

// 📜 Get logs
export const getLogs = async (req, res) => {
  const { deploymentId } = req.params;
  const logPath = path.join(LOGS_DIR, `${deploymentId}.log`);
  try {
    const logs = await fsPromises.readFile(logPath, 'utf8');
    res.send(logs);
  } catch {
    res.status(404).send('Logs not found');
  }
};

// 📊 Get deployment status
export const getDeploymentStatus = (req, res) => {
  const { deploymentId } = req.params;
  const status = deployments.get(deploymentId);

  if (!status) {
    return res.status(404).json({ success: false, error: 'Deployment not found' });
  }

  res.json({
    success: true,
    deploymentId,
    status: status.status,
    startedAt: status.startedAt,
    completedAt: status.completedAt,
    error: status.error
  });
};

// 📋 List all deployments (workspaces starting with az-)
// 📋 List all deployments (workspaces starting with az-)
export const listDeployments = async (req, res) => {
  try {
    // Get the first Azure account as a fallback
    const accounts = await AzureCredential.find().lean();
    // ✅ Declare the variable here
    const defaultAccountId = accounts.length > 0 ? accounts[0]._id.toString() : null;

    const { stdout } = await new Promise((resolve, reject) => {
      exec(`cd ${TERRAFORM_DIR} && terraform workspace list`, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout });
      });
    });

    const workspaces = stdout
      .split('\n')
      .map(line => line.trim().replace(/^\*/, '').trim())
      .filter(ws => ws.startsWith('az-'));

    const deploymentsList = workspaces.map(ws => {
      const status = deployments.get(ws) || { status: 'unknown', startedAt: null };
      return {
        id: ws,
        accountId: defaultAccountId, // 👈 Now it's defined
        status: status.status,
        startedAt: status.startedAt,
        completedAt: status.completedAt,
        error: status.error
      };
    });

    res.json({ success: true, deployments: deploymentsList });
  } catch (error) {
    console.error('List deployments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 📦 Stub
export const getResources = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Not implemented' });
};
