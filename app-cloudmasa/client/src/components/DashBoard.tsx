// src/components/DashBoard.jsx (or wherever it's located)
"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Layers,
  DollarSign,
  Github,
  Server,
  Database,
  Zap,
  TrendingUp,
  Lock,
  Link2,
  PieChart as PieChartIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
} from "lucide-react";
import api from "../interceptor/api.interceptor";
import { useAuth } from "../hooks/useAuth";
import SupportTicketModal from './SupportTicketModal';

// 🔁 Reuse same service name formatting as backend (with extra null-safety)
const formatServiceName = (raw: unknown): string => {
  if (typeof raw !== 'string') return 'Other';
  return raw
    .replace(/Amazon\s*|\s*AWS\s*/gi, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[-\s]+|[-\s]+$/g, '') || 'Other';
};

// === Types ===
interface ActivityLog { action: string; timestamp: string; status: "success" | "failed"; }
interface CloudAccount { _id?: string; accountId: string; accountName: string; awsRegion: string; iamUserName: string; arn: string; }
interface AzureAccount { _id?: string; subscriptionId: string; accountName: string; tenantId: string; clientId: string; }
interface GcpAccount { _id?: string; projectId: string; projectName: string; }
interface Cluster { _id?: string; name?: string; clusterName?: string; status?: string; region?: string; nodeCount?: number | string | null; version?: string; accountId?: string; liveNodeCount?: number; }
interface GithubDetails { orgs: { id: string; login: string; avatar_url?: string }[]; repos: { id: number; name: string; full_name: string; private: boolean }[]; installation?: { id: number; account: { login: string; type: string }; created_at: string; updated_at: string; }; }
interface DeployedTool { _id?: string; selectedTool: string; selectedCluster: string; status: string; createdAt: string; }
interface CostBreakdownItem { service: string; cost: number; }
interface CostData { total: number; currency: string; breakdown: CostBreakdownItem[]; accountName: string; month: string; }
interface TrendPoint { date: string; total: number; breakdown: Record<string, number>; }
interface ForecastPoint { date: string; mean: number; min: number; max: number; }
interface ResourceCounts { EC2: number; S3: number; RDS: number; Lambda: number; Others: number; }
interface BudgetItem { name: string; type: string; amount: number; currency: string; actual: number; forecast: number; status: string; }

