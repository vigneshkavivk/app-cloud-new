// src/components/DashBoard.tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  RefreshCw,
  Database,
  Package,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Cloud,
  Server,
  Layers,
  Globe,
  Zap,
  MapPin,
  Plus,
  FileText,
  Bell,
  Download,
  Shield,
  BarChart2 as BarChartIcon,
  ArrowLeft,
  AlertTriangle,
  Info,
  Layers as LayersIcon,
  Database as DatabaseIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import api from "../interceptor/api.interceptor";
import { useAuth } from "../hooks/useAuth";
import SupportTicketModal from "./SupportTicketModal";

// 🔁 Reuse same service name formatting as backend (with extra null-safety)
const formatServiceName = (raw: unknown): string => {
  if (typeof raw !== "string") return "Other";
  return raw
    .replace(/Amazon\s*|\s*AWS\s*/gi, "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[-\s]+|[-\s]+$/g, "") || "Other";
};

// === Types ===
interface ActivityLog {
  action: string;
  timestamp: string;
  status: "success" | "failed";
}
interface CloudAccount {
  _id?: string;
  accountId: string;
  accountName: string;
  awsRegion: string;
  iamUserName: string;
  arn: string;
}
interface AzureAccount {
  _id?: string;
  subscriptionId: string;
  accountName: string;
  tenantId: string;
  clientId: string;
}
interface GcpAccount {
  _id?: string;
  projectId: string;
  projectName: string;
}
interface Cluster {
  _id?: string;
  name?: string;
  clusterName?: string;
  status?: string;
  region?: string;
  nodeCount?: number | string | null;
  version?: string;
  accountId?: string;
  liveNodeCount?: number;
  provider?: string;
  subscriptionId?: string;
  resourceGroup?: string;
}
interface GithubDetails {
  orgs: { id: string; login: string; avatar_url?: string }[];
  repos: { id: number; name: string; full_name: string; private: boolean }[];
  installation?: { id: number; account: { login: string; type: string }; created_at: string; updated_at: string };
}
interface DeployedTool {
  _id?: string;
  selectedTool: string;
  selectedCluster: string;
  status: string;
  createdAt: string;
}
interface CostBreakdownItem {
  service: string;
  cost: number;
}
interface CostData {
  total: number;
  currency: string;
  breakdown: CostBreakdownItem[];
  accountName: string;
  month: string;
}
interface TrendPoint {
  date: string;
  total: number;
  breakdown: Record<string, number>;
}
interface ForecastPoint {
  date: string;
  mean: number;
  min: number;
  max: number;
}
interface ResourceUtilizationItem {
  used: number;
  total: number;
  percent: number;
  unit?: string;
}
interface ResourceCounts {
  EC2: number;
  S3: number;
  RDS: number;
  Lambda: number;
  Others: number;
  storage?: ResourceUtilizationItem;
  cpu?: ResourceUtilizationItem;
  memory?: ResourceUtilizationItem;
}
interface BudgetItem {
  name: string;
  type: string;
  amount: number;
  currency: string;
  actual: number;
  forecast: number;
  status: string;
}

const formatTimeAgo = (input: string | Date): string => {
  if (!input) return "Unknown";
  const now = new Date();
  const past = input instanceof Date ? input : new Date(input);
  if (isNaN(past.getTime())) return "Invalid date";
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) > 1 ? "s" : ""} ago`;
};

const SVGLineChart = ({
  data,
  width = 200,
  height = 40,
  color = "#3b82f6"
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) => {
  if (data.length === 0) return <div className="text-gray-500 text-sm">No trend data</div>;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="mt-2">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        fill="none"
        stroke="#374151"
        strokeWidth="1"
      />
    </svg>
  );
};

const SVGPieChart = ({ data, size = 200 }: { data: { name: string; value: number }[], size?: number }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="text-gray-500 text-sm">No data</div>;
  const radius = size / 2;
  const centerX = radius;
  const centerY = radius;
  let cumulativePercent = 0;
  const slices = data.map((item, index) => {
    const percent = item.value / total;
    const startAngle = cumulativePercent * 2 * Math.PI;
    const endAngle = (cumulativePercent + percent) * 2 * Math.PI;
    cumulativePercent += percent;
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    const largeArcFlag = percent > 0.5 ? 1 : 0;
    const pathData = [`M ${centerX} ${centerY}`, `L ${x1} ${y1}`, `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, `Z`].join(" ");
    const COLORS = ["#3b82f6", "#22d3ee", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
    return <path key={index} d={pathData} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
  });
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices}
        <circle cx={centerX} cy={centerY} r={radius * 0.4} fill="#0f172a" />
        <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14" fontWeight="600">
          {Math.round(total * 100) / 100}
        </text>
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {data.map((item, i) => {
          const COLORS = ["#3b82f6", "#22d3ee", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
          const percent = ((item.value / total) * 100).toFixed(0);
          return (
            <div key={i} className="flex items-center">
              <div className="w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-gray-300">{formatServiceName(item.name)}: {percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const InfoTooltip = ({ metricKey, show, onClose }: { metricKey: string; show: boolean; onClose: () => void }) => {
  const metricInfo: Record<string, string> = {
    "Active Clusters": "Number of Kubernetes clusters currently running in your cloud (e.g., EKS, GKE).",
    Databases: "Total databases (e.g., RDS, DynamoDB) actively provisioned across your accounts.",
    Resources: "Combined count of core cloud resources — EC2, S3, RDS, Lambda, and others.",
    "Tools in Use": "Number of DevOps or observability tools (e.g., Prometheus, ArgoCD) deployed on your clusters.",
    "GitHub Status": "Indicates whether your GitHub account is connected and authorized. Green = ready to go.",
    "Connected Accounts": "How many cloud provider accounts (e.g., AWS prod, staging, dev) are linked.",
  };
  const content = metricInfo[metricKey] || "No information available.";
  if (!show) return null;
  return (
    <div
      className="absolute z-50 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg text-sm text-gray-200"
      style={{ top: "-125px", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}
    >
      <div className="font-medium text-cyan-300 mb-1">{metricKey}</div>
      <div>{content}</div>
    </div>
  );
};

const DashBoard = ({ user }: { user?: { name?: string } }) => {
  const { hasPermission } = useAuth();
  const canViewDashboard = hasPermission("Overall", "Read");
  if (!canViewDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0b14] to-[#06070f] text-white">
        <div className="text-center p-8 max-w-md">
          <Shield className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">🔒 Access Denied</h2>
          <p className="text-gray-300">
            You need <span className="font-mono">Overall.Read</span> permission to view the dashboard.
          </p>
        </div>
      </div>
    );
  }

  // === States ===
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [awsClusters, setAwsClusters] = useState<Cluster[]>([]);
  const [azureClusters, setAzureClusters] = useState<Cluster[]>([]);
  const [gcpClusters, setGcpClusters] = useState<Cluster[]>([]);
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>("aws");
  const [databases, setDatabases] = useState(0);
  const [awsAccounts, setAwsAccounts] = useState<CloudAccount[]>([]);
  const [azureAccounts, setAzureAccounts] = useState<AzureAccount[]>([]);
  const [gcpAccounts, setGcpAccounts] = useState<GcpAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ REMOVED: recentActivity, githubConnected, githubDetails, latestGithubUsername

  const [deployedToolsCount, setDeployedToolsCount] = useState<number>(0);
  const [deployedTools, setDeployedTools] = useState<DeployedTool[]>([]);
  const [activeClustersModalOpen, setActiveClustersModalOpen] = useState(false);
  const [cloudServicesModalOpen, setCloudServicesModalOpen] = useState(false);
  const [githubDetailsModalOpen, setGithubDetailsModalOpen] = useState(false);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [databasesModalOpen, setDatabasesModalOpen] = useState(false);
  const [databaseDetails, setDatabaseDetails] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("ec2");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [costSummary, setCostSummary] = useState<CostData | null>(null);
  const [costTrend, setCostTrend] = useState<TrendPoint[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint | null>(null);
  const [resourceCounts, setResourceCounts] = useState<ResourceCounts | null>(null);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [costLoading, setCostLoading] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);
  const [hasCostPermission, setHasCostPermission] = useState<boolean | null>(null);
  const [resourcesModalOpen, setResourcesModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // ✅ REPLACED: Per-cluster expandable detail states
  const [expandedClusterKey, setExpandedClusterKey] = useState<string | null>(null);
  const [expandedClusterDetails, setExpandedClusterDetails] = useState<Record<string, any>>({});
  const [expandedClusterLoading, setExpandedClusterLoading] = useState<Record<string, boolean>>({});

  // ✅ NEW: AWS Resource Counts State
  const [awsResourceCounts, setAwsResourceCounts] = useState<{
    ec2: number;
    vpc: number;
    clusters: number;
    s3: number;
    lambda: number;
    loadBalancers: number;
  } | null>(null);

  // ✅ NEW: Detailed resource data states
  const [ec2Instances, setEc2Instances] = useState<any[]>([]);
  const [vpcDetails, setVpcDetails] = useState<any[]>([]);
  const [loadBalancerDetails, setLoadBalancerDetails] = useState<any[]>([]);
  const [clusterDetails, setClusterDetails] = useState<any[]>([]);
  const [s3Buckets, setS3Buckets] = useState<any[]>([]);
  const [lambdaFunctions, setLambdaFunctions] = useState<any[]>([]);

  // ✅ NEW: Loading states for each tab
  const [isVpcsLoading, setIsVpcsLoading] = useState(false);
  const [isLoadBalancersLoading, setIsLoadBalancersLoading] = useState(false);
  const [isS3BucketsLoading, setIsS3BucketsLoading] = useState(false);
  const [isLambdaFunctionsLoading, setIsLambdaFunctionsLoading] = useState(false);
  const [isEc2Loading, setIsEc2Loading] = useState(false);
  const [isClustersLoading, setIsClustersLoading] = useState(false);

  const sectionsRef = {
    ec2: useRef<HTMLDivElement>(null),
    vpc: useRef<HTMLDivElement>(null),
    loadbalancers: useRef<HTMLDivElement>(null),
    clusters: useRef<HTMLDivElement>(null),
    namespaces: useRef<HTMLDivElement>(null),
    services: useRef<HTMLDivElement>(null),
    workloads: useRef<HTMLDivElement>(null),
    s3: useRef<HTMLDivElement>(null),
    lambda: useRef<HTMLDivElement>(null),
  };

  const getProviderDisplayName = (provider: string): string => {
    switch (provider) {
      case "aws": return "AWS";
      case "azure": return "Azure";
      case "gcp": return "GCP";
      default: return "Unknown";
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      if (activeTooltip) setActiveTooltip(null);
    };
    if (activeTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeTooltip]);

  const handleTicketSubmit = async (data: { type: string; subject: string; description: string }) => {
    try {
      await api.post("/api/support/ticket", data);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || "Failed to submit ticket.");
    }
  };

  useEffect(() => {
    if (selectedProviderFilter === "all") {
      setSelectedProvider(null);
      setSelectedAccountId(null);
      return;
    }
    const providerMap: Record<string, string | undefined> = {
      aws: "aws",
      azure: "azure",
      gcp: "gcp",
    };
    const targetProvider = providerMap[selectedProviderFilter];
    if (!targetProvider) return;
    if (selectedProvider !== targetProvider) {
      setSelectedProvider(targetProvider);
      let firstId: string | null = null;
      if (targetProvider === "aws" && awsAccounts.length > 0) {
        firstId = awsAccounts[0]._id;
      } else if (targetProvider === "azure" && azureAccounts.length > 0) {
        firstId = azureAccounts[0].subscriptionId;
      } else if (targetProvider === "gcp" && gcpAccounts.length > 0) {
        firstId = gcpAccounts[0].projectId;
      }
      setSelectedAccountId(firstId);
    }
  }, [selectedProviderFilter, awsAccounts, azureAccounts, gcpAccounts, selectedProvider]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // ✅ REMOVED: cachedGithubLogin logic

    try {
      const [
        awsClustersRes,
        azureClustersRes,
        gcpClustersRes,
        accountsRes,
        azureAccountsRes,
        gcpAccountsRes,
        // ❌ REMOVED: activityRes, githubStatusRes
        databasesRes,
        deploymentsCountRes,
        deploymentsListRes,
      ] = await Promise.all([
        api.get("/api/aws/eks-clusters").catch(() => ({ data: [] })),
        (async () => {
          try {
            const accountsRes = await api.get("/api/azure/accounts");
            const accounts = accountsRes.data || [];
            let allClusters = [];
            for (const acc of accounts) {
              try {
                const aksRes = await api.get(`/api/azure/aks-clusters?accountId=${acc._id}`);
                const clusters = (aksRes.data || []).map((c: any) => {
                  let clusterName = c.name || c.clusterName;
                  if (!clusterName && c.id) {
                    const parts = c.id.split("/");
                    clusterName = parts[parts.length - 1];
                  }
                  return {
                    name: clusterName || "unknown",
                    region: c.region || c.location || "unknown",
                    version: c.version || c.kubernetesVersion || "unknown",
                    liveNodeCount: c.liveNodeCount || c.nodeCount || 0,
                    account: acc.subscriptionId,
                    accountName: acc.accountName,
                    provider: "azure",
                    accountId: acc._id,
                    subscriptionId: acc.subscriptionId,
                    resourceGroup: c.resourceGroup || 'N/A',
                  };
                });
                allClusters.push(...clusters);
              } catch (err) {
                console.warn(`⚠️ Skip Azure account: ${acc.accountName}`, (err as Error).message);
              }
            }
            return { data: allClusters };
          } catch (err) {
            console.warn("Azure clusters fetch failed:", (err as Error).message);
            return { data: [] };
          }
        })(),
        api.get("/api/gcp/gke-clusters").catch(() => ({ data: [] })),
        api.get("/api/aws/get-aws-accounts").catch(() => ({ data: [] })),
        api.get("/api/azure/accounts").catch(() => ({ data: [] })),
        api.get("/api/gcp/accounts").catch(() => ({ data: [] })),
        // ❌ REMOVED: api.get("/api/get-recent-activity")
        // ❌ REMOVED: api.get("/api/github/status")
        api.get("/api/get-databases").catch(() => ({ data: [] })),
        api.get("/api/deployments/count").catch(() => ({ data: { count: 0 } })),
        api.get("/api/deployments/list").catch(() => ({ data: [] })),
      ]);

      const accounts = Array.isArray(accountsRes.data) ? accountsRes.data : [];
      setAwsAccounts(accounts);
      setAzureAccounts(Array.isArray(azureAccountsRes.data) ? azureAccountsRes.data : []);
      setGcpAccounts(Array.isArray(gcpAccountsRes.data) ? gcpAccountsRes.data : []);
      setAwsClusters(Array.isArray(awsClustersRes.data) ? awsClustersRes.data : []);
      setAzureClusters(Array.isArray(azureClustersRes.data) ? azureClustersRes.data : []);
      setGcpClusters(Array.isArray(gcpClustersRes.data) ? gcpClustersRes.data : []);
      setDatabases(Array.isArray(databasesRes.data) ? databasesRes.data.length : 0);
      // ❌ REMOVED: setRecentActivity(...)
      // ❌ REMOVED: setGithubConnected(...)

      setDeployedToolsCount(deploymentsCountRes?.data?.count ?? 0);
      setDeployedTools(Array.isArray(deploymentsListRes.data) ? deploymentsListRes.data : []);

      try {
        const dbActivityRes = await api.get("/api/database/activity").catch(() => ({ data: [] }));
        const liveDBs = dbActivityRes.data.filter((db: any) => db.action === "create" && !db.isDeploying);
        setDatabaseDetails(liveDBs);
      } catch (dbErr) {
        console.warn("DB activity fetch failed:", dbErr);
      }

      // ✅ REMOVED: GitHub username fetch

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [/* user?.name removed */]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const res = await api.get("/api/notifications");
      const data = Array.isArray(res.data.notifications) ? res.data.notifications : [];
      setNotifications(data);
      setHasUnreadNotifications(data.some((n: any) => !n.read));
    } catch (err) {
      console.warn("Failed to fetch notifications");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const notifInterval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(notifInterval);
  }, [fetchNotifications]);

  const fetchAllCostData = async (provider: string, accountId: string) => {
    if (!provider || !accountId || costLoading) return;
    setHasCostPermission(null);
    setCostLoading(true);
    setCostError(null);
    setCostSummary(null);
    setCostTrend([]);
    setForecast(null);
    setResourceCounts(null);
    setBudgets([]);

    try {
      let baseUrl = "";
      switch (provider) {
        case "aws":
          baseUrl = "/api/costs";
          break;
        case "azure":
          baseUrl = "/api/azure-costs";
          break;
        case "gcp":
          baseUrl = "/api/gcp-costs";
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      const paramKey = provider === "azure" ? "subscriptionId" : "accountId";
      const paramValue = accountId;
      await api.get(`${baseUrl}/summary?${paramKey}=${encodeURIComponent(paramValue)}`, { timeout: 12000 });
      setHasCostPermission(true);
      const [summaryRes, trendRes, forecastRes, resourcesRes, budgetsRes] = await Promise.allSettled([
        api.get(`${baseUrl}/summary?${paramKey}=${encodeURIComponent(paramValue)}`),
        api.get(`${baseUrl}/trend?${paramKey}=${encodeURIComponent(paramValue)}`),
        api.get(`${baseUrl}/forecast?${paramKey}=${encodeURIComponent(paramValue)}`),
        api.get(`${baseUrl}/resources?${paramKey}=${encodeURIComponent(paramValue)}`),
        api.get(`${baseUrl}/budgets?${paramKey}=${encodeURIComponent(paramValue)}`),
      ]);
      if (summaryRes.status === "fulfilled") setCostSummary(summaryRes.value.data);
      if (trendRes.status === "fulfilled") setCostTrend(trendRes.value.data.trend || []);
      if (forecastRes.status === "fulfilled") {
        const data = forecastRes.value.data.forecast;
        setForecast(data && Array.isArray(data) && data.length > 0 ? data[0] : null);
      }
      if (resourcesRes.status === "fulfilled") setResourceCounts(resourcesRes.value.data.counts || null);
      if (budgetsRes.status === "fulfilled") setBudgets(budgetsRes.value.data.budgets || []);
    } catch (err: any) {
      console.warn(`[Dashboard] Account ${accountId} (${provider}) access check:`, err.message);
      if (err.response?.status === 403) {
        setHasCostPermission(false);
        setCostError(`🔒 You don’t have permission to view cost or resource data for this ${getProviderDisplayName(provider)} account.`);
      } else {
        setHasCostPermission(null);
        setCostError(`⚠️ Data unavailable: ${err.message}`);
      }
    } finally {
      setCostLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProvider && selectedAccountId) {
      fetchAllCostData(selectedProvider, selectedAccountId);
      const interval = setInterval(() => fetchAllCostData(selectedProvider, selectedAccountId), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [selectedProvider, selectedAccountId]);

  // ✅ NEW: Fetch live AWS resource counts
  const fetchAwsResources = useCallback(async (accountId: string) => {
    if (!accountId) return;
    try {
      const res = await api.get(`/api/aws/${accountId}/metrics`);
      setAwsResourceCounts({
        ec2: res.data.ec2 || 0,
        vpc: res.data.vpcs || 0,
        clusters: res.data.clusters || 0,
        s3: res.data.s3Buckets || 0,
        lambda: res.data.lambdaFunctions || 0,
        loadBalancers: res.data.loadBalancers || 0,
      });
    } catch (err) {
      console.error("Failed to fetch AWS resources:", err);
      setAwsResourceCounts(null);
    }
  }, []);

  useEffect(() => {
    if (selectedProvider === "aws" && selectedAccountId) {
      fetchAwsResources(selectedAccountId);
    }
  }, [selectedProvider, selectedAccountId, fetchAwsResources]);

  // ✅ NEW: Fetch detailed data per tab WITH LOADING STATES
  const fetchEc2Instances = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setIsEc2Loading(true);
    try {
      const res = await api.get(`/api/aws/${accountId}/ec2`);
      setEc2Instances(res.data);
    } catch (err) {
      console.error("Failed to fetch EC2 instances:", err);
      setEc2Instances([]);
    } finally {
      setIsEc2Loading(false);
    }
  }, []);

  const fetchVpcs = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setIsVpcsLoading(true);
    try {
      const res = await api.post(`/api/aws/get-vpcs`, { accountId });
      setVpcDetails(res.data.vpcsList || []);
    } catch (err) {
      console.error("Failed to fetch VPCs:", err);
      setVpcDetails([]);
    } finally {
      setIsVpcsLoading(false);
    }
  }, []);

  const fetchLoadBalancers = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setIsLoadBalancersLoading(true);
    try {
      const res = await api.post(`/api/aws/${accountId}/load-balancers`, { accountId });
      setLoadBalancerDetails(res.data.loadBalancerList || []);
    } catch (err) {
      console.error("Failed to fetch Load Balancers:", err);
      setLoadBalancerDetails([]);
    } finally {
      setIsLoadBalancersLoading(false);
    }
  }, []);

  const fetchClusters = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setIsClustersLoading(true);
    try {
      const res = await api.get(`/api/aws/${accountId}/clusters`);
      setClusterDetails(res.data);
    } catch (err) {
      console.error("Failed to fetch Clusters:", err);
      setClusterDetails([]);
    } finally {
      setIsClustersLoading(false);
    }
  }, []);

  const fetchS3Buckets = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setIsS3BucketsLoading(true);
    try {
      const res = await api.post(`/api/aws/${accountId}/s3`, { accountId });
      setS3Buckets(res.data.s3BucketsList || []);
    } catch (err) {
      console.error("Failed to fetch S3 Buckets:", err);
      setS3Buckets([]);
    } finally {
      setIsS3BucketsLoading(false);
    }
  }, []);

  const fetchLambdaFunctions = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setIsLambdaFunctionsLoading(true);
    try {
      const res = await api.post(`/api/aws/${accountId}/lambda`, { accountId });
      setLambdaFunctions(res.data.lambdaFunctionsList || []);
    } catch (err) {
      console.error("Failed to fetch Lambda Functions:", err);
      setLambdaFunctions([]);
    } finally {
      setIsLambdaFunctionsLoading(false);
    }
  }, []);

  // ✅ Auto-fetch detailed data when tab changes
  useEffect(() => {
    if (selectedProvider === "aws" && selectedAccountId) {
      switch (activeTab) {
        case "ec2":
          fetchEc2Instances(selectedAccountId);
          break;
        case "vpc":
          fetchVpcs(selectedAccountId);
          break;
        case "loadbalancers":
          fetchLoadBalancers(selectedAccountId);
          break;
        case "clusters":
          fetchClusters(selectedAccountId);
          break;
        case "s3":
          fetchS3Buckets(selectedAccountId);
          break;
        case "lambda":
          fetchLambdaFunctions(selectedAccountId);
          break;
        default:
          break;
      }
    }
  }, [activeTab, selectedProvider, selectedAccountId, fetchEc2Instances, fetchVpcs, fetchLoadBalancers, fetchClusters, fetchS3Buckets, fetchLambdaFunctions]);

  // ✅ NEW: Toggle expandable cluster details (copied from ActiveClusterPage)
  const toggleExpandCluster = async (cluster: Cluster) => {
    const key = `${cluster.provider}-${cluster.name || 'unnamed'}`;
    if (expandedClusterKey === key) {
      setExpandedClusterKey(null);
      return;
    }
    // Only fetch live data for Azure
    if (cluster.provider !== 'azure') {
      setExpandedClusterKey(key);
      return;
    }
    setExpandedClusterKey(key);
    setExpandedClusterLoading(prev => ({ ...prev, [key]: true }));
    setExpandedClusterDetails(prev => ({ ...prev, [key]: null }));
    try {
      const res = await api.get(
        `/api/azure/aks-cluster/${encodeURIComponent(cluster.name!)}?accountId=${encodeURIComponent(cluster.accountId!)}`
      );
      setExpandedClusterDetails(prev => ({ ...prev, [key]: res.data }));
    } catch (err: any) {
      console.error("Failed to fetch Azure cluster details:", err);
      setExpandedClusterDetails(prev => ({
        ...prev,
        [key]: { error: "Failed to load live data from Azure." }
      }));
    } finally {
      setExpandedClusterLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // ✅ Auto-load Azure cluster statuses on page load
  const preloadAzureStatuses = useCallback(() => {
    azureClusters.forEach((cluster) => {
      if (cluster.provider === 'azure') {
        const key = `${cluster.provider}-${cluster.name || 'unnamed'}`;
        if (!expandedClusterDetails[key] && !expandedClusterLoading[key]) {
          toggleExpandCluster(cluster);
        }
      }
    });
  }, [azureClusters, expandedClusterDetails, expandedClusterLoading]);

  useEffect(() => {
    if (azureClusters.length > 0) {
      preloadAzureStatuses();
    }
  }, [azureClusters, preloadAzureStatuses]);

  const filteredClusters = useMemo(() => {
    if (selectedProviderFilter === "all") {
      return [...awsClusters, ...azureClusters, ...gcpClusters];
    }
    switch (selectedProviderFilter) {
      case "aws":
        return awsClusters;
      case "azure":
        return azureClusters;
      case "gcp":
        return gcpClusters;
      default:
        return [];
    }
  }, [selectedProviderFilter, awsClusters, azureClusters, gcpClusters]);

  const filteredTools = useMemo(() => {
    if (selectedProviderFilter === "all") return deployedTools;
    const accountIds = new Set<string>();
    if (selectedProviderFilter === "aws") {
      awsAccounts.forEach((acc) => accountIds.add(acc.accountId));
    } else if (selectedProviderFilter === "azure") {
      azureAccounts.forEach((acc) => accountIds.add(acc.subscriptionId));
    } else if (selectedProviderFilter === "gcp") {
      gcpAccounts.forEach((acc) => accountIds.add(acc.projectId));
    }
    return deployedTools.filter((tool) => {
      const cluster = [...awsClusters, ...azureClusters, ...gcpClusters].find(
        (c) => c.name === tool.selectedCluster || c.clusterName === tool.selectedCluster
      );
      return cluster && accountIds.has(cluster.accountId || "");
    });
  }, [deployedTools, awsClusters, azureClusters, gcpClusters, awsAccounts, azureAccounts, gcpAccounts, selectedProviderFilter]);

  const filteredResourceCounts = useMemo(() => {
    if (!resourceCounts || !selectedAccountId || !selectedProvider) {
      return selectedProviderFilter === "all" ? resourceCounts : null;
    }
    // For AWS, use live fetched data if available
    if (selectedProvider === "aws" && awsResourceCounts) {
      return {
        EC2: awsResourceCounts.ec2,
        S3: awsResourceCounts.s3,
        RDS: 0,
        Lambda: awsResourceCounts.lambda,
        Others: awsResourceCounts.loadBalancers + awsResourceCounts.vpc + awsResourceCounts.clusters,
        storage: resourceCounts.storage,
        cpu: resourceCounts.cpu,
        memory: resourceCounts.memory,
      };
    }
    const isAws = awsAccounts.some((acc) => acc.accountId === selectedAccountId);
    const isAzure = azureAccounts.some((acc) => acc.subscriptionId === selectedAccountId);
    const isGcp = gcpAccounts.some((acc) => acc.projectId === selectedAccountId);
    const match =
      (selectedProviderFilter === "aws" && isAws) ||
      (selectedProviderFilter === "azure" && isAzure) ||
      (selectedProviderFilter === "gcp" && isGcp) ||
      selectedProviderFilter === "all";
    return match ? resourceCounts : null;
  }, [
    resourceCounts,
    selectedAccountId,
    selectedProvider,
    awsAccounts,
    azureAccounts,
    gcpAccounts,
    selectedProviderFilter,
    awsResourceCounts
  ]);

  const filteredConnectedAccountsCount = useMemo(() => {
    if (selectedProviderFilter === "all") {
      return awsAccounts.length + azureAccounts.length + gcpAccounts.length;
    }
    if (selectedProviderFilter === "aws") return awsAccounts.length;
    if (selectedProviderFilter === "azure") return azureAccounts.length;
    if (selectedProviderFilter === "gcp") return gcpAccounts.length;
    return 0;
  }, [awsAccounts, azureAccounts, gcpAccounts, selectedProviderFilter]);

  // ❌ REMOVED: filteredRecentActivity

  const safeNumber = (val: unknown): number => (typeof val === "number" ? val : 0);
  const formatCost = (num: number): string => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };
  const getUtilizationColor = (percent: number): string => {
    if (percent >= 90) return "bg-red-600";
    if (percent >= 70) return "bg-orange-700";
    return "bg-green-500";
  };
  const generateTrendData = (baseValue = 30): { day: number; value: number }[] => {
    return Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      value: Math.max(0, baseValue + Math.floor(Math.random() * 10 - 5)),
    }));
  };
  const scrollToSection = (tabKey: string) => {
    if (sectionsRef[tabKey as keyof typeof sectionsRef]?.current) {
      sectionsRef[tabKey as keyof typeof sectionsRef].current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const refreshData = () => {
    setLastUpdated(new Date().toLocaleTimeString());
    fetchData();
    if (selectedProvider && selectedAccountId) {
      fetchAllCostData(selectedProvider, selectedAccountId);
    }
  };

  // ❌ REMOVED: resolvedGithubUsername

  const quickActions = [
    {
      key: "add-resource",
      label: "Add Resource",
      subtitle: "To View In Resource Overview",
      icon: <Plus size={24} className="text-emerald-400" />,
      onClick: () => alert("Add Resource clicked!"),
    },
    {
      key: "view-logs",
      label: "View Logs",
      subtitle: "Check activity logs",
      icon: <FileText size={24} className="text-blue-400" />,
      onClick: () => alert("View Logs clicked!"),
    },
    {
      key: "set-alerts",
      label: "Set Alerts",
      subtitle: "Configure notifications",
      icon: <Bell size={24} className="text-yellow-400" />,
      onClick: () => alert("Set Alerts clicked!"),
    },
    {
      key: "export-report",
      label: "Export Report",
      subtitle: "Download CSV/PDF",
      icon: <Download size={24} className="text-cyan-400" />,
      onClick: () => alert("Export Report clicked!"),
    },
    {
      key: "security",
      label: "Security",
      subtitle: "Review policies",
      icon: <Shield size={24} className="text-green-400" />,
      onClick: () => alert("Security clicked!"),
    },
    {
      key: "analytics",
      label: "Analytics",
      subtitle: "Deep insights",
      icon: <BarChartIcon size={24} className="text-purple-400" />,
      onClick: () => alert("Analytics clicked!"),
    },
  ];

  const overviewCards = [
    {
      key: "vpc",
      label: "VPCs",
      value: selectedProvider === "aws" && awsResourceCounts ? awsResourceCounts.vpc : (filteredResourceCounts?.EC2 || 0),
      icon: <MapPin size={24} className="text-orange-400" />
    },
    {
      key: "ec2",
      label: "EC2",
      value: selectedProvider === "aws" && awsResourceCounts ? awsResourceCounts.ec2 : (filteredResourceCounts?.EC2 || 0),
      icon: <Cpu size={24} className="text-amber-400" />
    },
    {
      key: "clusters",
      label: "Clusters",
      value: selectedProvider === "aws" && awsResourceCounts ? awsResourceCounts.clusters : (filteredClusters.length),
      icon: <Server size={24} className="text-blue-400" />
    },
    {
      key: "namespaces",
      label: "Namespaces",
      value: databaseDetails.length,
      icon: <Layers size={24} className="text-emerald-400" />
    },
    {
      key: "pods",
      label: "Pods",
      value: filteredResourceCounts?.Others || 0,
      icon: <Package size={24} className="text-violet-400" />
    },
    {
      key: "loadbalancers",
      label: "Load Balancers",
      value: selectedProvider === "aws" && awsResourceCounts ? awsResourceCounts.loadBalancers : (filteredResourceCounts?.Others || 0),
      icon: <Network size={24} className="text-purple-400" />
    },
    {
      key: "s3",
      label: "S3 Buckets",
      value: selectedProvider === "aws" && awsResourceCounts ? awsResourceCounts.s3 : (filteredResourceCounts?.S3 || 0),
      icon: <HardDrive size={24} className="text-indigo-400" />
    },
    {
      key: "lambda",
      label: "Lambda Functions",
      value: selectedProvider === "aws" && awsResourceCounts ? awsResourceCounts.lambda : (filteredResourceCounts?.Lambda || 0),
      icon: <Zap size={24} className="text-yellow-400" />
    },
    {
      key: "workloads",
      label: "Workloads",
      value: filteredTools.length,
      icon: <Cloud size={24} className="text-cyan-400" />
    },
    {
      key: "services",
      label: "Services",
      value: filteredResourceCounts?.RDS || 0,
      icon: <Globe size={24} className="text-green-400" />
    },
  ];

  const getChangeBadgeClass = (change: number) => {
    if (change > 0) return "bg-green-500/20 text-green-400 border border-green-500/30";
    if (change < 0) return "bg-red-500/20 text-red-400 border border-red-500/30";
    return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
  };

  const budgetStatusColor = (status: string) => {
    switch (status) {
      case "ALARM":
        return "text-red-400";
      case "OK":
        return "text-green-400";
      default:
        return "text-yellow-400";
    }
  };

  const pieData = useMemo(() => {
    if (!costSummary?.breakdown) return [];
    return costSummary.breakdown
      .filter((item) => item.cost > 0)
      .map((item) => ({
        name: formatServiceName(item.service),
        value: item.cost,
      }))
      .filter((item) => item.value > 0);
  }, [costSummary]);

  const trendValues = useMemo(() => costTrend.map((p) => p.total), [costTrend]);

  const getStatusClass = (status: string | undefined) => {
    const s = (status || 'unknown').toLowerCase();
    if (s === 'running') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    if (s === 'stopped') return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
    if (s === 'degraded') return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
    return 'bg-gray-500/20 text-gray-300';
  };

  const getStatusText = (status: string | undefined) => {
    const s = (status || 'unknown').toLowerCase();
    if (s === 'running') return 'Running';
    if (s === 'stopped') return 'Stopped';
    if (s === 'degraded') return 'Degraded';
    return 'Unknown';
  };

  return (
    <>
      <style>
        {`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
.dashboard-root {
min-height: 100vh;
background:
radial-gradient(circle at 10% 20%, rgba(30, 58, 138, 0.08) 0%, transparent 30%),
radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.05) 0%, transparent 40%),
linear-gradient(125deg, #0a0d1a 0%, #0b0e1c 35%, #0c1020 65%, #0d1124 100%);
color: #e5e7eb;
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
overflow-x: hidden;
position: relative;
}
.grid-overlay {
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
background-image:
linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px),
linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
background-size: 40px 40px;
pointer-events: none;
z-index: -2;
}
.animated-gradient {
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
background: conic-gradient(
from 0deg,
#38bdf8,   /* Light Peacock Blue */
#60a5fa,   /* Soft Sky Blue */
#7dd3fc,   /* Ultra Light Peacock */
#38bdf8
);
background-size: 300% 300%;
animation: gradientShift 28s ease-in-out infinite;
opacity: 0.08;
filter: blur(65px);
z-index: -1;
}
@keyframes gradientShift {
0% { background-position: 0% 50%; }
50% { background-position: 100% 50%; }
100% { background-position: 0% 50%; }
}
.floating-particle {
position: absolute;
border-radius: 50%;
pointer-events: none;
background: radial-gradient(circle, #38bdf8 0%, transparent 70%);
box-shadow: 0 0 15px rgba(56, 189, 248, 0.3);
animation: float 8s ease-in-out infinite;
}
@keyframes float {
0%, 100% {
transform: translate(0, 0) rotate(0deg);
opacity: 0.2;
}
25% {
transform: translate(10px, -15px) rotate(90deg);
opacity: 0.5;
}
50% {
transform: translate(20px, 10px) rotate(180deg);
opacity: 0.3;
}
75% {
transform: translate(-10px, 20px) rotate(270deg);
opacity: 0.6;
}
}
.text-peacock-400 { color: #38bdf8; }
.text-peacock-500 { color: #60a5fa; }
.text-peacock-300 { color: #7dd3fc; }
.text-gray-300 { color: #d1d5db; }
`}
      </style>
      <div className="dashboard-root">
        <div className="grid-overlay" />
        <div className="animated-gradient" />
        {[{ top: "10%", left: "5%" }, { top: "25%", left: "85%" }, { top: "65%", left: "18%" }, { top: "82%", left: "75%" }].map((p, i) => (
          <div
            key={i}
            className="floating-particle"
            style={{
              top: p.top,
              left: p.left,
              width: "3px",
              height: "3px",
              background: "rgba(56, 189, 248, 0.5)",
              boxShadow: "0 0 10px rgba(56, 189, 248, 0.5)",
              animation: "float 40s infinite ease-in-out",
              animationDelay: `${i * 4}s`,
            }}
          />
        ))}
        <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.history.back()}
                  className="p-2 text-gray-400 hover:text-white rounded-full bg-gray-800"
                  aria-label="Back"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <h1 className="text-4xl red-orange-gradient-text font-bold">
                    {selectedProvider ? `${getProviderDisplayName(selectedProvider)} Cloud` : "Cloud Infrastructure"}
                  </h1>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    Connected
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">Last synced: {lastUpdated || "—"}</span>
                <button
                  onClick={refreshData}
                  disabled={loading}
                  className={`flex items-center justify-center gap-1 px-3 py-1.5 text-sm rounded-md transition-all ${
                    loading ? "bg-gray-800 cursor-not-allowed" : "bg-gray-800 hover:bg-orange-800 hover:text-white hover:shadow-md"
                  }`}
                  aria-label="Refresh data"
                >
                  {loading ? (
                    <div className="loader" style={{ "--size": 0.3, width: "20px", height: "20px" } as React.CSSProperties}>
                      <div className="box"></div>
                    </div>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Refresh
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <select
                value={selectedProviderFilter}
                onChange={(e) => setSelectedProviderFilter(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-sm text-white pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[120px]"
              >
                <option value="aws">AWS</option>
                <option value="azure">Azure</option>
                <option value="gcp">GCP</option>
              </select>
              <select
                value={selectedAccountId || ""}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-sm text-white pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[200px]"
                disabled={
                  (selectedProvider === "aws" && !awsAccounts.length) ||
                  (selectedProvider === "azure" && !azureAccounts.length) ||
                  (selectedProvider === "gcp" && !gcpAccounts.length)
                }
              >
                <option value="" disabled>
                  Select an account...
                </option>
                {selectedProvider === "aws" &&
                  awsAccounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.accountName} ({acc.accountId.slice(-6)}, {acc.awsRegion})
                    </option>
                  ))
                }
                {selectedProvider === "azure" &&
                  azureAccounts.map((acc) => (
                    <option key={acc.subscriptionId} value={acc.subscriptionId}>
                      {acc.accountName || "Azure Account"} ({acc.subscriptionId.slice(-6)})
                    </option>
                  ))
                }
                {selectedProvider === "gcp" &&
                  gcpAccounts.map((acc) => (
                    <option key={acc.projectId} value={acc.projectId}>
                      {acc.projectName} ({acc.projectId})
                    </option>
                  ))
                }
              </select>
            </div>
            <div className="text-sm text-gray-400 mb-2">
              {selectedProvider === "aws" && `Amazon Web Services • ${awsAccounts.find(a => a.accountId === selectedAccountId)?.accountName} • ${awsAccounts.find(a => a.accountId === selectedAccountId)?.awsRegion || 'N/A'}`}
              {selectedProvider === "azure" && `Microsoft Azure • ${azureAccounts.find(a => a.subscriptionId === selectedAccountId)?.accountName} • ${azureAccounts.find(a => a.subscriptionId === selectedAccountId)?.tenantId || 'N/A'}`}
              {selectedProvider === "gcp" && `Google Cloud Platform • ${gcpAccounts.find(a => a.projectId === selectedAccountId)?.projectName} • ${gcpAccounts.find(a => a.projectId === selectedAccountId)?.projectId || 'N/A'}`}
            </div>
            <hr className="border-t border-gray-700 my-6" />

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="red-orange-gradient-text text-xl font-bold mb-4 flex items-center gap-2">
                <Zap size={20} className="text-yellow-400" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {quickActions.map((action) => (
                  <div
                    key={action.key}
                    onClick={action.onClick}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all cursor-pointer group"
                  >
                    <div className="p-3 bg-black/20 rounded-lg group-hover:bg-black/30 transition-colors">
                      {action.icon}
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-white">{action.label}</div>
                      <div className="text-xs text-gray-400 mt-1">{action.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource Overview */}
            <div className="mb-8">
              <h2 className="red-orange-gradient-text text-xl font-bold mb-4 flex items-center gap-2">
                <BarChartIcon size={20} className="text-blue-400" />
                Resource Overview
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {overviewCards.map((card, i) => (
                  <div
                    key={i}
                    onClick={() => scrollToSection(card.key)}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 w-full h-36 hover:bg-white/10 transition-all cursor-pointer relative group"
                  >
                    {card.icon}
                    <div className="text-2xl font-bold text-white">{card.value}</div>
                    <div className="text-sm text-gray-400">{card.label}</div>
                    <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/20 rounded-xl transition-opacity pointer-events-none"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Credits & Cost Overview */}
            {(selectedProvider && selectedAccountId) && (
              <div className="mb-8">
                <h2 className="red-orange-gradient-text text-xl font-bold mb-4 flex items-center gap-2">
                  <Database size={20} className="text-emerald-400" />
                  Credits & Cost Overview
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white/5 bg-gradient-to-r from-teal-900/30 via-cyan-900/30 to-blue-900/30 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">Cost Breakdown (Top 10)</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 bg-black/20 px-2 py-1 rounded">Current Month</span>
                        <button
                          onClick={() => {
                            let csvContent = "";
                            if (!costSummary || !Array.isArray(costSummary.breakdown)) {
                              csvContent = "Service,Cost,Percent of Total\nNo data available";
                            } else {
                              const data = costSummary.breakdown
                                .filter((item): item is CostBreakdownItem => typeof item.cost === 'number' && item.cost > 0)
                                .sort((a, b) => b.cost - a.cost)
                                .slice(0, 10)
                                .map((item) => ({
                                  Service: item.service,
                                  Cost: formatCost(item.cost),
                                  PercentOfTotal: costSummary.total
                                    ? ((item.cost / costSummary.total) * 100).toFixed(1) + "%"
                                    : "0%",
                                }));
                              csvContent = [
                                ["Service", "Cost", "Percent of Total"],
                                ...data.map((row) => [row.Service, row.Cost, row.PercentOfTotal]),
                              ]
                                .map((row) => row.join(","))
                                .join("\n");
                            }
                            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                            const link = document.createElement("a");
                            const url = URL.createObjectURL(blob);
                            link.setAttribute("href", url);
                            link.setAttribute("download", `cost_breakdown_${new Date().toISOString().split("T")[0]}.csv`);
                            link.style.visibility = "hidden";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded-md text-white transition-colors"
                          title="Export as CSV"
                        >
                          📤 Export
                        </button>
                      </div>
                    </div>
                    <div className="mb-4 pb-3 border-b border-gray-700/50">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-medium">Overall Cost</span>
                        <span className="text-xl font-bold text-emerald-400">
                          {costSummary ? formatCost(safeNumber(costSummary.total)) : "—"}
                        </span>
                      </div>
                    </div>
                    {costSummary?.breakdown && costSummary.breakdown.length > 0 ? (
                      <ul className="space-y-3">
                        {Object.entries(costSummary.breakdown)
                          .map(([service, cost]) => ({
                            service,
                            cost: typeof cost === 'number' ? cost : 0,
                          }))
                          .filter((item): item is { service: string; cost: number } => typeof item.cost === 'number' && item.cost > 0)
                          .sort((a, b) => b.cost - a.cost)
                          .slice(0, 10)
                          .map(({ service, cost }, idx) => {
                            const percent = costSummary?.total ? ((safeNumber(cost) / safeNumber(costSummary.total)) * 100).toFixed(1) : 0;
                            return (
                              <li key={service} className="group p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex items-start gap-2.5">
                                    <span className="text-xs text-gray-500 w-5 font-mono">{idx + 1}.</span>
                                    <div>
                                      <span className="font-medium text-white">{service}</span>
                                      <div className="text-xs text-gray-400 mt-0.5">{safeNumber(percent)}% of total</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <div className="font-bold text-white">{formatCost(cost)}</div>
                                    </div>
                                    <div className="w-20 h-8">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={generateTrendData(cost)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                          <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#10B981"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                          />
                                          <XAxis dataKey="day" hide />
                                          <YAxis hide />
                                          <Tooltip
                                            content={({ payload }) => {
                                              if (!payload || !payload[0]) return null;
                                              return (
                                                <div className="bg-gray-900 p-2 rounded shadow-lg border border-gray-700">
                                                  <div className="text-xs text-gray-300">Day {payload[0].payload.day}</div>
                                                  <div className="text-sm font-bold text-white">{formatCost(payload[0].value)}</div>
                                                </div>
                                              );
                                            }}
                                            wrapperStyle={{ zIndex: 100 }}
                                          />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                    ) : (
                      <p className="text-gray-400 text-sm italic">No cost data available this month.</p>
                    )}
                  </div>
                  <div className="bg-white/5 bg-gradient-to-r from-blue-900/30 via-cyan-900/30 to-teal-900/30 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Resource Utilization</h3>
                    {["storage", "cpu", "memory"].map((key) => {
                      const val = resourceCounts?.[key as keyof ResourceCounts] as ResourceUtilizationItem | undefined;
                      if (!val) return null;
                      const used = safeNumber(val.used);
                      const total = safeNumber(val.total);
                      const percent = safeNumber(val.percent);
                      const unit = val.unit || (key === "cpu" ? "vCPU" : "GB");
                      return (
                        <div
                          key={key}
                          onClick={() => {
                            setSelectedResource(key);
                            setIsModalOpen(true);
                          }}
                          className="mb-4 last:mb-0 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors"
                        >
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                            <span>{used} / {total} {unit}</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getUtilizationColor(percent)}`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-right text-xs text-gray-400 mt-1">{percent}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable Tabs */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-2 tab-container">
                {[
                  { key: "ec2", label: `EC2 Instances (${selectedProvider === "aws" && awsResourceCounts ? awsResourceCounts.ec2 : (filteredResourceCounts?.EC2 || 0)})` },
                  { key: "vpc", label: `VPCs (${selectedProvider === "aws" && awsResourceCounts ? awsResourceCounts.vpc : (filteredResourceCounts?.EC2 || 0)})` },
                  { key: "loadbalancers", label: `Load Balancers (${selectedProvider === "aws" && awsResourceCounts ? awsResourceCounts.loadBalancers : (filteredResourceCounts?.Others || 0)})` },
                  { key: "clusters", label: `Clusters (${selectedProvider === "aws" && awsResourceCounts ? awsResourceCounts.clusters : filteredClusters.length})` },
                  { key: "s3", label: `S3 Buckets (${selectedProvider === "aws" && awsResourceCounts ? awsResourceCounts.s3 : (filteredResourceCounts?.S3 || 0)})` },
                  { key: "lambda", label: `Lambda Functions (${selectedProvider === "aws" && awsResourceCounts ? awsResourceCounts.lambda : (filteredResourceCounts?.Lambda || 0)})` },
                  { key: "namespaces", label: `Namespaces (${databaseDetails.length})` },
                  { key: "services", label: `Services (${filteredResourceCounts?.RDS || 0})` },
                  { key: "workloads", label: `Workloads (${filteredTools.length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      scrollToSection(tab.key);
                      setActiveTab(tab.key);
                    }}
                    className={`px-3 py-2 rounded-md text-sm font-small whitespace-nowrap transition-all ${
                      activeTab === tab.key
                        ? "bg-gradient-to-r from-red-800 to-orange-700"
                        : "bg-white/5 backdrop-blur-sm border border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              {/* EC2 Instances */}
              <div ref={sectionsRef.ec2}>
                {activeTab === "ec2" && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">EC2 Instances ({ec2Instances.length})</h3>
                    {isEc2Loading ? (
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500 mx-auto mb-2"></div>
                        <p className="text-gray-400">Fetching EC2 Instances...</p>
                      </div>
                    ) : ec2Instances.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ec2Instances.map((instance, idx) => (
                          <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white">{instance.name}</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${instance.state === 'running' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                {instance.state}
                              </span>
                            </div>
                            <div className="text-xs text-gray-300 space-y-1">
                              <div>Instance ID: {instance.instanceId}</div>
                              <div>Type: {instance.instanceType}</div>
                              <div>Region: {instance.availabilityZone}</div>
                              <div>Public IP: {instance.externalIp || "N/A"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No EC2 instances found.</p>
                    )}
                  </div>
                )}
              </div>

              {/* VPCs */}
              <div ref={sectionsRef.vpc}>
                {activeTab === "vpc" && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">VPCs ({vpcDetails.length})</h3>
                    {isVpcsLoading ? (
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500 mx-auto mb-2"></div>
                        <p className="text-gray-400">Fetching VPCs...</p>
                      </div>
                    ) : vpcDetails.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vpcDetails.map((vpc, idx) => (
                          <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white">{vpc.name}</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${vpc.state === 'available' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                {vpc.state}
                              </span>
                            </div>
                            <div className="text-xs text-gray-300 space-y-1">
                              <div>CIDR Block: {vpc.cidrBlock}</div>
                              <div>Subnets: {vpc.subnets?.length || 0}</div>
                              <div>Security Groups: {vpc.securityGroups?.length || 0}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No VPCs found.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Load Balancers */}
              <div ref={sectionsRef.loadbalancers}>
                {activeTab === "loadbalancers" && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Load Balancers ({loadBalancerDetails.length})</h3>
                    {isLoadBalancersLoading ? (
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500 mx-auto mb-2"></div>
                        <p className="text-gray-400">Fetching Load Balancers...</p>
                      </div>
                    ) : loadBalancerDetails.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loadBalancerDetails.map((lb, idx) => (
                          <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white">{lb.name}</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${lb.state === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                {lb.state}
                              </span>
                            </div>
                            <div className="text-xs text-gray-300 space-y-1">
                              <div>Type: {lb.type}</div>
                              <div>DNS: {lb.dnsName}</div>
                              <div>Region: {lb.region}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No Load Balancers found.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Clusters */}
              <div ref={sectionsRef.clusters}>
                {activeTab === "clusters" && (
                  <div>
                    {isClustersLoading ? (
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500 mx-auto mb-2"></div>
                        <p className="text-gray-400">Fetching Clusters...</p>
                      </div>
                    ) : filteredClusters.length > 0 ? (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">Available Clusters</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredClusters.map((cluster, idx) => {
                            const name = cluster.name || 'Unnamed';
                            const key = `${cluster.provider}-${name}`;
                            const isExpanded = expandedClusterKey === key;
                            const details = expandedClusterDetails[key];
                            const isLoading = expandedClusterLoading[key];
                            return (
                              <div
                                key={`${cluster.provider}-${name}-${idx}`}
                                className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all ${
                                  isExpanded ? 'ring-2 ring-cyan-500' : 'hover:bg-white/10'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-white">{name}</span>
                                  {cluster.provider === 'azure' && expandedClusterDetails[key] ? (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(expandedClusterDetails[key].status)}`}>
                                      {getStatusText(expandedClusterDetails[key].status)}
                                    </span>
                                  ) : (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass('running')}`}>
                                      Running
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-300 space-y-1 mb-3">
                                  <div>Provider: {getProviderDisplayName(cluster.provider || 'unknown')}</div>
                                  <div>Region: {cluster.region || 'N/A'}</div>
                                  <div>Nodes: {cluster.liveNodeCount ?? cluster.nodeCount ?? 'N/A'}</div>
                                </div>
                                {/* ✅ View More Details Button — Only for Azure */}
                                {cluster.provider === 'azure' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpandCluster(cluster);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp size={16} /> Hide details
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown size={16} /> View more details
                                      </>
                                    )}
                                  </button>
                                )}
                                {/* ✅ Expanded Details Section */}
                                {isExpanded && (
                                  <div className="mt-4 pt-4 border-t border-white/10">
                                    {isLoading ? (
                                      <div className="text-center py-3">
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-cyan-500 mx-auto"></div>
                                        <p className="mt-1 text-gray-300 text-sm">Loading live data from Azure...</p>
                                      </div>
                                    ) : details?.error ? (
                                      <div className="text-center py-3 text-red-400 text-sm">
                                        <AlertTriangle className="h-4 w-4 mx-auto mb-1" />
                                        <p>{details.error}</p>
                                      </div>
                                    ) : details ? (
                                      <>
                                        {/* Cluster Overview */}
                                        <div className="mb-3">
                                          <h4 className="font-medium text-white text-sm mb-2 flex items-center gap-1.5">
                                            <Server size={16} className="text-blue-400" /> Cluster Overview
                                          </h4>
                                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                                            <div><span className="text-gray-400">Status:</span> <span className={`font-mono ${details.status === 'running' ? 'text-emerald-300' : 'text-yellow-300'}`}>{details.status}</span></div>
                                            <div><span className="text-gray-400">Version:</span> <span className="font-mono text-cyan-300">{details.kubernetesVersion}</span></div>
                                            <div><span className="text-gray-400">Region:</span> <span className="font-mono text-cyan-300">{details.region}</span></div>
                                            <div><span className="text-gray-400">Zones:</span> <span className="font-mono text-white">{details.availabilityZones}</span></div>
                                            <div><span className="text-gray-400">Added:</span> <span className="font-mono text-white">{details.addedToAppAt}</span></div>
                                          </div>
                                        </div>
                                        <div className="border-t border-white/10 my-3"></div>
                                        {/* Account & Compute */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                          <div className="bg-[#111b2a] rounded-lg p-2.5">
                                            <h4 className="font-medium text-white text-sm mb-1.5 flex items-center gap-1.5">
                                              <Info size={16} className="text-purple-400" /> Account
                                            </h4>
                                            <div className="text-xs text-gray-300 space-y-1">
                                              <div><span className="text-gray-400">Name:</span> <span className="font-mono text-orange-300">{details.accountName}</span></div>
                                              <div><span className="text-gray-400">Sub ID:</span> <span className="font-mono text-white">{details.subscriptionId}</span></div>
                                              <div><span className="text-gray-400">RG:</span> <span className="font-mono text-white">{details.resourceGroup}</span></div>
                                            </div>
                                          </div>
                                          <div className="bg-[#111b2a] rounded-lg p-2.5">
                                            <h4 className="font-medium text-white text-sm mb-1.5 flex items-center gap-1.5">
                                              <LayersIcon size={16} className="text-purple-400" /> Compute
                                            </h4>
                                            <div className="text-xs text-gray-300 space-y-1">
                                              <div><span className="text-gray-400">Type:</span> <span className="font-mono text-white">{details.instanceType}</span></div>
                                              <div><span className="text-gray-400">Nodes:</span> <span className="font-mono text-white">{details.totalNodes}</span></div>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="border-t border-white/10 my-3"></div>
                                        {/* Capacity */}
                                        <div className="space-y-2.5">
                                          <h4 className="font-medium text-white text-sm flex items-center gap-1.5">
                                            <DatabaseIcon size={16} className="text-teal-400" /> Capacity
                                          </h4>
                                          <div>
                                            <div className="flex justify-between text-xs text-gray-300 mb-1">
                                              <span>vCPU ({details.totalVcpu})</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                              <div
                                                className="h-full rounded-full bg-cyan-500"
                                                style={{ width: `${Math.min(100, (details.totalVcpu / 10) * 100)}%` }}
                                              ></div>
                                            </div>
                                          </div>
                                          <div>
                                            <div className="flex justify-between text-xs text-gray-300 mb-1">
                                              <span>Memory ({details.totalMemory} GB)</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                              <div
                                                className="h-full rounded-full bg-emerald-500"
                                                style={{ width: `${Math.min(100, (parseFloat(details.totalMemory) / 16) * 100)}%` }}
                                              ></div>
                                            </div>
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-center py-3 text-gray-400 text-sm">
                                        No additional details available.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400 mb-4">No clusters found for the selected provider.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Other tabs remain unchanged */}
              <div ref={sectionsRef.namespaces}>
                {activeTab === "namespaces" && <p className="text-gray-400">Namespaces data will appear here.</p>}
              </div>
              <div ref={sectionsRef.workloads}>
                {activeTab === "workloads" && <p className="text-gray-400">Workloads data will appear here.</p>}
              </div>
              <div ref={sectionsRef.services}>
                {activeTab === "services" && <p className="text-gray-400">Services data will appear here.</p>}
              </div>

              {/* S3 Buckets */}
              <div ref={sectionsRef.s3}>
                {activeTab === "s3" && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">S3 Buckets ({s3Buckets.length})</h3>
                    {isS3BucketsLoading ? (
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500 mx-auto mb-2"></div>
                        <p className="text-gray-400">Fetching S3 Buckets...</p>
                      </div>
                    ) : s3Buckets.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {s3Buckets.map((bucket, idx) => (
                          <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                            <div className="font-medium text-white">{bucket.name}</div>
                            <div className="text-xs text-gray-300 space-y-1 mt-2">
                              <div>Region: {bucket.region}</div>
                              <div>Objects: {bucket.objects}</div>
                              <div>Size: {bucket.size}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No S3 buckets found.</p>
                    )}
                  </div>
                )}
              </div>

              <div ref={sectionsRef.lambda}>
                {activeTab === "lambda" && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Lambda Functions ({lambdaFunctions.length})</h3>
                    {isLambdaFunctionsLoading ? (
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500 mx-auto mb-2"></div>
                        <p className="text-gray-400">Fetching Lambda Functions...</p>
                      </div>
                    ) : lambdaFunctions.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lambdaFunctions.map((fn, idx) => (
                          <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                            <div className="font-medium text-white">{fn.functionName}</div>
                            <div className="text-xs text-gray-300 space-y-1 mt-2">
                              <div>Runtime: {fn.runtime}</div>
                              <div>Memory: {fn.memorySize} MB</div>
                              <div>Timeout: {fn.timeout} sec</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No Lambda functions found.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modals */}
            <SupportTicketModal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} onSubmit={handleTicketSubmit} />
            {isModalOpen && selectedResource && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                onClick={() => setIsModalOpen(false)}
              >
                <div
                  className="bg-gradient-to-br from-gray-900 via-blue-900/20 to-teal-900/20 border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold capitalize">{selectedResource} Usage Details</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-2xl">
                      &times;
                    </button>
                  </div>
                  <p className="text-gray-400">Detailed usage data would appear here.</p>
                  <div className="mt-6 flex justify-end">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-white">
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DashBoard;
