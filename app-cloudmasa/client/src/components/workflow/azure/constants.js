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
  // {
  //   id: "vpn",
  //   name: "VPN Gateway",
  //   icon: "Lock",
  //   price: { gateway: 0.56 }, // ~$0.56/hr for VpnGw1 (≈$408/month)
  //   description: "Secure site-to-site or point-to-site connectivity to your Azure VNet.",
  //   requirements: ["vnet"],
  //   category: "networking",
  // },
  // {
  //   id: "dns",
  //   name: "DNS Zone",
  //   icon: "Globe",
  //   price: { zone: 0.50 }, // ~$0.50/month per zone + $0.40/million queries
  //   description: "Host DNS domains (e.g., example.com) in Azure. Public or private.",
  //   requirements: ["Subscription"],
  //   category: "networking",
  // },
  // {
  //   id: "frontdoor",
  //   name: "Front Door",
  //   icon: "Globe",
  //   price: { routing: "~$0.0005/GB" }, // Data processing + requests
  //   description: "Global HTTP load balancer with WAF, caching, and multi-region routing.",
  //   requirements: ["Subscription"],
  //   category: "networking",
  // },

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
  // {
  //   id: "vmware",
  //   name: "VMware Solution (AVS)",
  //   icon: "Cloud",
  //   price: { cluster: "~$12,500/month" }, // 3-node cluster, estimate
  //   description: "Fully managed VMware Cloud on Azure. Run vSphere workloads natively.",
  //   requirements: ["Subscription", "Quota Approval"],
  //   category: "compute",
  //   isEnterprise: true,
  // },
  {
    id: "aks",
    name: "AKS Cluster",
    icon: "Database",
    price: { controlPlane: 0.00, nodes: 0.102 }, // Control plane free; D2s_v3 ~$0.102/hr/node (~$74/node/month)
    description: "Managed Kubernetes service. Auto-upgrades, scaling, and monitoring.",
    requirements: ["vnet"],
    category: "compute",
  },
  // {
  //   id: "function",
  //   name: "Function App",
  //   icon: "Code",
  //   price: { execution: "~$0.20/million" }, // ~$0.20 per million executions (Consumption)
  //   description: "Event-driven serverless compute. Pay per execution.",
  //   requirements: ["Storage Account"],
  //   category: "compute",
  // },
  // {
  //   id: "appservice",
  //   name: "App Service",
  //   icon: "Terminal",
  //   price: { plan: 0.013 }, // B1: ~$0.013/hr (~$9.50/month)
  //   description: "PaaS for web apps, APIs, and mobile backends. Built-in CI/CD, scaling.",
  //   requirements: ["Subscription"],
  //   category: "compute",
  // },
  {
    id: "logic_app",
    name: "Logic App",
    icon: "Flow",
    price: { execution: "~$0.0001/execution" }, // ~$0.0001 per execution
    description: "Automate workflows with visual designer. Connect to 500+ services.",
    requirements: ["Subscription", "Region"],
    category: "compute",
  },
  {
    id: "event_grid",
    name: "Event Grid",
    icon: "Bell",
    price: { event: "~$0.0001/event" }, // ~$0.0001 per event
    description: "Serverless event routing service. Publish-subscribe model for cloud events.",
    requirements: ["Subscription", "Region"],
    category: "messaging",
  },
  {
    id: "azure_ad",
    name: "Azure AD Application",
    icon: "Users",
    price: { app: 0.00 }, // Free
    description: "Register applications in Azure Active Directory for authentication and authorization.",
    requirements: ["Subscription"],
    category: "security",
  },

  // 🔹 STORAGE & DATA
  {
    id: "storage_account",
    name: "Storage Account",
    icon: "Box",
    price: { base: "~$0.023/GB/month" }, // LRS, Hot tier — base cost varies by ops
    description: "Unified account for Blob, Queue, Table, and File storage.",
    requirements: ["Subscription", "Region"],
    category: "storage",
  },
  {
    id: "blob_storage",
    name: "Blob Container",
    icon: "HardDrive",
    price: { storage: 0.0184 }, // Hot tier: ~$0.0184/GB/month
    description: "Object storage for unstructured data (images, logs, backups).",
    requirements: ["storage"],
    category: "storage",
  },
  {
    id: "azure_files",
    name: "File Share",
    icon: "FolderOpen",
    price: { share: "~$0.06/GB/month" }, // Standard SMB/NFS
    description: "Fully managed SMB/NFS file shares — like AWS EFS.",
    requirements: ["storage"],
    category: "storage",
  },
  {
    id: "azure_queuestorage",
    name: "Storage Queue",
    icon: "Users",
    price: { ops: "~$0.00005/10k" }, // ~$0.05 per 100k operations
    description: "Simple, scalable queue service for decoupling apps (like SQS).",
    requirements: ["storage"],
    category: "messaging",
  },
  // {
  //   id: "servicebus",
  //   name: "Service Bus",
  //   icon: "Users",
  //   price: { message: "~$0.05/million" }, // Standard tier
  //   description: "Enterprise messaging with queues, topics, sessions, and dead-lettering.",
  //   requirements: ["Subscription"],
  //   category: "messaging",
  // },

  // 🔹 DATABASES
  // {
  //   id: "sql",
  //   name: "SQL Database",
  //   icon: "Database",
  //   price: { compute: 0.19 }, // General Purpose (2 vCore): ~$0.19/hr (~$138/month)
  //   description: "Fully managed SQL Server database. High availability & auto-tuning.",
  //   requirements: ["Subscription"],
  //   category: "database",
  // },
  {
    id: "cosmos_db",
    name: "Cosmos DB",
    icon: "Hash",
    price: { ru: "~$0.008/100 RU/s" }, // ~$6.24/month per 100 RU/s
    description: "Globally distributed NoSQL database. Multi-model (SQL, MongoDB, etc.).",
    requirements: ["Subscription"],
    category: "database",
  },

  // 🔹 SECURITY & MONITORING
  {
    id: "key_vault",
    name: "Key Vault",
    icon: "Lock",
    price: { secret: "~$0.03/10k" }, // Secrets: ~$0.03 per 10k transactions
    description: "Securely store keys, secrets, and certificates. Integrates with Azure services.",
    requirements: ["Subscription"],
    category: "security",
  },
  {
    id: "applications_insights",
    name: "Application Insights",
    icon: "BarChart",
    price: { monitoring: "~$0.0001/telemetry" }, // ~$0.0001 per telemetry item
    description: "Monitor application performance, availability, and usage. Collect logs and metrics.",
    requirements: ["Subscription", "Resource Group"],
    category: "monitoring",
  },
  {
    id: "log_analytics",
    name: "Log Analytics Workspace",
    icon: "Search",
    price: { workspace: "~$2.30/GB" }, // ~$2.30 per GB of data ingested
    description: "Centralized logging and analytics. Store and query logs from multiple sources.",
    requirements: ["Subscription", "Resource Group"],
    category: "monitoring",
  },
  {
    id: "advisor_alert",
    name: "Advisor Alert",
    icon: "AlertTriangle",
    price: { alert: 0.00 }, // Free
    description: "Get alerts for Azure Advisor recommendations. Configure email/webhook notifications.",
    requirements: ["Subscription", "Resource Group"],
    category: "monitoring",
  },
  {
    id: "microsoft_defender",
    name: "Security Center",
    icon: "Shield",
    price: { security: 0.00 }, // Free tier available
    description: "Unified security management and advanced threat protection across hybrid cloud workloads.",
    requirements: ["Subscription"],
    category: "security",
  },
];