const formatTimeAgo = (isoString: string) => {
  if (!isoString) return "Unknown";
  const now = new Date();
  const past = new Date(isoString);
  if (isNaN(past.getTime())) return "Invalid date";
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) > 1 ? "s" : ""} ago`;
};

// ✅ Enhanced SVG Line Chart
const SVGLineChart = ({ data, width = 200, height = 40, color = "#3b82f6" }: { data: number[]; width?: number; height?: number; color?: string }) => {
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
      <rect x="0" y="0" width={width} height={height} fill="none" stroke="#374151" strokeWidth="1" />
    </svg>
  );
};

// ✅ SVG Pie Chart
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
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `Z`
    ].join(' ');
    const COLORS = ['#3b82f6', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return (
      <path
        key={index}
        d={pathData}
        fill={COLORS[index % COLORS.length]}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />
    );
  });
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices}
        <circle cx={centerX} cy={centerY} r={radius * 0.4} fill="#0f172a" />
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="14"
          fontWeight="600"
        >
          {Math.round(total * 100) / 100}
        </text>
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {data.map((item, i) => {
          const COLORS = ['#3b82f6', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
          const percent = ((item.value / total) * 100).toFixed(0);
          return (
            <div key={i} className="flex items-center">
              <div
                className="w-3 h-3 rounded-sm mr-1"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-gray-300">
                {formatServiceName(item.name)}: {percent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ✅ Unified Info Tooltip Component
const InfoTooltip = ({ metricKey, show, onClose }: { metricKey: string; show: boolean; onClose: () => void }) => {
  const metricInfo: Record<string, string> = {
    'Active Clusters': 'Number of Kubernetes clusters currently running in your cloud (e.g., EKS, GKE).',
    'Databases': 'Total databases (e.g., RDS, DynamoDB) actively provisioned across your accounts.',
    'Resources': 'Combined count of core cloud resources — EC2, S3, RDS, Lambda, and others.',
    'Tools in Use': 'Number of DevOps or observability tools (e.g., Prometheus, ArgoCD) deployed on your clusters.',
    'GitHub Status': 'Indicates whether your GitHub account is connected and authorized. Green = ready to go.',
    'Connected Accounts': 'How many cloud provider accounts (e.g., AWS prod, staging, dev) are linked.',
  };
  const content = metricInfo[metricKey] || 'No information available.';
  if (!show) return null;
  return (
    <div
      className="absolute z-50 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg text-sm text-gray-200"
      style={{
        top: '-125px',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}
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
          <Lock className="h-16 w-16 mx-auto text-red-500 mb-4" />
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
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [githubDetails, setGithubDetails] = useState<GithubDetails>({ orgs: [], repos: [], installation: null });
  const [deployedToolsCount, setDeployedToolsCount] = useState<number>(0);
  const [deployedTools, setDeployedTools] = useState<DeployedTool[]>([]);
  const [activeClustersModalOpen, setActiveClustersModalOpen] = useState(false);
  const [cloudServicesModalOpen, setCloudServicesModalOpen] = useState(false);
  const [githubDetailsModalOpen, setGithubDetailsModalOpen] = useState(false);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [databasesModalOpen, setDatabasesModalOpen] = useState(false);
  // ❌ REMOVED: clusterDetailModalOpen & selectedClusterDetail (no longer needed)
  const [databaseDetails, setDatabaseDetails] = useState<any[]>([]);
  const [latestGithubUsername, setLatestGithubUsername] = useState<string | null>(null);

  // ✅ Cost & Resource States (unchanged)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [costSummary, setCostSummary] = useState<CostData | null>(null);
  const [costTrend, setCostTrend] = useState<TrendPoint[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint | null>(null);
  const [resourceCounts, setResourceCounts] = useState<ResourceCounts | null>(null);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [costLoading, setCostLoading] = useState(false);
  const [costSummaryLoading, setCostSummaryLoading] = useState(false);
  const [costTrendLoading, setCostTrendLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);
  const [hasCostPermission, setHasCostPermission] = useState<boolean | null>(null);
  const [resourcesModalOpen, setResourcesModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // ✅ Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // ✅ Unified Tooltip State
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const getProviderDisplayName = (provider: string): string => {
    switch (provider) {
      case 'aws': return 'AWS';
      case 'azure': return 'Azure';
      case 'gcp': return 'GCP';
      default: return 'Unknown';
    }
  };

  // ✅ Click-away handler for tooltip
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeTooltip) setActiveTooltip(null);
    };
    if (activeTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeTooltip]);

  const handleTicketSubmit = async (data: { type: string; subject: string; description: string; }) => {
    try {
      await api.post("/api/support/ticket", data);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || "Failed to submit ticket.");
    }
  };

  useEffect(() => {
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'floating-particle';
      particle.style.width = `${Math.random() * 5 + 2}px`;
      particle.style.height = particle.style.width;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      document.body.appendChild(particle);
      setTimeout(() => {
        particle.remove();
      }, 8000);
    };
    const interval = setInterval(createParticle, 1500);
    return () => clearInterval(interval);
  }, []);

  // ✅ Auto-sync top filter ↔ cost section
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
        firstId = awsAccounts[0].accountId;
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
    const cachedGithubLogin = localStorage.getItem("scm_github_login");
    if (cachedGithubLogin) setLatestGithubUsername(cachedGithubLogin);
    try {
const [
awsClustersRes,
azureClustersRes,
gcpClustersRes,
accountsRes,
azureAccountsRes,
gcpAccountsRes,
activityRes,
githubStatusRes,
databasesRes,
deploymentsCountRes,
deploymentsListRes,
] = await Promise.all([
api.get("/api/aws/eks-clusters").catch(() => ({ data: [] })),
// ✅ FIXED: Fetch Azure clusters using existing logic (like AzureClustersPage)
(async () => {
  try {
    const accountsRes = await api.get('/api/azure/accounts');
    const accounts = accountsRes.data || [];
    let allClusters = [];
    for (const acc of accounts) {
      try {
        const aksRes = await api.get(`/api/azure/aks-clusters?accountId=${acc._id}`);
        const clusters = (aksRes.data || []).map(c => {
          let clusterName = c.name || c.clusterName;
          if (!clusterName && c.id) {
            const parts = c.id.split('/');
            clusterName = parts[parts.length - 1];
          }
          return {
            name: clusterName || 'unknown',
            region: c.region || c.location || 'unknown',
            version: c.version || c.kubernetesVersion || 'unknown',
            liveNodeCount: c.liveNodeCount || c.nodeCount || 0,
            account: acc.subscriptionId,
            accountName: acc.accountName,
            provider: 'azure',
          };
        });
        allClusters.push(...clusters);
      } catch (err) {
        console.warn(`⚠️ Skip Azure account: ${acc.accountName}`, err.message);
      }
    }
    return { data: allClusters };
  } catch (err) {
    console.warn('Azure clusters fetch failed:', err.message);
    return { data: [] };
  }
})(),
api.get("/api/gcp/gke-clusters").catch(() => ({ data: [] })),
api.get("/api/aws/get-aws-accounts").catch(() => ({ data: [] })),
api.get("/api/azure/accounts").catch(() => ({ data: [] })),
api.get("/api/gcp/accounts").catch(() => ({ data: [] })),
api.get("/api/get-recent-activity").catch(() => ({ data: [] })),
api.get("/api/github/status").catch(() => ({ data: { connected: false } })),
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
      setRecentActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
      setGithubConnected(githubStatusRes.data?.connected ?? false);
      setDeployedToolsCount(deploymentsCountRes?.data?.count ?? 0);
      setDeployedTools(Array.isArray(deploymentsListRes.data) ? deploymentsListRes.data : []);

      try {
        const dbActivityRes = await api.get("/api/database/activity").catch(() => ({ data: [] }));
        const liveDBs = dbActivityRes.data.filter((db: any) => db.action === 'create' && !db.isDeploying);
        setDatabaseDetails(liveDBs);
      } catch (dbErr) {
        console.warn("DB activity fetch failed:", dbErr);
      }

      if (user?.name) {
        try {
          const ghUserRes = await api.get(`/api/scm/connections/latest-github-username?userId=${encodeURIComponent(user.name)}`).catch(() => null);
          const fetchedLogin = ghUserRes?.data?.githubUsername || null;
          if (fetchedLogin) {
            setLatestGithubUsername(fetchedLogin);
            localStorage.setItem("scm_github_login", fetchedLogin);
          }
        } catch (ghErr) {
          console.warn("GitHub username fetch failed:", ghErr);
        }
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.name]);

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

  // ✅ FIXED: Removed &granularity=DAILY — Azure backend doesn’t expect it
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
      let baseUrl = '';
      switch (provider) {
        case 'aws':
          baseUrl = '/api/costs';
          break;
        case 'azure':
          baseUrl = '/api/azure-costs';
          break;
        case 'gcp':
          baseUrl = '/api/gcp-costs';
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      const paramKey = provider === 'azure' ? 'subscriptionId' : 'accountId';
      const paramValue = accountId;
      // Warm-up call to check permissions
      await api.get(`${baseUrl}/summary?${paramKey}=${encodeURIComponent(paramValue)}`, { timeout: 12000 });
      setHasCostPermission(true);
      const [
        summaryRes,
        trendRes,
        forecastRes,
        resourcesRes,
        budgetsRes,
      ] = await Promise.allSettled([
        api.get(`${baseUrl}/summary?${paramKey}=${paramValue}`),
        api.get(`${baseUrl}/trend?${paramKey}=${paramValue}`),
        api.get(`${baseUrl}/forecast?${paramKey}=${paramValue}`),
        api.get(`${baseUrl}/resources?${paramKey}=${paramValue}`),
        api.get(`${baseUrl}/budgets?${paramKey}=${paramValue}`),
      ]);
      if (summaryRes.status === 'fulfilled') setCostSummary(summaryRes.value.data);
      if (trendRes.status === 'fulfilled') setCostTrend(trendRes.value.data.trend || []);
      if (forecastRes.status === 'fulfilled') {
        const data = forecastRes.value.data.forecast;
        setForecast(data && Array.isArray(data) && data.length > 0 ? data[0] : null);
      }
      if (resourcesRes.status === 'fulfilled') setResourceCounts(resourcesRes.value.data.counts || null);
      if (budgetsRes.status === 'fulfilled') setBudgets(budgetsRes.value.data.budgets || []);
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
      setCostSummaryLoading(false);
      setCostTrendLoading(false);
      setForecastLoading(false);
      setResourcesLoading(false);
      setBudgetsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProvider && selectedAccountId) {
      fetchAllCostData(selectedProvider, selectedAccountId);
      const interval = setInterval(() => fetchAllCostData(selectedProvider, selectedAccountId), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [selectedProvider, selectedAccountId]);

  // ✅ FIXED: Added null-safety in pieData generation
  const pieData = useMemo(() => {
    if (!costSummary?.breakdown) return [];
    return costSummary.breakdown
      .filter(item => item.cost > 0)
      .map(item => ({
        name: formatServiceName(item.service),
        value: item.cost,
      }))
      .filter(item => item.value > 0);
  }, [costSummary]);
  const trendValues = useMemo(() => costTrend.map(p => p.total), [costTrend]);
  const budgetStatusColor = (status: string) => {
    switch (status) {
      case 'ALARM': return 'text-red-400';
      case 'OK': return 'text-green-400';
      default: return 'text-yellow-400';
    }
  };

  // 🔁 Filtered clusters by provider — SAFE VERSION
  const filteredClusters = useMemo(() => {
    if (selectedProviderFilter === "all") {
      return [...awsClusters, ...azureClusters, ...gcpClusters];
    }
    switch (selectedProviderFilter) {
      case "aws": return awsClusters;
      case "azure": return azureClusters;
      case "gcp": return gcpClusters;
      default: return [];
    }
  }, [selectedProviderFilter, awsClusters, azureClusters, gcpClusters]);

  // 🔁 Filtered tools by provider (via cluster → account mapping)
  const filteredTools = useMemo(() => {
    if (selectedProviderFilter === "all") return deployedTools;
    const accountIds = new Set<string>();
    if (selectedProviderFilter === "aws") {
      awsAccounts.forEach(acc => accountIds.add(acc.accountId));
    } else if (selectedProviderFilter === "azure") {
      azureAccounts.forEach(acc => accountIds.add(acc.subscriptionId));
    } else if (selectedProviderFilter === "gcp") {
      gcpAccounts.forEach(acc => accountIds.add(acc.projectId));
    }
    return deployedTools.filter(tool => {
      const cluster = [...awsClusters, ...azureClusters, ...gcpClusters].find(c => c.name === tool.selectedCluster || c.clusterName === tool.selectedCluster);
      return cluster && accountIds.has(cluster.accountId || "");
    });
  }, [deployedTools, awsClusters, azureClusters, gcpClusters, awsAccounts, azureAccounts, gcpAccounts, selectedProviderFilter]);

  // 🔁 Filtered resource counts
  const filteredResourceCounts = useMemo(() => {
    if (!resourceCounts || !selectedAccountId || !selectedProvider) {
      return selectedProviderFilter === "all" ? resourceCounts : null;
    }
    const isAws = awsAccounts.some(acc => acc.accountId === selectedAccountId);
    const isAzure = azureAccounts.some(acc => acc.subscriptionId === selectedAccountId);
    const isGcp = gcpAccounts.some(acc => acc.projectId === selectedAccountId);
    const match =
      (selectedProviderFilter === "aws" && isAws) ||
      (selectedProviderFilter === "azure" && isAzure) ||
      (selectedProviderFilter === "gcp" && isGcp) ||
      (selectedProviderFilter === "all");
    return match ? resourceCounts : null;
  }, [resourceCounts, selectedAccountId, selectedProvider, awsAccounts, azureAccounts, gcpAccounts, selectedProviderFilter]);

  // 🔁 Filtered connected accounts count
  const filteredConnectedAccountsCount = useMemo(() => {
    if (selectedProviderFilter === "all") {
      return awsAccounts.length + azureAccounts.length + gcpAccounts.length;
    }
    if (selectedProviderFilter === "aws") return awsAccounts.length;
    if (selectedProviderFilter === "azure") return azureAccounts.length;
    if (selectedProviderFilter === "gcp") return gcpAccounts.length;
    return 0;
  }, [awsAccounts, azureAccounts, gcpAccounts, selectedProviderFilter]);

  // ✅ Optional: Filter Recent Activity (e.g., by account)
  const filteredRecentActivity = useMemo(() => {
    if (selectedProviderFilter === "all") return recentActivity;
    const allowedIds = new Set<string>();
    if (selectedProviderFilter === "aws") awsAccounts.forEach(a => allowedIds.add(a.accountId));
    if (selectedProviderFilter === "azure") azureAccounts.forEach(a => allowedIds.add(a.subscriptionId));
    if (selectedProviderFilter === "gcp") gcpAccounts.forEach(a => allowedIds.add(a.projectId));
    return recentActivity.filter(act => {
      const accountId = act.action.match(/\b[A-Z0-9]{12,}\b/)?.[0] || '';
      return !accountId || allowedIds.has(accountId);
    });
  }, [recentActivity, awsAccounts, azureAccounts, gcpAccounts, selectedProviderFilter]);

  // ✅ GlassCard Reusable
  const GlassCard = ({ children, className = "", onClick }: { 
    children: React.ReactNode; 
    className?: string; 
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void; 
  }) => (
    <div
      className={`relative backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );

  // ✅ Modal Reusable
  const Modal = ({
    open,
    onClose,
    title,
    children,
  }: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) => {
    if (!open) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl bg-gradient-to-br from-[#0f172a] to-[#060a14] border border-white/10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl font-bold transition-colors ml-4"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          <div className="p-5 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    );
  };

  const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-white font-bold text-xl mb-6 uppercase tracking-wide">
      {children}
    </h2>
  );

  const resolvedGithubUsername = latestGithubUsername ||
    githubDetails?.installation?.account?.login ||
    'unknown';

  return (
    <>
      {/* ✅ Modern Cyberpunk Background */}
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
/* Optional: Subtle card glow */
.card-glow {
box-shadow: 0 4px 20px rgba(56, 189, 248, 0.08),
0 0 15px rgba(56, 189, 248, 0.05);
transition: box-shadow 0.3s ease;
}
.card-glow:hover {
box-shadow: 0 6px 25px rgba(56, 189, 248, 0.12),
0 0 20px rgba(56, 189, 248, 0.08);
}
/* Text colors */
.text-peacock-400 { color: #38bdf8; }
.text-peacock-500 { color: #60a5fa; }
.text-peacock-300 { color: #7dd3fc; }
.text-gray-300 { color: #d1d5db; }
`}
      </style>
      <div className="dashboard-root">
        <div className="grid-overlay" />
        <div className="animated-gradient" />
        {/* Floating Particles — Light Peacock Blue */}
        {[
          { top: '10%', left: '5%', color: 'rgba(56, 189, 248, 0.5)', delay: '0s' },
          { top: '25%', left: '85%', color: 'rgba(96, 165, 250, 0.5)', delay: '4s' },
          { top: '65%', left: '18%', color: 'rgba(125, 211, 252, 0.5)', delay: '8s' },
          { top: '82%', left: '75%', color: 'rgba(56, 189, 248, 0.55)', delay: '12s' },
        ].map((p, i) => (
          <div
            key={i}
            className="floating-particle"
            style={{
              top: p.top,
              left: p.left,
              width: '3px',
              height: '3px',
              background: p.color,
              boxShadow: `0 0 10px ${p.color}`,
              animation: `float 40s infinite ease-in-out`,
              animationDelay: p.delay
            }}
          />
        ))}
        <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            {/* ✅ Header */}
            <header className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-extrabold">
                    CLOUD INFRASTRUCTURE DASHBOARD
                  </span>
                  {user?.name && (
                    <span className="ml-3 text-white/80 font-normal text-lg md:text-xl">
                      {user.name}
                    </span>
                  )}
                </h1>
                {lastUpdated && (
                  <p className="text-sm mt-2 text-gray-400">Last updated: {lastUpdated}</p>
                )}
                {error && <p className="text-red-400 mt-2">{error}</p>}
              </div>
              <div className="flex items-center gap-3">
                {/* ✅ Provider Filter Dropdown — Top Right */}
                <div className="relative">
                  <select
                    value={selectedProviderFilter}
                    onChange={(e) => setSelectedProviderFilter(e.target.value)}
                    className="bg-gray-800/70 border border-gray-600 rounded-lg py-2 px-3 text-sm text-white pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[120px]"
                  >
                    <option value="aws">AWS</option>
                    <option value="azure">Azure</option>
                    <option value="gcp">GCP</option>
                  </select>
                  <svg
                    className="absolute right-2.5 top-2.5 w-3 h-3 text-gray-400 pointer-events-none"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {/* 🔔 Bell */}
                <button
                  onClick={(e) => { e.stopPropagation(); window.location.href = "/notifications"; }}
                  className="relative p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
                  aria-label="Notifications"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {hasUnreadNotifications && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0b1421]"></span>
                  )}
                </button>
                {/* ❓ Support */}
                <button
                  onClick={() => setSupportModalOpen(true)}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
                  aria-label="Raise Support Ticket"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12" y2="17" />
                  </svg>
                </button>
              </div>
            </header>

            {/* === METRICS OVERVIEW === */}
            <section className="mb-12">
              <SectionHeading>
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  ACCOUNT OVERVIEW
                </span>
              </SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <GlassCard
                    className="card-glow cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = selectedProviderFilter === "all"
                        ? "/sidebar/activecluster"
                        : `/sidebar/activecluster?provider=${selectedProviderFilter}`;
                      window.location.href = url;
                    }}
                  >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="bg-gradient-to-r red-orange-gradient-text bg-clip-text text-transparent font-bold flex items-center gap-1">
                        Active Clusters
                        <div className="relative">
                          <button 
                            onMouseEnter={() => setActiveTooltip('Active Clusters')} 
                            onMouseLeave={() => setActiveTooltip(null)} 
                            onClick={(e) => e.stopPropagation()} 
                            className="info-btn group" 
                            aria-label="Info"
                          >
                            <Info size={16} className="text-gray-400 group-hover:text-cyan-400" />
                          </button>
                          <InfoTooltip 
                            metricKey="Active Clusters" 
                            show={activeTooltip === 'Active Clusters'} 
                            onClose={() => setActiveTooltip(null)} 
                          />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-white mt-1">
                        {loading ? "..." : filteredClusters.length}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <Server size={24} className="text-cyan-400" />
                    </div>
                  </div>
                </GlassCard>
                <GlassCard className="card-glow" onClick={() => setDatabasesModalOpen(true)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="bg-gradient-to-r red-orange-gradient-text text-transparent font-bold flex items-center gap-1">
                        Databases
                        <div className="relative">
                          <button onMouseEnter={() => setActiveTooltip('Databases')} onMouseLeave={() => setActiveTooltip(null)} onClick={(e) => e.stopPropagation()} className="info-btn group" aria-label="Info">
                            <Info size={16} className="text-gray-400 group-hover:text-cyan-400" />
                          </button>
                          <InfoTooltip metricKey="Databases" show={activeTooltip === 'Databases'} onClose={() => setActiveTooltip(null)} />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-white mt-1">
                        {loading ? "..." : databaseDetails.length}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Database size={24} className="text-emerald-400" />
                    </div>
                  </div>
                </GlassCard>
                <GlassCard className="card-glow" onClick={() => setResourcesModalOpen(true)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="bg-gradient-to-r red-orange-gradient-text bg-clip-text text-transparent font-bold flex items-center gap-1">
                        Resources
                        <div className="relative">
                          <button onMouseEnter={() => setActiveTooltip('Resources')} onMouseLeave={() => setActiveTooltip(null)} onClick={(e) => e.stopPropagation()} className="info-btn group" aria-label="Info">
                            <Info size={16} className="text-gray-400 group-hover:text-cyan-400" />
                          </button>
                          <InfoTooltip metricKey="Resources" show={activeTooltip === 'Resources'} onClose={() => setActiveTooltip(null)} />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-white mt-1">
                        {filteredResourceCounts
                          ? filteredResourceCounts.EC2 + filteredResourceCounts.S3 + filteredResourceCounts.RDS + filteredResourceCounts.Lambda + filteredResourceCounts.Others
                          : loading || resourcesLoading ? "..." : "0"}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-violet-500/10">
                      <Layers size={24} className="text-violet-400" />
                    </div>
                  </div>
                </GlassCard>
              </div>
            </section>

            {/* === TOOLS OVERVIEW === */}
            <section className="mb-12">
              <SectionHeading>
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  TOOLS OVERVIEW
                </span>
              </SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <GlassCard className="card-glow" onClick={() => setToolsModalOpen(true)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-gradient-to-r red-orange-gradient-text bg-clip-text text-transparent font-bold flex items-center gap-1">
                      Tools in Use
                      <div className="relative">
                        <button onMouseEnter={() => setActiveTooltip('Tools in Use')} onMouseLeave={() => setActiveTooltip(null)} onClick={(e) => e.stopPropagation()} className="info-btn group" aria-label="Info">
                          <Info size={16} className="text-gray-400 group-hover:text-cyan-400" />
                        </button>
                        <InfoTooltip metricKey="Tools in Use" show={activeTooltip === 'Tools in Use'} onClose={() => setActiveTooltip(null)} />
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-violet-500/10">
                      <Layers size={20} className="text-violet-400" />
                    </div>
                  </div>
                  {loading ? (
                    <div className="h-8 bg-white/10 rounded w-32 animate-pulse"></div>
                  ) : (
                    <p className="text-4xl font-bold text-white">{filteredTools.length}</p>
                  )}
                </GlassCard>
              </div>
            </section>

            {/* === CONNECTION STATUS === */}
            <section className="mb-12">
              <SectionHeading>
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  CONNECTION STATUS
                </span>
              </SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <GlassCard className="card-glow" onClick={() => setGithubDetailsModalOpen(true)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-gradient-to-r red-orange-gradient-text bg-clip-text text-transparent font-bold flex items-center gap-1">
                      GitHub Status
                      <div className="relative">
                        <button onMouseEnter={() => setActiveTooltip('GitHub Status')} onMouseLeave={() => setActiveTooltip(null)} onClick={(e) => e.stopPropagation()} className="info-btn group" aria-label="Info">
                          <Info size={16} className="text-gray-400 group-hover:text-cyan-400" />
                        </button>
                        <InfoTooltip metricKey="GitHub Status" show={activeTooltip === 'GitHub Status'} onClose={() => setActiveTooltip(null)} />
                      </div>
                    </div>
                    <div className="p-2 rounded-lg">
                      {githubConnected === true ? (
                        <Github size={24} className="text-green-400" />
                      ) : githubConnected === false ? (
                        <Github size={24} className="text-rose-400" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-500 animate-pulse"></div>
                      )}
                    </div>
                  </div>
                  {githubConnected === true ? (
                    <p className="text-lg font-semibold text-green-400 flex items-center gap-2">
                      <CheckCircle size={16} /> Connected
                    </p>
                  ) : githubConnected === false ? (
                    <p className="text-lg font-semibold text-rose-400 flex items-center gap-2">
                      <AlertTriangle size={16} /> Not Connected
                    </p>
                  ) : (
                    <div className="h-6 bg-white/10 rounded w-32 animate-pulse"></div>
                  )}
                </GlassCard>
                <GlassCard className="card-glow" onClick={() => setCloudServicesModalOpen(true)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-gradient-to-r red-orange-gradient-text bg-clip-text text-transparent font-bold flex items-center gap-1">
                      Connected Accounts
                      <div className="relative">
                        <button onMouseEnter={() => setActiveTooltip('Connected Accounts')} onMouseLeave={() => setActiveTooltip(null)} onClick={(e) => e.stopPropagation()} className="info-btn group" aria-label="Info">
                          <Info size={16} className="text-gray-400 group-hover:text-cyan-400" />
                        </button>
                        <InfoTooltip metricKey="Connected Accounts" show={activeTooltip === 'Connected Accounts'} onClose={() => setActiveTooltip(null)} />
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Link2 size={24} className="text-blue-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {loading ? "..." : filteredConnectedAccountsCount}
                  </p>
                </GlassCard>
              </div>
            </section>

            {/* === LIVE COST & RESOURCES === */}
            <section className="mb-12">
              <SectionHeading>
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  LIVE COST & RESOURCES
                </span>
              </SectionHeading>
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="bg-gradient-to-r red-orange-gradient-text bg-clip-text text-transparent font-bold flex items-center gap-2">
                    <DollarSign size={20} />
                    {selectedProvider
                      ? `${getProviderDisplayName(selectedProvider)} Cost & Usage`
                      : 'Cloud Cost & Usage'}
                  </h3>
                  {costSummary && (
                    <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                      {costSummary.month}
                    </span>
                  )}
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-2">Select Cloud Provider</label>
                  <select
                    value={selectedProvider || ""}
                    onChange={(e) => {
                      setSelectedProvider(e.target.value);
                      setSelectedAccountId(null);
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="" disabled>Select a provider...</option>
                    <option value="aws">AWS</option>
                    <option value="azure">Azure</option>
                    <option value="gcp">GCP</option>
                  </select>
                </div>
                {selectedProvider && (
                  <div className="mb-5">
                    <label className="block text-sm text-gray-400 mb-2">
                      Select {getProviderDisplayName(selectedProvider)} Account
                    </label>
                    <div className="relative">
                      <select
                        value={selectedAccountId || ""}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="" disabled>Select an account...</option>
                        {selectedProvider === 'aws' && awsAccounts.map((acc) => (
                          <option
                            key={`${acc.accountId}-${acc.awsRegion}-${acc._id || 'no-id'}`}
                            value={acc.accountId}
                          >
                            {acc.accountName} ({acc.accountId.slice(-6)}, {acc.awsRegion})
                          </option>
                        ))}
                        {selectedProvider === 'azure' && azureAccounts.map((acc) => (
                          <option
                            key={`${acc.subscriptionId}-${acc.tenantId || 'no-tenant'}`}
                            value={acc.subscriptionId}
                          >
                            {acc.accountName || 'Azure Account'} ({acc.subscriptionId.slice(-6)})
                          </option>
                        ))}
                        {selectedProvider === 'gcp' && gcpAccounts.map((acc) => (
                          <option
                            key={`${acc.projectId}-${acc._id || 'no-id'}`}
                            value={acc.projectId}
                          >
                            {acc.projectName} ({acc.projectId})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {selectedProvider && selectedAccountId && (
                  <>
                    {costError && (
                      <div className="p-4 rounded-lg flex items-start gap-3 bg-yellow-900/30 border border-yellow-700/30">
                        <AlertTriangle className="mt-0.5 flex-shrink-0 text-yellow-400" size={18} />
                        <div>
                          <span className="font-medium text-yellow-300">
                            {costError.includes('🔒') ? 'Permission Required' : 'Data Unavailable'}
                          </span>
                          <p className="text-sm mt-1 text-yellow-200 opacity-90">
                            {costError.includes('AccessDenied') || costError.includes('🔒')
                              ? `You don’t have permission to view cost or resource data for this ${getProviderDisplayName(selectedProvider)} account.`
                              : costError.includes('Insufficient historical data')
                                ? "Cost Explorer data is not yet available. Please wait 24–48 hours after enabling billing."
                                : costError.includes('not found')
                                  ? "Account configuration incomplete. Please check Cloud Connector settings."
                                  : "Data could not be retrieved at this time."}
                          </p>
                        </div>
                      </div>
                    )}
                    {hasCostPermission === true && !costError && (
                      <div className="space-y-6">
                        {/* Top Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-black/30 p-5 rounded-lg">
                            <h4 className="text-sm text-gray-400 mb-1">Current Spend</h4>
                            {costSummaryLoading ? (
                              <span className="h-8 w-24 bg-white/10 rounded animate-pulse inline-block"></span>
                            ) : costSummary ? (
                              <>
                                <div className="text-3xl font-bold text-white">
                                  {costSummary?.currency === 'INR' ? '₹' : '$'}
                                  {costSummary?.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {costSummary?.accountName || '—'}
                                </p>
                              </>
                            ) : (
                              <p className="text-gray-500 text-sm italic">No spend data available</p>
                            )}
                          </div>
                          <div className="bg-black/30 p-5 rounded-lg">
                            <h4 className="text-sm text-gray-400 mb-1">Forecast</h4>
                            {forecastLoading ? (
                              <div className="h-8 w-20 bg-white/10 rounded animate-pulse"></div>
                            ) : forecast ? (
                              <>
                                <div className="text-2xl font-bold text-cyan-300">
                                  {costSummary?.currency === 'INR' ? '₹' : '$'}
                                  {forecast.mean.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-xs text-cyan-400 mt-1">
                                  ±{Math.round(((forecast.max - forecast.min) / (forecast.mean || 1)) * 100)}%
                                </p>
                              </>
                            ) : (
                              <div className="text-gray-500 flex items-center gap-1">
                                <Clock size={14} />
                                <span>No forecast data</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Middle Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="bg-black/20 p-4 rounded-lg">
                            <h4 className="text-white font-medium mb-3 flex items-center gap-1">
                              <TrendingUp size={16} />
                              Daily Trend (Last 30 Days)
                            </h4>
                            <div className="h-32 flex items-center justify-center">
                              {costTrendLoading ? (
                                <div className="text-gray-500 text-center">Loading trend...</div>
                              ) : trendValues.length > 0 ? (
                                <SVGLineChart data={trendValues} width={300} height={80} color="#3b82f6" />
                              ) : (
                                <div className="text-gray-500 text-sm italic">No trend data</div>
                              )}
                            </div>
                          </div>
                          <div className="bg-black/20 p-4 rounded-lg">
                            <h4 className="text-white font-medium mb-4 flex items-center gap-1">
                              <Layers size={16} />
                              Resource Count
                            </h4>
                            {resourcesLoading ? (
                              <div className="text-gray-500 text-center py-6 italic">Loading...</div>
                            ) : filteredResourceCounts ? (
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-400">{filteredResourceCounts.EC2}</div>
                                  <div className="text-xs text-gray-400">EC2</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-400">{filteredResourceCounts.S3}</div>
                                  <div className="text-xs text-gray-400">S3</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-rose-400">{filteredResourceCounts.RDS}</div>
                                  <div className="text-xs text-gray-400">RDS</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-purple-400">{filteredResourceCounts.Lambda}</div>
                                  <div className="text-xs text-gray-400">Lambda</div>
                                </div>
                                <div className="text-center col-span-2">
                                  <div className="text-2xl font-bold text-gray-400">{filteredResourceCounts.Others}</div>
                                  <div className="text-xs text-gray-400">Others</div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm italic">No resource data — check permissions or tagging.</p>
                            )}
                          </div>
                        </div>
                        {/* Bottom Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="bg-black/20 p-4 rounded-lg">
                            <h4 className="text-white font-medium mb-3 flex items-center gap-1">
                              <PieChartIcon size={16} />
                              Service Breakdown
                            </h4>
                            <div className="flex justify-center min-h-[200px] items-center">
                              {pieData.length > 0 ? (
                                <SVGPieChart data={pieData} size={160} />
                              ) : costSummaryLoading ? (
                                <div className="text-gray-500">Loading breakdown...</div>
                              ) : (
                                <div className="text-gray-500 text-sm italic">No service cost breakdown available.</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-white font-medium mb-3 flex items-center gap-1">
                              <DollarSign size={16} />
                              Budgets
                            </h4>
                            {budgetsLoading ? (
                              <div className="text-gray-500 text-sm italic">Loading budgets...</div>
                            ) : budgets.length === 0 ? (
                              <p className="text-gray-500 text-sm">No budgets configured for this account.</p>
                            ) : (
                              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                {budgets.map((b, i) => (
                                  <div key={`${b.name}-${b.type}-${i}`} className="bg-gray-800/50 p-3 rounded-lg">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-300">{b.name}</span>
                                      <span className={`font-medium ${budgetStatusColor(b.status)}`}>
                                        {b.status}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-400">
                                      Spent: {b.currency === 'INR' ? '₹' : '$'}{b.actual.toLocaleString()} / {b.currency === 'INR' ? '₹' : '$'}{b.amount.toLocaleString()}
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                                      <div
                                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                                        style={{ width: `${Math.min(100, (b.actual / (b.amount || 1)) * 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </GlassCard>
            </section>

            {/* === RECENT ACTIVITY === */}
            <section className="mb-12">
              <SectionHeading>
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  RECENT ACTIVITY
                </span>
              </SectionHeading>
              <GlassCard>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 rounded-xl animate-pulse bg-white/5"></div>
                    ))}
                  </div>
                ) : filteredRecentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {filteredRecentActivity.map((activity, index) => (
                      <div
                        key={`${activity.action}-${activity.timestamp}-${index}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                      >
                        <span className="font-medium text-white">{activity.action}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-300">
                            {formatTimeAgo(activity.timestamp)}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-medium ${
                              activity.status === "success"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {activity.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-gray-400">No recent activity</p>
                )}
              </GlassCard>
            </section>
          </div>
        </div>

        {/* === MODALS === */}
        <Modal
          open={activeClustersModalOpen}
          onClose={() => setActiveClustersModalOpen(false)}
          title="Active Clusters"
        >
          {filteredClusters.length === 0 ? (
            <p className="text-gray-400 italic text-center py-6">No active clusters found.</p>
          ) : (
            <div className="space-y-5">
              {filteredClusters.map((cluster) => {
                const status = (cluster.status || "unknown").toLowerCase();
                const name = cluster.name || cluster.clusterName || "Unnamed Cluster";
                const region = cluster.region || "N/A";
                const nodes = cluster.liveNodeCount ?? cluster.nodeCount ?? "N/A";
                const version = cluster.version || "N/A";
                const key = cluster._id || `${cluster.accountId}-${name}`;

                // 🔍 Determine provider from accountId
                let provider = 'unknown';
                if (awsAccounts.some(acc => acc.accountId === cluster.accountId)) provider = 'aws';
                else if (azureAccounts.some(acc => acc.subscriptionId === cluster.accountId)) provider = 'azure';
                else if (gcpAccounts.some(acc => acc.projectId === cluster.accountId)) provider = 'gcp';

                const detailUrl = `/clusters/${provider}/${encodeURIComponent(name)}`;

                return (
                  <div
                    key={key}
                    className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg cursor-pointer hover:shadow-xl transition-all card-glow"
                    onClick={() => {
                      setActiveClustersModalOpen(false);
                      window.location.href = "/sidebar/activecluster"; // 👈 Full-page navigation
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-lg text-white flex items-center gap-2">
                        <Server size={18} className="text-cyan-300" /> {name}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        status === "running" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : status === "stopped" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : status === "not-found" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-gray-500/20 text-gray-300"
                      }`}>
                        {status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Region:</span>
                        <span className="text-cyan-300 font-mono">{region}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Nodes:</span>
                        <span className="text-white font-mono text-lg">{nodes}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Version:</span>
                        <span className="text-cyan-300 font-mono">{version}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Account:</span>
                        <span className="text-orange-300 font-mono">
                          {awsAccounts.find(acc => acc.accountId === cluster.accountId)?.accountName ||
                            azureAccounts.find(acc => acc.subscriptionId === cluster.accountId)?.accountName ||
                            gcpAccounts.find(acc => acc.projectId === cluster.accountId)?.projectName ||
                            cluster.accountId?.slice(-6) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>

        {/* Other modals unchanged — only removed cluster detail modal-related states */}
        <Modal open={cloudServicesModalOpen} onClose={() => setCloudServicesModalOpen(false)} title="Connected Cloud Accounts">
          <div className="space-y-6">
            {selectedProviderFilter !== "azure" && selectedProviderFilter !== "gcp" && awsAccounts.length > 0 && (
              <div>
                <h4 className="text-cyan-400 font-bold mb-2">AWS Accounts ({awsAccounts.length})</h4>
                <ul className="space-y-3">
                  {awsAccounts.map((account) => (
                    <li
                      key={`${account.accountId}-${account.awsRegion}-${account._id || 'no-id'}`}
                      className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-4 rounded-lg border border-teal-500/20"
                    >
                      <div className="font-bold text-orange-300">{account.accountName}</div>
                      <div className="text-xs text-gray-300 mt-1">
                        <div>ID: <span className="font-mono text-cyan-200">{account.accountId.slice(0, 6)}...{account.accountId.slice(-4)}</span></div>
                        <div>Region: <span className="font-mono text-cyan-200">{account.awsRegion}</span></div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedProviderFilter !== "aws" && selectedProviderFilter !== "gcp" && azureAccounts.length > 0 && (
              <div>
                <h4 className="text-cyan-400 font-bold mb-2">Azure Accounts ({azureAccounts.length})</h4>
                <ul className="space-y-3">
                  {azureAccounts.map((account) => (
                    <li
                      key={`${account.subscriptionId}-${account.tenantId || 'no-tenant'}`}
                      className="bg-gradient-to-br from-blue-900/20 to-indigo-900/10 p-4 rounded-lg border border-indigo-500/20"
                    >
                      <div className="font-bold text-blue-300">{account.accountName}</div>
                      <div className="text-xs text-gray-300 mt-1">
                        <div>Subscription ID: <span className="font-mono text-indigo-200">{account.subscriptionId.slice(0, 6)}...{account.subscriptionId.slice(-6)}</span></div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedProviderFilter !== "aws" && selectedProviderFilter !== "azure" && gcpAccounts.length > 0 && (
              <div>
                <h4 className="text-cyan-400 font-bold mb-2">GCP Accounts ({gcpAccounts.length})</h4>
                <ul className="space-y-3">
                  {gcpAccounts.map((account) => (
                    <li
                      key={`${account.projectId}-${account._id || 'no-id'}`}
                      className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-4 rounded-lg border border-teal-500/20"
                    >
                      <div className="font-bold text-green-300">{account.projectName}</div>
                      <div className="text-xs text-gray-300 mt-1">
                        <div>Project ID: <span className="font-mono text-teal-200">{account.projectId}</span></div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {filteredConnectedAccountsCount === 0 && (
              <p className="text-gray-400 italic text-center py-6">No cloud accounts connected.</p>
            )}
          </div>
        </Modal>

        <Modal open={toolsModalOpen} onClose={() => setToolsModalOpen(false)} title="Deployed Tools">
          {filteredTools.length === 0 ? (
            <p className="text-gray-400 italic text-center py-6">No tools deployed yet.</p>
          ) : (
            <div className="space-y-5">
              {filteredTools.map((tool, index) => (
                <div key={`${tool.selectedTool}-${tool.selectedCluster}-${tool.createdAt}`} className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-lg text-white flex items-center gap-2">
                      <Layers size={18} className="text-purple-300" /> {tool.selectedTool || 'Unknown Tool'}
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30`}>
                      Deployed
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Cluster:</span>
                      <span className="text-cyan-300 font-mono">{tool.selectedCluster || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Created:</span>
                      <span className="text-cyan-300 font-mono">
                        {new Date(tool.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>

        <Modal open={databasesModalOpen} onClose={() => setDatabasesModalOpen(false)} title="Databases">
          {databaseDetails.length === 0 ? (
            <p className="text-gray-400 italic text-center py-6">No databases found.</p>
          ) : (
            <div className="space-y-5">
              {databaseDetails.map((db, index) => {
                return (
                  <div key={`${db.dbType}-${db.endpoint || 'db'}-${index}`} className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-lg text-white flex items-center gap-2">
                        <Database size={18} className="text-teal-300" /> {db.dbType || 'Unknown'}
                      </h4>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Success
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Account:</span>
                        <span className="text-orange-300 font-mono">{db.awsAccountName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Region:</span>
                        <span className="text-teal-300 font-mono">{db.awsRegion || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Endpoint:</span>
                        <span className="text-white font-mono">{db.endpoint || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Created:</span>
                        <span className="text-cyan-300 font-mono">
                          {new Date(db.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>

        <Modal open={githubDetailsModalOpen} onClose={() => setGithubDetailsModalOpen(false)} title="GitHub Connection Details">
          {githubConnected === false ? (
            <div className="text-center py-6">
              <Github className="h-12 w-12 mx-auto text-rose-500 mb-3" />
              <p className="text-gray-400 mb-4">GitHub is not connected.</p>
              <button
                onClick={() => { window.location.href = "/sidebar/scm-connector"; }}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 transition shadow-md"
              >
                🔗 Connect GitHub
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-4">
              <div className="h-6 bg-white/10 rounded w-1/3 animate-pulse"></div>
              <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
            </div>
          ) : (
            <div className="text-center py-8 px-4">
              <div className="inline-flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30 mb-5">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Connection Verified</span>
              </div>
              <p className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-bold tracking-tight">@{resolvedGithubUsername}</p>
              <p className="text-gray-400 mt-4 text-sm max-w-xs mx-auto">
                You can now manage repositories and organizations through the SCM Connector.
              </p>
            </div>
          )}
        </Modal>

        <Modal open={resourcesModalOpen} onClose={() => setResourcesModalOpen(false)} title="Resource Details">
          {filteredResourceCounts ? (
            <div className="space-y-5">
              {(['EC2', 'S3', 'RDS', 'Lambda', 'Others'] as const).map((type) => {
                const count = filteredResourceCounts[type];
                if (!count) return null;
                const Icon = type === 'EC2' ? Server :
                  type === 'S3' ? Database :
                    type === 'RDS' ? Database :
                      type === 'Lambda' ? Zap : Layers;
                const color = type === 'EC2' ? 'text-cyan-300' :
                  type === 'S3' ? 'text-teal-300' :
                    type === 'RDS' ? 'text-purple-300' :
                      type === 'Lambda' ? 'text-yellow-300' : 'text-gray-300';
                return (
                  <div key={type} className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-lg text-white flex items-center gap-2">
                        <Icon size={18} className={color} /> {type} Instances
                      </h4>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {count} Total
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">This section would list individual {type} resources if detailed data were available.</p>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          ) : (
            <p className="text-gray-400 italic text-center py-6">
              {loading || resourcesLoading ? 'Loading...' : 'No resource data available.'}
            </p>
          )}
        </Modal>

        <SupportTicketModal
          isOpen={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
          onSubmit={handleTicketSubmit}
        />
      </div>
    </>
  );
};

export default DashBoard;
