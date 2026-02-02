import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Network,
  HardDrive,
  Info,
  Workflow,
  Bell,
  Users,
  BarChart,
  Search,
  AlertTriangle,
  Shield,
  Lock,
  Globe,
  Terminal,
  FolderOpen,
} from 'lucide-react';
import api from '../../../interceptor/api.interceptor';

// ✅ Reusable per-field tooltip
const FieldInfoTooltip = ({ content, show }) => {
  if (!show) return null;
  return (
    <div
      className="absolute z-50 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg text-sm text-gray-200"
      style={{
        top: '-110px',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}
    >
      <div className="font-medium text-cyan-300 mb-1">💡 Help</div>
      <div>{content}</div>
    </div>
  );
};

// 🔜 List of modules that are NOT YET implemented (no form fields)
const UPCOMING_MODULE_IDS = [
  'vpn',
  'dns',
  'frontdoor',
  'vmware',
  'appservice',
  'azure_files',
  'servicebus',
];

const ModuleConfigForm = ({ provider, moduleId, config, onConfigChange }) => {
  const [hoveredField, setHoveredField] = useState(null);
  const [advancedVisible, setAdvancedVisible] = useState(false);

  // 🔑 Azure account & networking state
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [vnets, setVnets] = useState([]);
  const [subnets, setSubnets] = useState([]);

  const updateConfig = (field, value) => {
    onConfigChange({ ...config, [field]: value });
  };

  const renderLabel = (labelText, fieldKey, helpText, required = false) => (
    <label className="text-sm font-medium mb-1 flex items-center gap-1">
      {labelText}
      {required && <span className="text-red-400">*</span>}
      {helpText && (
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setHoveredField(fieldKey)}
            onMouseLeave={() => setHoveredField(null)}
            onClick={(e) => e.preventDefault()}
            className="group p-1"
            aria-label={`Help for ${labelText}`}
          >
            <Info size={14} className="text-gray-400 group-hover:text-cyan-400 transition-colors" />
          </button>
          <FieldInfoTooltip content={helpText} show={hoveredField === fieldKey} />
        </div>
      )}
    </label>
  );

  // 📥 Fetch Azure accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get('/api/azure/accounts');
        setSavedAccounts(res.data);
        if (res.data.length === 1) {
          setSelectedAccount(res.data[0]);
        }
      } catch (err) {
        console.error('Failed to load Azure accounts:', err);
      }
    };
    fetchAccounts();
  }, []);

  // 🌐 Fetch VNets when selected account changes
  useEffect(() => {
    if (!selectedAccount?.subscriptionId) {
      setVnets([]);
      updateConfig('vnet', '');
      return;
    }
    const fetchVnets = async () => {
      try {
        const res = await api.get(`/api/azure/vnets?subscriptionId=${selectedAccount.subscriptionId}`);
        setVnets(res.data || []);
      } catch (err) {
        console.error('Failed to load VNets:', err);
      }
    };
    fetchVnets();
  }, [selectedAccount]);

  // 📡 Fetch subnets when VNet selection changes
  useEffect(() => {
    const vnetId = config.vnet;
    if (!vnetId || vnetId === 'default') {
      setSubnets([]);
      updateConfig('subnet', '');
      return;
    }
    const fetchSubnets = async () => {
      try {
        const res = await api.get(`/api/azure/subnets?vnetId=${encodeURIComponent(vnetId)}`);
        setSubnets(res.data || []);
      } catch (err) {
        console.error('Failed to load subnets:', err);
      }
    };
    fetchSubnets();
  }, [config.vnet]);

  // 🔍 Check if current module is upcoming
  const isUpcoming = UPCOMING_MODULE_IDS.includes(moduleId);

  return (
    <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b] mb-4">
      {/* === Module Title with Icon === */}
      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
        <span className="mr-1">
          {moduleId === "vm" && <Server className="text-orange-400" />}
          {moduleId === "aks" && <Database className="text-blue-400" />}
          {moduleId === "vnet" && <Network className="text-green-400" />}
          {(moduleId === "blob_storage" || moduleId === "blob") && <HardDrive className="text-yellow-400" />}
          {moduleId === "logic_app" && <Workflow className="text-purple-400" />}
          {moduleId === "event_grid" && <Bell className="text-pink-400" />}
          {moduleId === "azure_ad" && <Users className="text-indigo-400" />}
          {moduleId === "application_insights" && <BarChart className="text-teal-400" />}
          {moduleId === "log_analytics" && <Search className="text-cyan-400" />}
          {moduleId === "azure_advisor" && <AlertTriangle className="text-amber-400" />}
          {moduleId === "microsoft_defender" && <Shield className="text-red-400" />}
          {moduleId === "key_vault" && <Lock className="text-purple-400" />}
          {moduleId === "vpn" && <Lock className="text-emerald-400" />}
          {moduleId === "dns" && <Globe className="text-sky-400" />}
          {moduleId === "frontdoor" && <Globe className="text-violet-400" />}
          {moduleId === "vmware" && <Server className="text-rose-400" />}
          {moduleId === "appservice" && <Terminal className="text-lime-400" />}
          {moduleId === "azure_files" && <FolderOpen className="text-amber-400" />}
          {moduleId === "servicebus" && <Workflow className="text-fuchsia-400" />}
        </span>
        Configure {moduleId.toUpperCase()}
        <div className="relative">
          <button
            onMouseEnter={() => setHoveredField('module')}
            onMouseLeave={() => setHoveredField(null)}
            onClick={(e) => e.stopPropagation()}
            className="group p-1"
            aria-label="Module Info"
          >
            <Info size={14} className="text-gray-400 group-hover:text-cyan-400 transition-colors" />
          </button>
          <FieldInfoTooltip
            content={{
              vm: 'Launch virtual machines. Specify size, image, and networking.',
              aks: 'Managed Kubernetes. Set cluster name, nodes, and size.',
              vnet: 'Define a private network. Configure CIDR block and subnets.',
              blob_storage: 'Create scalable object storage. Choose storage tier and redundancy.',
              blob: 'Create scalable object storage. Choose storage tier and redundancy.',
              cosmos_db: 'Globally distributed NoSQL database with low latency.',
              key_vault: 'Securely store secrets, keys, and certificates.',
              storage_account: 'General-purpose storage for blobs, files, queues, and tables.',
              logic_app: 'Automate workflows with visual designer. Connect to 500+ services.',
              event_grid: 'Serverless event routing service. Publish-subscribe model for cloud events.',
              azure_ad: 'Register applications in Azure Active Directory for authentication and authorization.',
              application_insights: 'Monitor application performance, availability, and usage. Collect logs and metrics.',
              log_analytics: 'Centralized logging and analytics. Store and query logs from multiple sources.',
              advisor_alert: 'Get alerts for Azure Advisor recommendations. Configure email/webhook notifications.',
              security_center: 'Unified security management and advanced threat protection across hybrid cloud workloads.',
              vpn: 'Secure site-to-site or point-to-site connectivity to your Azure VNet.',
              dns: 'Host DNS domains (e.g., example.com) in Azure. Public or private.',
              frontdoor: 'Global HTTP load balancer with WAF, caching, and multi-region routing.',
              vmware: 'Fully managed VMware Cloud on Azure. Run vSphere workloads natively.',
              appservice: 'PaaS for web apps, APIs, and mobile backends. Built-in CI/CD, scaling.',
              azure_files: 'Fully managed SMB/NFS file shares — like AWS EFS.',
              servicebus: 'Enterprise messaging with queues, topics, sessions, and dead-lettering.',
            }[moduleId] || 'No info available.'}
            show={hoveredField === 'module'}
          />
        </div>
      </h3>

      {/* 🔜 Upcoming Module Placeholder */}
      {isUpcoming && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-yellow-400 mb-2">🔜 Coming Soon</div>
          <p className="text-gray-300 text-sm">
            Configuration for <strong>{moduleId.toUpperCase()}</strong> is not yet available.
            <br />
            This module will be supported in a future release.
          </p>
        </div>
      )}

      {/* ✅ Only render form if module is implemented */}
      {!isUpcoming && (
        <>
          {/* Resource Name */}
          {renderLabel("Resource Name", "name", "A unique name for this resource (e.g., 'web-server-prod'). Avoid spaces and special characters.", true)}
          <input
            type="text"
            value={config.name || ""}
            onChange={(e) => updateConfig("name", e.target.value)}
            placeholder={`Enter ${moduleId} name`}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />

          {/* ===== Virtual Machine (Azure) ===== */}
          {moduleId === "vm" && provider === "azure" && (
            <>
              {renderLabel("VM Size", "vmSize", "Size of the virtual machine. Standard_B1s = free tier; Standard_D2s_v3 = production workloads.")}
              <select
                value={config.vmSize || "Standard_B1s"}
                onChange={(e) => updateConfig("vmSize", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="Standard_B1s">Standard_B1s (1 vCPU, 1 GB RAM)</option>
                <option value="Standard_B2s">Standard_B2s (2 vCPU, 4 GB RAM)</option>
                <option value="Standard_D2s_v3">Standard_D2s_v3 (2 vCPU, 8 GB RAM)</option>
              </select>
              {renderLabel("OS Image", "osImage", "Operating system image for the VM. e.g., Ubuntu 22.04-LTS, Windows Server 2022, CentOS 8.4")}
              <select
                value={config.osImage || "Ubuntu 22.04-LTS"}
                onChange={(e) => updateConfig("osImage", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="Ubuntu 22.04-LTS">Ubuntu 22.04 LTS</option>
                <option value="Windows Server 2022">Windows Server 2022</option>
                <option value="CentOS 8.4">CentOS 8.4</option>
              </select>
              {renderLabel("Region", "region", "Region where the VM will be deployed. Must be in the selected region (e.g., eastus).")}
              <select
                value={config.region || "eastus"}
                onChange={(e) => updateConfig("region", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="eastus">East US</option>
                <option value="westeurope">West Europe</option>
                <option value="southeastasia">Southeast Asia</option>
                <option value="brazilsouth">Brazil South</option>
              </select>
              {renderLabel("Virtual Network (VNet)", "vnet", "Select an existing Azure Virtual Network or use default.")}
              <select
                value={config.vnet || ""}
                onChange={(e) => {
                  updateConfig("vnet", e.target.value);
                  updateConfig("subnet", "");
                }}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="">-- Select VNet --</option>
                <option value="default">Use Default VNet</option>
                {vnets.map((vnet) => (
                  <option key={vnet.id} value={vnet.id}>
                    {vnet.name} ({vnet.location})
                  </option>
                ))}
              </select>
              {renderLabel("Subnet", "subnet", "Select a subnet within the chosen VNet.")}
              <select
                value={config.subnet || ""}
                onChange={(e) => updateConfig("subnet", e.target.value)}
                disabled={!config.vnet || config.vnet === "default"}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="">-- Select Subnet --</option>
                {subnets.map((subnet) => (
                  <option key={subnet.id} value={subnet.id}>
                    {subnet.name} ({subnet.addressPrefix})
                  </option>
                ))}
              </select>
              {renderLabel("Public IP", "publicIp", "Assign a static public IP address to the VM. Required for internet access.")}
              <select
                value={config.publicIp || "dynamic"}
                onChange={(e) => updateConfig("publicIp", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="dynamic">Dynamic IP</option>
                <option value="static">Static IP</option>
              </select>
              {renderLabel("SSH Key", "sshKey", "Add your public SSH key to access the VM. Paste your public key here.")}
              <textarea
                value={config.sshKey || ""}
                onChange={(e) => updateConfig("sshKey", e.target.value)}
                placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white text-sm h-20 mb-4"
              />
            </>
          )}

          {/* ===== AKS (Azure) ===== */}
          {moduleId === "aks" && provider === "azure" && (
            <>
              {renderLabel("Cluster Name", "clusterName", "Name of your AKS cluster (e.g., 'prod-cluster'). Must be unique per region.")}
              <input
                type="text"
                value={config.clusterName || ""}
                onChange={(e) => updateConfig("clusterName", e.target.value)}
                placeholder="my-aks-cluster"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Node Count", "nodeCount", "Number of worker nodes in the cluster. Minimum 2 recommended for uptime.")}
              <select
                value={config.nodeCount || 2}
                onChange={(e) => updateConfig("nodeCount", parseInt(e.target.value))}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              {renderLabel("VM Size", "vmSize", "Size of the worker nodes. Standard_B2s = dev; Standard_D2s_v3 = production workloads.")}
              <select
                value={config.vmSize || "Standard_B2s"}
                onChange={(e) => updateConfig("vmSize", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="Standard_B2s">Standard_B2s</option>
                <option value="Standard_B4s">Standard_B4s</option>
                <option value="Standard_D2s_v3">Standard_D2s_v3</option>
              </select>
              {renderLabel("Region", "region", "Region where the cluster will be deployed. Must be in the selected region (e.g., eastus).")}
              <select
                value={config.region || "eastus"}
                onChange={(e) => updateConfig("region", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="eastus">East US</option>
                <option value="westeurope">West Europe</option>
                <option value="southeastasia">Southeast Asia</option>
                <option value="brazilsouth">Brazil South</option>
              </select>
              {renderLabel("Virtual Network (VNet)", "vnet", "Select an existing Azure Virtual Network or use default.")}
              <select
                value={config.vnet || ""}
                onChange={(e) => {
                  updateConfig("vnet", e.target.value);
                  updateConfig("subnet", "");
                }}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="">-- Select VNet --</option>
                <option value="default">Use Default VNet</option>
                {vnets.map((vnet) => (
                  <option key={vnet.id} value={vnet.id}>
                    {vnet.name} ({vnet.location})
                  </option>
                ))}
              </select>
              {renderLabel("Subnet", "subnet", "Select a subnet within the chosen VNet.")}
              <select
                value={config.subnet || ""}
                onChange={(e) => updateConfig("subnet", e.target.value)}
                disabled={!config.vnet || config.vnet === "default"}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="">-- Select Subnet --</option>
                {subnets.map((subnet) => (
                  <option key={subnet.id} value={subnet.id}>
                    {subnet.name} ({subnet.addressPrefix})
                  </option>
                ))}
              </select>
            </>
          )}

          {/* ===== VNet (Azure) ===== */}
          {moduleId === "vnet" && provider === "azure" && (
            <>
              {renderLabel("CIDR Block", "cidrBlock", "IP range for your VNet (e.g., 10.0.0.0/16). Must not overlap with other networks.", true)}
              <input
                type="text"
                value={config.cidrBlock || "10.0.0.0/16"}
                onChange={(e) => updateConfig("cidrBlock", e.target.value)}
                placeholder="10.0.0.0/16"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Subnet Count", "subnetCount", "Number of subnets to create. Minimum 2 for high availability (one per zone).", true)}
              <select
                value={config.subnetCount || 2}
                onChange={(e) => updateConfig("subnetCount", parseInt(e.target.value))}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              <button
                type="button"
                onClick={() => setAdvancedVisible(!advancedVisible)}
                className="mb-4 px-4 py-2 bg-[#3a5b9b] hover:bg-[#4a6cbb] text-white rounded-md transition-colors"
              >
                {advancedVisible ? "Hide Advanced Details" : "Show Advanced Details"}
              </button>
              {advancedVisible && (
                <div className="mt-4 p-4 bg-[#2A4C83] rounded-lg border border-[#3a5b9b]">
                  <h4 className="text-sm font-medium mb-3">🧩 Auto-generated Resources</h4>
                  <div className="mb-4">
                    <h5 className="text-xs font-medium mb-2">Subnets ({config.subnetCount})</h5>
                    <div className="space-y-2">
                      {[...Array(config.subnetCount)].map((_, i) => {
                        const parentCidr = config.cidrBlock || "10.0.0.0/16";
                        const [baseIp, prefix] = parentCidr.split('/');
                        const baseParts = baseIp.split('.').map(Number);
                        const subnetIp = `${baseParts[0]}.${baseParts[1]}.${i + 1}.0/${parseInt(prefix) + 8}`;
                        const zone = `eastus-${i + 1}`;
                        return (
                          <div key={i} className="p-2 bg-[#1E2633] rounded text-xs">
                            <span className="font-medium">Subnet {i + 1}</span> | Zone: {zone} | CIDR: {subnetIp}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium mb-2">Network Security Group</h5>
                    <div className="p-2 bg-[#1E2633] rounded text-xs">
                      <span className="font-medium">Allow HTTP/HTTPS:</span> Ports 80/443
                    </div>
                    <div className="p-2 bg-[#1E2633] rounded text-xs mt-1">
                      <span className="font-medium">Allow SSH/RDP:</span> Ports 22 / 3389
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== Blob Storage (Azure) ===== */}
          {(moduleId === "blob_storage" || moduleId === "blob") && provider === "azure" && (
            <>
              {renderLabel("Storage Tier", "storageTier", "Hot = frequently accessed; Cool = infrequently accessed; Archive = archival (slow retrieval).")}
              <select
                value={config.storageTier || "Hot"}
                onChange={(e) => updateConfig("storageTier", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="Hot">Hot</option>
                <option value="Cool">Cool</option>
                <option value="Archive">Archive</option>
              </select>
              {renderLabel("Redundancy", "redundancy", "LRS = locally redundant; ZRS = zone redundant; GRS = geo-redundant (highest cost).")}
              <select
                value={config.redundancy || "LRS"}
                onChange={(e) => updateConfig("redundancy", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="LRS">Locally Redundant (LRS)</option>
                <option value="ZRS">Zone Redundant (ZRS)</option>
                <option value="GRS">Geo-Redundant (GRS)</option>
              </select>
              {renderLabel("Region", "region", "Region where the storage account will be created. Must be in the selected region (e.g., eastus).")}
              <select
                value={config.region || "eastus"}
                onChange={(e) => updateConfig("region", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="eastus">East US</option>
                <option value="westeurope">West Europe</option>
                <option value="southeastasia">Southeast Asia</option>
                <option value="brazilsouth">Brazil South</option>
              </select>
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={config.generateAccessKey !== false}
                  onChange={(e) => updateConfig("generateAccessKey", e.target.checked)}
                  className="rounded text-orange-500 mr-2"
                />
                {renderLabel("Generate Access Key", "generateAccessKey", "Generates primary/secondary access keys for programmatic access.", false)}
              </div>
              {renderLabel("Encryption", "encryption", "Microsoft-managed key = free & automatic; Customer-managed key = more control & audit trail")}
              <select
                value={config.encryption || "Microsoft-managed"}
                onChange={(e) => updateConfig("encryption", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="Microsoft-managed">Microsoft-managed key</option>
                <option value="Customer-managed">Customer-managed key</option>
              </select>
              {renderLabel("Access Control", "accessControl", "RBAC = role-based access; Shared Key = access via account key (legacy).")}
              <select
                value={config.accessControl || "RBAC"}
                onChange={(e) => updateConfig("accessControl", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="RBAC">RBAC</option>
                <option value="Shared Key">Shared Key</option>
              </select>
            </>
          )}

          {/* ===== Cosmos DB (Azure) ===== */}
          {moduleId === "cosmos_db" && provider === "azure" && (
            <>
              {renderLabel("Database Name", "databaseName", "Name of the database within the Cosmos DB account.", true)}
              <input
                type="text"
                value={config.databaseName || ""}
                onChange={(e) => updateConfig("databaseName", e.target.value)}
                placeholder="my-cosmos-database"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Container Name", "containerName", "Name of the container (collection) within the database.", true)}
              <input
                type="text"
                value={config.containerName || ""}
                onChange={(e) => updateConfig("containerName", e.target.value)}
                placeholder="my-cosmos-container"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Partition Key", "partitionKey", "The partition key path for the container (e.g., /id).", true)}
              <input
                type="text"
                value={config.partitionKey || "/id"}
                onChange={(e) => updateConfig("partitionKey", e.target.value)}
                placeholder="/id"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Consistency Level", "consistencyLevel", "The default consistency level for the account (e.g., Session, Strong).")}
              <select
                value={config.consistencyLevel || "Session"}
                onChange={(e) => updateConfig("consistencyLevel", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="Session">Session</option>
                <option value="Strong">Strong</option>
                <option value="BoundedStaleness">Bounded Staleness</option>
                <option value="ConsistentPrefix">Consistent Prefix</option>
                <option value="Eventual">Eventual</option>
              </select>
            </>
          )}

          {/* ===== Key Vault (Azure) ===== */}
          {moduleId === "key_vault" && provider === "azure" && (
            <>
              {renderLabel("SKU Name", "skuName", "The SKU name for the Key Vault (Standard or Premium).")}
              <select
                value={config.skuName || "standard"}
                onChange={(e) => updateConfig("skuName", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
              {renderLabel("Soft Delete Retention Days", "softDeleteRetentionDays", "Number of days to retain deleted objects (minimum 7).", true)}
              <input
                type="number"
                min="7"
                value={config.softDeleteRetentionDays || 7}
                onChange={(e) => updateConfig("softDeleteRetentionDays", parseInt(e.target.value))}
                placeholder="7"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Purge Protection Enabled", "purgeProtectionEnabled", "Enable purge protection to prevent permanent deletion of vaults and objects.", false)}
              <select
                value={config.purgeProtectionEnabled ? "true" : "false"}
                onChange={(e) => updateConfig("purgeProtectionEnabled", e.target.value === "true")}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="false">Disabled</option>
                <option value="true">Enabled</option>
              </select>
              <div className="text-xs text-gray-400 mt-2">
                * Access policy will be configured automatically for your user.
              </div>
            </>
          )}

          {/* ===== Storage Account (Azure) ===== */}
          {moduleId === "storage_account" && provider === "azure" && (
            <>
              {renderLabel("Region", "region", "Region where the storage account will be created. Must be in the selected region (e.g., eastus).")}
              <select
                value={config.region || "eastus"}
                onChange={(e) => updateConfig("region", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="eastus">East US</option>
                <option value="westeurope">West Europe</option>
                <option value="southeastasia">Southeast Asia</option>
                <option value="brazilsouth">Brazil South</option>
              </select>
              {renderLabel("Performance", "performance", "Standard = general purpose; Premium = high performance for I/O intensive workloads.")}
              <select
                value={config.performance || "Standard"}
                onChange={(e) => updateConfig("performance", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
              </select>
              {renderLabel("Redundancy", "redundancy", "LRS = locally redundant; ZRS = zone redundant; GRS = geo-redundant (highest cost).")}
              <select
                value={config.redundancy || "LRS"}
                onChange={(e) => updateConfig("redundancy", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="LRS">Locally Redundant (LRS)</option>
                <option value="ZRS">Zone Redundant (ZRS)</option>
                <option value="GRS">Geo-Redundant (GRS)</option>
              </select>
              {renderLabel("Encryption", "encryption", "Microsoft-managed key = free & automatic; Customer-managed key = more control & audit trail")}
              <select
                value={config.encryption || "Microsoft-managed"}
                onChange={(e) => updateConfig("encryption", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="Microsoft-managed">Microsoft-managed key</option>
                <option value="Customer-managed">Customer-managed key</option>
              </select>
              {renderLabel("Access Control", "accessControl", "RBAC = role-based access; Shared Key = access via account key (legacy).")}
              <select
                value={config.accessControl || "RBAC"}
                onChange={(e) => updateConfig("accessControl", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="RBAC">RBAC</option>
                <option value="Shared Key">Shared Key</option>
              </select>
            </>
          )}

          {/* ===== Logic App (Azure) ===== */}
          {moduleId === "logic_app" && provider === "azure" && (
            <>
              {renderLabel("Region", "region", "Region where the Logic App will be deployed. Must be in the selected region (e.g., eastus).")}
              <select
                value={config.region || "eastus"}
                onChange={(e) => updateConfig("region", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="eastus">East US</option>
                <option value="westeurope">West Europe</option>
                <option value="southeastasia">Southeast Asia</option>
                <option value="brazilsouth">Brazil South</option>
              </select>
              {renderLabel("Recurrence Frequency", "recurrenceFrequency", "How often the Logic App should run (Hour, Day, Week, Month).")}
              <select
                value={config.recurrenceFrequency || "Hour"}
                onChange={(e) => updateConfig("recurrenceFrequency", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="Hour">Hour</option>
                <option value="Day">Day</option>
                <option value="Week">Week</option>
                <option value="Month">Month</option>
              </select>
              {renderLabel("Recurrence Interval", "recurrenceInterval", "Interval between executions (e.g., every 1 hour, every 2 days).")}
              <input
                type="number"
                min="1"
                value={config.recurrenceInterval || 1}
                onChange={(e) => updateConfig("recurrenceInterval", parseInt(e.target.value))}
                placeholder="1"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("HTTP Endpoint", "httpEndpoint", "URL to call in the HTTP action (e.g., https://httpbin.org/ip).")}
              <input
                type="text"
                value={config.httpEndpoint || "https://httpbin.org/ip"}
                onChange={(e) => updateConfig("httpEndpoint", e.target.value)}
                placeholder="https://httpbin.org/ip"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Log Analytics Workspace ID", "logAnalyticsWorkspaceId", "ID of the Log Analytics workspace for diagnostics (optional).")}
              <input
                type="text"
                value={config.logAnalyticsWorkspaceId || ""}
                onChange={(e) => updateConfig("logAnalyticsWorkspaceId", e.target.value)}
                placeholder="workspace-id"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
            </>
          )}

          {/* ===== Event Grid (Azure) ===== */}
          {moduleId === "event_grid" && provider === "azure" && (
            <>
              {renderLabel("Region", "region", "Region where the Event Grid topic will be deployed. Must be in the selected region (e.g., eastus).")}
              <select
                value={config.region || "eastus"}
                onChange={(e) => updateConfig("region", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="eastus">East US</option>
                <option value="westeurope">West Europe</option>
                <option value="southeastasia">Southeast Asia</option>
                <option value="brazilsouth">Brazil South</option>
              </select>
              {renderLabel("Webhook Endpoint", "webhookEndpoint", "Optional: URL to receive events via webhook (e.g., https://your-webhook.com/events).")}
              <input
                type="text"
                value={config.webhookEndpoint || ""}
                onChange={(e) => updateConfig("webhookEndpoint", e.target.value)}
                placeholder="https://your-webhook.com/events"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              <div className="text-xs text-gray-400 mt-2">
                * Event Grid topic will be created with default settings. You can configure additional properties after creation.
              </div>
            </>
          )}

          {/* ===== Azure AD Application (Azure) ===== */}
          {moduleId === "azure_ad" && provider === "azure" && (
            <>
              {renderLabel("Display Name", "displayName", "Name to display for the application in Azure AD.", true)}
              <input
                type="text"
                value={config.displayName || ""}
                onChange={(e) => updateConfig("displayName", e.target.value)}
                placeholder="My Application"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Homepage URL", "homepageUrl", "URL of the application homepage (optional).")}
              <input
                type="text"
                value={config.homepageUrl || ""}
                onChange={(e) => updateConfig("homepageUrl", e.target.value)}
                placeholder="https://myapp.example.com"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Reply URLs", "replyUrls", "Redirect URIs for the application (comma-separated).")}
              <input
                type="text"
                value={config.replyUrls || ""}
                onChange={(e) => updateConfig("replyUrls", e.target.value)}
                placeholder="https://myapp.example.com/callback,https://myapp.example.com/other"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              <div className="text-xs text-gray-400 mt-2">
                * Service principal will be created automatically with the same name as the application.
              </div>
            </>
          )}

          {/* ===== Application Insights (Azure) ===== */}
          {moduleId === "application_insights" && provider === "azure" && (
            <>
              {renderLabel("Region", "region", "Region where Application Insights will be deployed. Must be in the selected region (e.g., eastus).")}
              <select
                value={config.region || "eastus"}
                onChange={(e) => updateConfig("region", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="eastus">East US</option>
                <option value="westeurope">West Europe</option>
                <option value="southeastasia">Southeast Asia</option>
                <option value="brazilsouth">Brazil South</option>
              </select>
              {renderLabel("Retention Days", "retentionDays", "Number of days to retain telemetry data (default: 30).")}
              <input
                type="number"
                min="30"
                max="730"
                value={config.retentionDays || 30}
                onChange={(e) => updateConfig("retentionDays", parseInt(e.target.value))}
                placeholder="30"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Log Analytics Workspace ID", "workspaceId", "Optional: ID of the Log Analytics workspace to integrate with.", false)}
              <input
                type="text"
                value={config.workspaceId || ""}
                onChange={(e) => updateConfig("workspaceId", e.target.value)}
                placeholder="workspace-id"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              <div className="text-xs text-gray-400 mt-2">
                * Application Insights will be created with web application type by default.
              </div>
            </>
          )}

          {/* ===== Log Analytics Workspace (Azure) ===== */}
          {moduleId === "log_analytics" && provider === "azure" && (
            <>
              {renderLabel("Region", "region", "Region where the Log Analytics workspace will be deployed. Must be in the selected region (e.g., eastus).")}
              <select
                value={config.region || "eastus"}
                onChange={(e) => updateConfig("region", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="eastus">East US</option>
                <option value="westeurope">West Europe</option>
                <option value="southeastasia">Southeast Asia</option>
                <option value="brazilsouth">Brazil South</option>
              </select>
              {renderLabel("SKU", "sku", "Pricing tier for the workspace (PerGB2018, CapacityReservation, etc.).")}
              <select
                value={config.sku || "PerGB2018"}
                onChange={(e) => updateConfig("sku", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="PerGB2018">Per GB (2018)</option>
                <option value="CapacityReservation">Capacity Reservation</option>
                <option value="Standalone">Standalone</option>
              </select>
              {renderLabel("Retention Days", "retentionDays", "Number of days to retain logs (default: 30).")}
              <input
                type="number"
                min="30"
                max="730"
                value={config.retentionDays || 30}
                onChange={(e) => updateConfig("retentionDays", parseInt(e.target.value))}
                placeholder="30"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              <div className="text-xs text-gray-400 mt-2">
                * Tags will be added automatically for tracking purposes.
              </div>
            </>
          )}

          {/* ===== Advisor Alert (Azure) ===== */}
          {moduleId === "advisor_alert" && provider === "azure" && (
            <>
              {renderLabel("Region", "region", "Region where the advisor alert will be deployed. Must be in the selected region (e.g., eastus).")}
              <select
                value={config.region || "eastus"}
                onChange={(e) => updateConfig("region", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="eastus">East US</option>
                <option value="westeurope">West Europe</option>
                <option value="southeastasia">Southeast Asia</option>
                <option value="brazilsouth">Brazil South</option>
              </select>
              {renderLabel("Admin Email", "adminEmail", "Email address to receive advisor recommendations.", true)}
              <input
                type="email"
                value={config.adminEmail || ""}
                onChange={(e) => updateConfig("adminEmail", e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Slack Webhook URL", "slackWebhookUrl", "Optional: Slack webhook URL to receive alerts (leave empty if not using Slack).")}
              <input
                type="text"
                value={config.slackWebhookUrl || ""}
                onChange={(e) => updateConfig("slackWebhookUrl", e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              <div className="text-xs text-gray-400 mt-2">
                * Alert will be configured to trigger on all Azure Advisor recommendations.
              </div>
            </>
          )}

          {/* ===== Security Center (Azure) ===== */}
          {moduleId === "security_center" && provider === "azure" && (
            <>
              {renderLabel("Tier", "tier", "Security Center pricing tier (Free or Standard).")}
              <select
                value={config.tier || "Standard"}
                onChange={(e) => updateConfig("tier", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="Free">Free</option>
                <option value="Standard">Standard</option>
              </select>
              <div className="text-xs text-gray-400 mt-2">
                * Security Center provides unified security management and advanced threat protection across hybrid cloud workloads.
              </div>
            </>
          )}
        </>
      )}

      {/* ===== Application Insights (Azure) ===== */}
{moduleId === "applications_insights" && provider === "azure" && (
  <>
    {renderLabel("Application Type", "applicationType", "Type of application to monitor. Web = websites/apps; Worker = background services; Other = custom.", true)}
    <select
      value={config.applicationType || "web"}
      onChange={(e) => updateConfig("applicationType", e.target.value)}
      className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
    >
      <option value="web">Web Application</option>
      <option value="worker">Worker Service</option>
      <option value="other">Other</option>
    </select>

    {renderLabel("Retention Days", "retentionDays", "Number of days to retain telemetry data (minimum 30, maximum 730). Default: 30.", true)}
    <input
      type="number"
      min="30"
      max="730"
      value={config.retentionDays || 30}
      onChange={(e) => updateConfig("retentionDays", parseInt(e.target.value))}
      placeholder="30"
      className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
    />
      <div className="text-xs text-gray-400 mt-2">
    </div>
  </>
)}

      { /* ===== Azure Queue Storage (Azure) ===== */}
{moduleId === "azure_queuestorage" && provider === "azure" && (
<>

  {renderLabel("Account Tier", "accountTier", "Performance tier for the storage account (Standard or Premium).")}
  <select
    value={config.accountTier || "Standard"}
    onChange={(e) => updateConfig("accountTier", e.target.value)}
    className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
  >
    <option value="Standard">Standard</option>
    <option value="Premium">Premium</option>
  </select>

  {renderLabel("Replication Type", "replicationType", "Redundancy option for the storage account (LRS, ZRS, GRS, etc.).")}
  <select
    value={config.replicationType || "LRS"}
    onChange={(e) => updateConfig("replicationType", e.target.value)}
    className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
  >
    <option value="LRS">Locally Redundant (LRS)</option>
    <option value="ZRS">Zone Redundant (ZRS)</option>
    <option value="GRS">Geo-Redundant (GRS)</option>
    <option value="GZRS">Geo-Zone Redundant (GZRS)</option>
  </select>

  {/* Optional: Add metadata or tags */}
  {renderLabel("Tags", "tags", "Key-value pairs for tagging the resource (optional). Format: key1=value1,key2=value2")}
  <input
    type="text"
    value={config.tags || ""}
    onChange={(e) => updateConfig("tags", e.target.value)}
    placeholder="Environment=Production,Service=QueueStorage"
    className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
  />
</>
)}
    </div>
  );
};

export default ModuleConfigForm;
