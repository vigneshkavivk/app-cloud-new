    // server/controllers/gcpterraformController.js
    import { exec } from 'child_process';
    import path from 'path';
    import fs from 'fs/promises';
    import { fileURLToPath } from 'url';
    import { promisify } from 'util';
    import GcpConnection from '../models/GcpConnection.js';
    import DeploymentRecord from '../models/DeploymentRecord.js';
    import Resource from '../models/ResourceModel.js';

    const execAsync = promisify(exec);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // ✅ DYNAMIC MODULES PATH — project-relative, cross-platform
    const MODULES_BASE_PATH = path.resolve(__dirname, '../../../terraform-gcp/modules');

    // ✅ GCP region allowlist — prevent 'global' and invalid regions
    const VALID_GCP_REGIONS = new Set([
    'us-central1', 'us-east1', 'us-east4', 'us-west1', 'us-west2', 'us-west4',
    'northamerica-northeast1', 'southamerica-east1',
    'europe-west1', 'europe-west2', 'europe-west3', 'europe-west4', 'europe-west6',
    'europe-central2', 'europe-north1',
    'asia-east1', 'asia-east2', 'asia-northeast1', 'asia-northeast2', 'asia-northeast3',
    'asia-southeast1', 'asia-southeast2', 'asia-south1', 'asia-south2',
    'australia-southeast1', 'australia-southeast2'
    ]);

    // ===== BUILD SERVICE ACCOUNT KEY JSON DYNAMICALLY =====
    function buildServiceAccountKey({ projectId, email, privateKey }) {
    return JSON.stringify({
        type: "service_account",
        project_id: projectId,
        private_key_id: "auto-generated-by-cloudmasa",
        private_key: privateKey.trim(),
        client_email: email,
        client_id: "123456789012345678901",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(email)}`
    }, null, 2);
    }

    // ===== TERRAFORM CODE GENERATOR =====
    function generateGcpTerraformCode(payload, projectId, region) {
    const { modules, moduleConfig } = payload;
    let code = '';

    code += `terraform {
    backend "local" {
        path = "terraform.tfstate"
    }
    }

    provider "google" {
    project = "${projectId}"
    region  = "${region}"
    }

    provider "google" {
    alias   = "iam"
    project = "${projectId}"
    region  = "${region}"
    }
    `;

    for (const moduleId of modules) {
        const config = { ...moduleConfig[moduleId] } || {};

        // ✅ Normalize common field aliases
        if (moduleId === 'vpc') {
        config.networkName = config.networkName || config.name || 'my-vpc';
        config.cidrBlock = config.cidrBlock || config.cidr_block || '10.0.0.0/16';
        } else if (moduleId === 'storage') {
        config.bucketName = config.bucketName || config.name || 'my-bucket';
        } else if (moduleId === 'compute') {
        config.instanceName = config.instanceName || config.name || 'my-compute-instance';
        } else if (moduleId === 'gke') {
        config.clusterName = config.clusterName || config.name || 'my-gke-cluster';
        }

        if (moduleId === 'logging') {
        code += `module "logging" {
    source        = "./modules/logging"
    project_id    = "${projectId}"
    bucket_name   = "${config.bucketName || 'my-logging-bucket'}"
    sink_name     = "${config.sinkName || 'my-sink'}"
    filter        = "logName:\\"projects/${projectId}/logs/cloudaudit.googleapis.com%2Factivity\\""
    }
    `;
        } else if (moduleId === 'vpc') {
        code += `module "vpc" {
    source        = "./modules/vpc"
    project_id    = "${projectId}"
    network_name  = "${config.networkName}"
    cidr_block    = "${config.cidrBlock}"
    }
    `;
        } else if (moduleId === 'storage') {
        const bucketName = (config.bucketName || 'my-bucket').toLowerCase().replace(/[^a-z0-9-]/g, '-');
        code += `module "storage" {
    source        = "./modules/storage"
    project_id    = "${projectId}"
    bucket_name   = "${bucketName}"
    location      = "${config.location || region}"
    storage_class = "${config.storageClass || 'STANDARD'}"
    }
    `;
        } else if (moduleId === 'compute') {
        code += `module "compute" {
    source        = "./modules/compute-engine"
    project_id    = "${projectId}"
    instance_name = "${config.instanceName}"
    machine_type  = "${config.machineType || 'e2-micro'}"
    zone          = "${config.zone || region + '-a'}"
    network       = "${config.network || 'default'}"
    }
    `;
        } else if (moduleId === 'gke') {
        code += `module "gke" {
    source          = "./modules/gke"
    project_id      = "${projectId}"
    cluster_name    = "${config.clusterName}"
    region          = "${region}"
    node_pool_name  = "${config.nodePoolName || 'default-pool'}"
    machine_type    = "${config.machineType || 'e2-medium'}"
    num_nodes       = ${config.numNodes || 3}
    }
    `;
        } else if (moduleId === 'firestore') {
        code += `module "firestore" {
    source        = "./modules/firestore"
    project_id    = "${projectId}"
    database_id   = "${config.databaseId || '(default)'}"
    location      = "${config.location || 'us-central1'}"
    type          = "${config.mode || 'FIRESTORE_NATIVE'}"
    }
    `;
        } else if (moduleId === 'redis') {
        code += `module "redis" {
    source          = "./modules/redis"
    project_id      = "${projectId}"
    instance_name   = "${config.instanceName || 'my-redis'}"
    memory_size_gb  = ${config.memorySizeGb || 1}
    tier            = "${config.tier || 'BASIC'}"
    }
    `;
        } else if (moduleId === 'pubsub') {
        const topicName = (config.topicName || 'my-topic').replace(/[^a-zA-Z0-9-_]/g, '-');
        code += `module "pubsub" {
    source            = "./modules/pubsub"
    project_id        = "${projectId}"
    topic_name        = "${topicName}"
    subscription_name = "${config.subscriptionName || topicName + '-sub'}"
    }
    `;
        } else if (moduleId === 'cloudsql') {
        code += `module "cloudsql" {
    source            = "./modules/cloudsql"
    project_id        = "${projectId}"
    instance_name     = "${config.instanceName || 'my-sql-instance'}"
    database_version  = "${config.databaseVersion || 'POSTGRES_15'}"
    region            = "${region}"
    tier              = "${config.tier || 'db-f1-micro'}"
    }
    `;
        } else if (moduleId === 'bigquery') {
        const datasetId = (config.datasetId || 'my_dataset').replace(/[^a-zA-Z0-9_]/g, '_');
        code += `module "bigquery" {
    source        = "./modules/bigquery"
    project_id    = "${projectId}"
    dataset_id    = "${datasetId}"
    table_id      = "${config.tableId || 'my_table'}"
    location      = "${region}"
    }
    `;
        } else if (moduleId === 'functions') {
        code += `module "functions" {
    source        = "./modules/functions"
    project_id    = "${projectId}"
    function_name = "${config.functionName || 'hello-world'}"
    runtime       = "${config.runtime || 'nodejs18'}"
    }
    `;
        } else if (moduleId === 'appengine') {
        code += `module "appengine" {
    source        = "./modules/appengine"
    project_id    = "${projectId}"
    service       = "${config.serviceName || 'default'}"
    }
    `;
        } else if (moduleId === 'iam') {
        if (!config.userEmail || !config.userEmail.includes('@')) {
            throw new Error('Valid user email required for IAM module');
        }
        code += `module "iam" {
    source        = "./modules/iam"
    project_id    = "${projectId}"
    user_email    = "${config.userEmail}"
    role          = "${config.role || 'roles/editor'}"
    }
    `;
        } else if (moduleId === 'cloudrun') {
        code += `module "cloudrun" {
    source          = "./modules/cloudrun"
    project_id      = "${projectId}"
    service_name    = "${config.serviceName || 'my-service'}"
    container_image = "${config.containerImage || 'gcr.io/cloudrun/hello'}"
    }
    `;
        } else if (moduleId === 'dns') {
        const zoneName = (config.zoneName || 'my-zone').replace(/[^a-z0-9-]/g, '-');
        const dnsName = config.dnsName?.toLowerCase();
        if (!dnsName || !dnsName.endsWith('.')) {
            throw new Error('dnsName must end with . (e.g., example.com.)');
        }
        code += `module "dns" {
    source      = "./modules/dns"
    project_id  = "${projectId}"
    zone_name   = "${zoneName}"
    dns_name    = "${dnsName}"
    }
    `;
        } else if (moduleId === 'monitoring') {
        code += `module "monitoring" {
    source            = "./modules/monitoring"
    project_id        = "${projectId}"
    alert_policy_name = "${config.alertPolicyName || 'High-CPU-Alert'}"
    }
    `;
        }
    }
    return code;
    }

    // ===== Extraction utils =====
    function deepExtractAttributes(obj) {
    if (obj == null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepExtractAttributes);
    if (obj.constant_value !== undefined) return deepExtractAttributes(obj.constant_value);
    if (obj.computed === true) return null;
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
        if (key === 'sensitive_attributes' || key.startsWith('__')) continue;
        result[key] = deepExtractAttributes(val);
    }
    return result;
    }

    function extractResourcesFromModule(module, resources = []) {
    if (Array.isArray(module.resources)) {
        module.resources.forEach(resource => {
        const addr = resource.address || 'unknown';
        const name = resource.name || addr.split('.').pop() || 'unknown';
        const type = resource.type || 'unknown';
        const provider = resource.provider_name || 'google';
        let attrs = {};
        if (resource.values && typeof resource.values === 'object') {
            attrs = deepExtractAttributes(resource.values);
        }
        const labels = attrs.labels || attrs.tags || {};
        const nameFromLabels = labels.name || labels.Name || name;
        resources.push({
            id: addr,
            name: nameFromLabels,
            type,
            provider,
            attributes: attrs,
            status: 'active'
        });
        });
    }
    if (Array.isArray(module.child_modules)) {
        module.child_modules.forEach(child => {
        extractResourcesFromModule(child, resources);
        });
    }
    return resources;
    }

    // ================== CONTROLLER FUNCTIONS ==================

    export async function deploy(req, res) {
    let keyPath, deployDir;
    let logPath = ''; // track for error retrieval

    try {
        const userId = req.user?._id;
        if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        const { provider, region: inputRegion, modules, moduleConfig = {}, account } = req.body;

        // ✅ Validate & normalize region
        if (!inputRegion) {
        return res.status(400).json({ success: false, error: "Region is required." });
        }

        let region = inputRegion === 'global' ? 'us-central1' : inputRegion;
        if (!VALID_GCP_REGIONS.has(region)) {
        return res.status(400).json({
            success: false,
            error: `Invalid GCP region: '${region}'. Supported regions include: us-central1, us-east1, europe-west1, asia-south1, etc.`
        });
        }

        // ✅ Normalize module config field names (frontend → backend)
        const normalizedModuleConfig = { ...moduleConfig };
        if (modules.includes('vpc') && normalizedModuleConfig.vpc) {
        const vpc = normalizedModuleConfig.vpc;
        vpc.networkName = vpc.networkName || vpc.name;
        vpc.cidrBlock = vpc.cidrBlock || vpc.cidr_block;
        }
        if (modules.includes('storage') && normalizedModuleConfig.storage) {
        const s = normalizedModuleConfig.storage;
        s.bucketName = s.bucketName || s.name;
        }
        if (modules.includes('compute') && normalizedModuleConfig.compute) {
        const c = normalizedModuleConfig.compute;
        c.instanceName = c.instanceName || c.name;
        }

        if (!account || !account._id) {
        return res.status(400).json({ success: false, error: "No GCP account selected." });
        }

        const gcpConn = await GcpConnection.findById(account._id);
        if (!gcpConn) {
        return res.status(404).json({ success: false, error: "GCP account not found" });
        }

        const { projectId, email, privateKey } = gcpConn;
        if (!projectId || !email || !privateKey) {
        return res.status(400).json({ success: false, error: "Missing GCP credentials." });
        }

        const deploymentId = `gcp-dep-${Date.now()}`;
        deployDir = path.join(__dirname, '../../../terraform/gcp/deployments', deploymentId);
        await fs.mkdir(deployDir, { recursive: true });

        logPath = path.join(deployDir, 'deploy.log');
        await fs.writeFile(logPath, `[INFO] Deployment ${deploymentId} started at ${new Date().toISOString()}\n`);

        // ✅ Symlink modules — DYNAMIC PATH
        try {
        await fs.access(MODULES_BASE_PATH);
        } catch (e) {
        const errMsg = `[GCP] ❌ Modules not found at: ${MODULES_BASE_PATH}`;
        await fs.appendFile(logPath, errMsg + '\n');
        return res.status(500).json({ 
            success: false, 
            error: "Terraform modules missing. Contact admin." 
        });
        }

        const modulesLink = path.join(deployDir, 'modules');
        try {
        await fs.symlink(MODULES_BASE_PATH, modulesLink, 'dir');
        } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        }
        await fs.appendFile(logPath, `[INFO] Using modules from: ${MODULES_BASE_PATH}\n`);

        // ✅ Build service account key
        const keyJson = buildServiceAccountKey({ projectId, email, privateKey });
        keyPath = `/tmp/gcp-key-${deploymentId}.json`;
        await fs.writeFile(keyPath, keyJson);
        await fs.appendFile(logPath, `[INFO] Service account key written.\n`);

        // ✅ Generate & write main.tf
        const tfCode = generateGcpTerraformCode(
        { modules, moduleConfig: normalizedModuleConfig },
        projectId,
        region
        );
        await fs.writeFile(path.join(deployDir, 'main.tf'), tfCode);
        await fs.appendFile(logPath, `[INFO] main.tf generated.\n`);

        // ✅ Environment
        const env = {
        ...process.env,
        PATH: `${process.env.PATH || ''}:/usr/local/bin:/usr/bin:/bin:/snap/bin`,
        GOOGLE_APPLICATION_CREDENTIALS: keyPath,
        GOOGLE_CLOUD_PROJECT: projectId
        };

        // ✅ Run terraform init
        await fs.appendFile(logPath, `[INFO] Running: terraform init\n`);
        await execAsync('terraform init -no-color', { cwd: deployDir, env });
        await fs.appendFile(logPath, `[INFO] terraform init succeeded.\n`);

        // ✅ Run terraform apply — with real-time stderr capture
        await fs.appendFile(logPath, `[INFO] Running: terraform apply -auto-approve\n`);
        const apply = exec('terraform apply -auto-approve -no-color', { 
        cwd: deployDir, 
        env, 
        shell: true 
        });

        apply.stdout.on('data', d => fs.appendFile(logPath, d).catch(() => {}));
        apply.stderr.on('data', d => fs.appendFile(logPath, `[STDERR] ${d}`).catch(() => {}));

        apply.on('close', async (code) => {
        await fs.appendFile(logPath, `\n[INFO] Apply exited with code ${code}\n`).catch(() => {});

        if (code === 0) {
            const record = new DeploymentRecord({
            userId,
            provider: 'gcp',
            region,
            modules,
            moduleConfig: normalizedModuleConfig,
            deploymentId,
            accountId: gcpConn._id,
            status: 'success',
            resources: []
            });
            await record.save();
            
            res.json({ success: true, deploymentId, status: 'success' });
        } else {
            // ✅ Read last 20 lines of log for actionable error
            let errorSnippet = 'Terraform apply failed.';
            try {
            const logContent = await fs.readFile(logPath, 'utf8');
            const lines = logContent.split('\n').filter(l => l.trim());
            errorSnippet = lines.slice(-20).join('\n');
            } catch (e) { /* fallback */ }

            res.status(500).json({ 
            success: false, 
            error: `Terraform apply failed. Details:\n${errorSnippet}`,
            deploymentId
            });
        }
        });

    } catch (err) {
        const msg = `[CRITICAL] GCP Deploy Error: ${err.message || err}`;
        if (logPath) await fs.appendFile(logPath, msg + '\n').catch(() => {});
        console.error(msg, err.stack);

        res.status(500).json({ 
        success: false, 
        error: err.message || 'Internal server error' 
        });
    } finally {
        if (keyPath) await fs.rm(keyPath, { force: true }).catch(() => {});
        // ⚠️ Keep deployDir for debugging on failure (optional cleanup later)
    }
    }

    // ========== REST OF CONTROLLERS (unchanged except region normalization) ==========

    export async function getLogs(req, res) {
    const { deploymentId } = req.params;
    const logPath = path.join(__dirname, `../../../terraform/gcp/deployments/${deploymentId}/deploy.log`);
    try {
        const logs = await fs.readFile(logPath, 'utf8');
        res.send(logs);
    } catch {
        res.status(404).send('Logs not found');
    }
    }

    export async function destroyResource(req, res) {
    let keyPath, deployDir;
    try {
        const { deploymentId, resourceId } = req.body;
        if (!resourceId) return res.status(400).json({ error: 'resourceId required' });

        const deployment = await DeploymentRecord.findOne({
        deploymentId,
        userId: req.user._id,
        "resources.id": resourceId
        });
        if (!deployment) return res.status(404).json({ error: 'Resource not found' });

        const gcpConn = await GcpConnection.findById(deployment.accountId);
        if (!gcpConn) return res.status(400).json({ error: 'GCP account missing' });

        const { projectId, email, privateKey } = gcpConn;
        let region = deployment.region === 'global' ? 'us-central1' : deployment.region;

        deployDir = path.join(__dirname, '../../../terraform/gcp/deployments', deploymentId);
        await fs.mkdir(deployDir, { recursive: true });

        const modulesLink = path.join(deployDir, 'modules');
        try {
        await fs.symlink(MODULES_BASE_PATH, modulesLink, 'dir');
        } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        }

        const keyJson = buildServiceAccountKey({ projectId, email, privateKey });
        keyPath = `/tmp/gcp-key-${deploymentId}.json`;
        await fs.writeFile(keyPath, keyJson);

        const tfCode = generateGcpTerraformCode({
        modules: deployment.modules,
        moduleConfig: deployment.moduleConfig
        }, projectId, region);
        await fs.writeFile(path.join(deployDir, 'main.tf'), tfCode);

        const env = {
        ...process.env,
        PATH: `${process.env.PATH || ''}:/usr/local/bin:/usr/bin:/bin:/snap/bin`,
        GOOGLE_APPLICATION_CREDENTIALS: keyPath,
        GOOGLE_CLOUD_PROJECT: projectId
        };
        await execAsync('terraform init -no-color', { cwd: deployDir, env });

        const destroy = exec(`terraform destroy -target="${resourceId}" -auto-approve -no-color`, { 
        cwd: deployDir, 
        env, 
        shell: true 
        });

        destroy.on('close', async (code) => {
        if (code === 0) {
            await DeploymentRecord.updateOne({ _id: deployment._id }, { $pull: { resources: { id: resourceId } } });
            await Resource.deleteOne({ cloudConnectionId: gcpConn._id, resourceId });
            res.json({ success: true, message: 'Resource destroyed and deleted.' });
        } else {
            res.status(500).json({ error: 'Destroy failed — check logs.' });
        }
        });

    } catch (err) {
        console.error('❌ Destroy Resource Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (keyPath) await fs.rm(keyPath, { force: true }).catch(() => {});
    }
    }

    export async function destroyDeployment(req, res) {
    let keyPath, deployDir;
    try {
        const { deploymentId, accountId } = req.body;
        if (!deploymentId || !accountId) return res.status(400).json({ error: 'deploymentId & accountId required' });

        const deployment = await DeploymentRecord.findOne({ deploymentId, accountId });
        if (!deployment) return res.status(404).json({ error: 'Deployment not found' });

        const gcpConn = await GcpConnection.findById(accountId);
        if (!gcpConn) return res.status(400).json({ error: 'Account not found' });

        const { projectId, email, privateKey } = gcpConn;
        let region = deployment.region === 'global' ? 'us-central1' : deployment.region;

        deployDir = path.join(__dirname, '../../../terraform/gcp/deployments', deploymentId);
        await fs.mkdir(deployDir, { recursive: true });

        const modulesLink = path.join(deployDir, 'modules');
        try {
        await fs.symlink(MODULES_BASE_PATH, modulesLink, 'dir');
        } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        }

        const keyJson = buildServiceAccountKey({ projectId, email, privateKey });
        keyPath = `/tmp/gcp-key-${deploymentId}.json`;
        await fs.writeFile(keyPath, keyJson);

        const tfCode = generateGcpTerraformCode({
        modules: deployment.modules,
        moduleConfig: deployment.moduleConfig
        }, projectId, region);
        await fs.writeFile(path.join(deployDir, 'main.tf'), tfCode);

        const env = {
        ...process.env,
        PATH: `${process.env.PATH || ''}:/usr/local/bin:/usr/bin:/bin:/snap/bin`,
        GOOGLE_APPLICATION_CREDENTIALS: keyPath,
        GOOGLE_CLOUD_PROJECT: projectId
        };
        
        await execAsync('terraform init -no-color', { cwd: deployDir, env });
        await execAsync('terraform destroy -auto-approve -no-color', { cwd: deployDir, env });

        await DeploymentRecord.deleteOne({ _id: deployment._id });
        await Resource.deleteMany({ cloudConnectionId: accountId, deploymentId });

        res.json({ success: true, message: `Deployment ${deploymentId} destroyed.` });

    } catch (err) {
        console.error('❌ Destroy Deployment Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (keyPath) await fs.rm(keyPath, { force: true }).catch(() => {});
        if (deployDir) await fs.rm(deployDir, { recursive: true, force: true }).catch(() => {});
    }
    }

    export async function getResources(req, res) {
    const { accountId } = req.query;
    if (!accountId) return res.status(400).json({ error: 'accountId required' });

    try {
        const deployments = await DeploymentRecord
        .find({ accountId, provider: 'gcp', status: 'success' })
        .sort({ createdAt: -1 })
        .lean();

        const results = deployments.map(dep => ({
        deploymentId: dep.deploymentId,
        region: dep.region === 'global' ? 'us-central1' : dep.region,
        accountId: dep.accountId.toString(),
        modules: dep.modules || [],
        resources: (dep.resources || []).filter(r => r?.id),
        createdAt: dep.createdAt
        }));

        res.json({ success: true, deployments: results });
    } catch (err) {
        console.error('❌ getResources Error:', err);
        res.status(500).json({ error: 'DB error' });
    }
    }