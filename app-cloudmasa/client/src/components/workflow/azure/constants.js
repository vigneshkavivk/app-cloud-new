// Azure Module Constants
// Pricing: Approx. USD/hour (unless noted) — based on common dev/test configs in East US
// Requirements: Used for dependency validation & auto-provisioning order

export const modules = [
  // 🔹 NETWORKING
  {
    id: "vnet",
    name: "Virtual Network",
    icon: "Network",
    price: { vnet: 0.01 }, // ~$7.30/month base fee (flat, not per hour)
    description: "Private, isolated network in Azure. Defines IP space, subnets, and security boundaries.",
    requirements: ["Subscription", "Region"],
    category: "networking",
  },
  {
    id: "vpn",
    name: "VPN Gateway",
    icon: "Lock",
    price: { gateway: 0.56 }, // ~$0.56/hr for VpnGw1 (≈$408/month)
    description: "Secure site-to-site or point-to-site connectivity to your Azure VNet.",
    requirements: ["vnet"],
    category: "networking",
  },
  {
    id: "dns",
    name: "DNS Zone",
    icon: "Globe",
    price: { zone: 0.50 }, // ~$0.50/month per zone + $0.40/million queries
    description: "Host DNS domains (e.g., example.com) in Azure. Public or private.",
    requirements: ["Subscription"],
    category: "networking",
  },
  {
    id: "frontdoor",
    name: "Front Door",
    icon: "Globe",
    price: { routing: "~$0.0005/GB" }, // Data processing + requests
    description: "Global HTTP load balancer with WAF, caching, and multi-region routing.",
    requirements: ["Subscription"],
    category: "networking",
  },

  // 🔹 COMPUTE
  {
    id: "vm",
    name: "Virtual Machine",
    icon: "Server",
    price: { instance: 0.041 }, // Standard_B2s: ~$0.041/hr (~$30/month)
    description: "On-demand Linux/Windows servers. Full OS control.",
    requirements: ["vnet"],
    category: "compute",
  },
  {
    id: "vmware",
    name: "VMware Solution (AVS)",
    icon: "Cloud",
    price: { cluster: "~$12,500/month" }, // 3-node cluster, estimate
    description: "Fully managed VMware Cloud on Azure. Run vSphere workloads natively.",
    requirements: ["Subscription", "Quota Approval"],
    category: "compute",
    isEnterprise: true,
  },
  {
    id: "aks",
    name: "AKS Cluster",
    icon: "Database",
    price: { controlPlane: 0.00, nodes: 0.102 }, // Control plane free; D2s_v3 ~$0.102/hr/node (~$74/node/month)
    description: "Managed Kubernetes service. Auto-upgrades, scaling, and monitoring.",
    requirements: ["vnet"],
    category: "compute",
  },
  {
    id: "function",
    name: "Function App",
    icon: "Code",
    price: { execution: "~$0.20/million" }, // ~$0.20 per million executions (Consumption)
    description: "Event-driven serverless compute. Pay per execution.",
    requirements: ["Storage Account"],
    category: "compute",
  },
  {
    id: "appservice",
    name: "App Service",
    icon: "Terminal",
    price: { plan: 0.013 }, // B1: ~$0.013/hr (~$9.50/month)
    description: "PaaS for web apps, APIs, and mobile backends. Built-in CI/CD, scaling.",
    requirements: ["Subscription"],
    category: "compute",
  },

  // 🔹 STORAGE & DATA
  {
    id: "storage",
    name: "Storage Account",
    icon: "Box",
    price: { base: "~$0.023/GB/month" }, // LRS, Hot tier — base cost varies by ops
    description: "Unified account for Blob, Queue, Table, and File storage.",
    requirements: ["Subscription", "Region"],
    category: "storage",
  },
  {
    id: "blob",
    name: "Blob Container",
    icon: "HardDrive",
    price: { storage: 0.0184 }, // Hot tier: ~$0.0184/GB/month
    description: "Object storage for unstructured data (images, logs, backups).",
    requirements: ["storage"],
    category: "storage",
  },
  {
    id: "files",
    name: "File Share",
    icon: "FolderOpen",
    price: { share: "~$0.06/GB/month" }, // Standard SMB/NFS
    description: "Fully managed SMB/NFS file shares — like AWS EFS.",
    requirements: ["storage"],
    category: "storage",
  },
  {
    id: "queue",
    name: "Storage Queue",
    icon: "Users",
    price: { ops: "~$0.00005/10k" }, // ~$0.05 per 100k operations
    description: "Simple, scalable queue service for decoupling apps (like SQS).",
    requirements: ["storage"],
    category: "messaging",
  },
  {
    id: "servicebus",
    name: "Service Bus",
    icon: "Users",
    price: { message: "~$0.05/million" }, // Standard tier
    description: "Enterprise messaging with queues, topics, sessions, and dead-lettering.",
    requirements: ["Subscription"],
    category: "messaging",
  },

  // 🔹 DATABASES
  {
    id: "sql",
    name: "SQL Database",
    icon: "Database",
    price: { compute: 0.19 }, // General Purpose (2 vCore): ~$0.19/hr (~$138/month)
    description: "Fully managed SQL Server database. High availability & auto-tuning.",
    requirements: ["Subscription"],
    category: "database",
  },
  {
    id: "cosmos",
    name: "Cosmos DB",
    icon: "Hash",
    price: { ru: "~$0.008/100 RU/s" }, // ~$6.24/month per 100 RU/s
    description: "Globally distributed NoSQL database. Multi-model (SQL, MongoDB, etc.).",
    requirements: ["Subscription"],
    category: "database",
  },

  // 🔹 SECURITY
  {
    id: "keyvault",
    name: "Key Vault",
    icon: "Lock",
    price: { secret: "~$0.03/10k" }, // Secrets: ~$0.03 per 10k transactions
    description: "Securely store keys, secrets, and certificates. Integrates with Azure services.",
    requirements: ["Subscription"],
    category: "security",
  },
];
