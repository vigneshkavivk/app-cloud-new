// src/components/dashboard/AzureData.jsx
import React, { useState, useEffect, useRef } from "react";
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
  BarChartIcon,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import api from "../../interceptor/api.interceptor";
import { toast } from "react-toastify";

const AzureData = ({ selectedAccountId, accounts, onRefresh }) => {
  const accountId = selectedAccountId;

  // ✅ SAFETY CHECK 1: If accounts is undefined or not an array → show loading
  if (!accounts || !Array.isArray(accounts)) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-white">
        <div className="loader" aria-label="Loading">
          <div className="box"></div>
        </div>
        <p className="mt-6 text-lg font-medium">Loading Azure accounts...</p>
      </div>
    );
  }

  // ✅ SAFETY CHECK 2: If accounts is empty → show message
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-white">
        <div className="text-xl mb-4">No Azure accounts found.</div>
        <p className="text-gray-400">Please connect an Azure account in Cloud Connector.</p>
      </div>
    );
  }

  // ✅ Only ONE declaration of 'account'
  const account = accounts.find(acc => acc.subscriptionId === accountId);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [vms, setVms] = useState([]);
  const [lastSynced, setLastSynced] = useState(null);
  const [activeTab, setActiveTab] = useState("clusters");
  const [k8sData, setK8sData] = useState({
    namespaces: [],
    workloads: [],
    services: [],
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [availableResources, setAvailableResources] = useState([]);
  const sectionsRef = {
    clusters: useRef(null),
    namespaces: useRef(null),
    vms: useRef(null),
    pods: useRef(null),
    workloads: useRef(null),
    services: useRef(null),
    loadbalancers: useRef(null),
    storage: useRef(null),
    functions: useRef(null),
    vnet: useRef(null),
  };

  // 🔒 Safe number helper
  const safeNumber = (val) => (typeof val === "number" ? val : 0);

  // 📈 Format currency
  const formatCost = (num) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);

  // 🎨 Utilization color
  const getUtilizationColor = (percent) => {
    if (percent >= 90) return "bg-red-600";
    if (percent >= 70) return "bg-orange-700";
    return "bg-green-500";
  };

  // 🕒 Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return isNaN(date) ? "—" : date.toLocaleDateString();
  };

  // 📊 Generate mock trend data for sparklines
  const generateTrendData = (baseValue = 30) => {
    return Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      value: Math.max(0, baseValue + Math.floor(Math.random() * 10 - 5)),
    }));
  };

  const quickActions = [
    {
      key: "add-resource",
      label: "Add Resource",
      subtitle: "To View In Resource Overview",
      icon: <Plus size={24} className="text-emerald-400" />,
      onClick: () => {
        setIsAddResourceModalOpen(true);
        fetchAvailableResources();
      },
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

  // Fetch available resources for "Add Resource"
  const fetchAvailableResources = async () => {
    if (!accountId) return;
    try {
      const [vmRes, storageRes, functionRes, vnetRes] = await Promise.all([
        api.get(`/api/azure/${accountId}/vms`),
        api.post(`/api/azure/${accountId}/storage`, { accountId }),
        api.post(`/api/azure/${accountId}/functions`, { accountId }),
        api.post(`/api/azure/${accountId}/vnets`, { accountId }),
      ]);
      const resources = [
        ...vmRes.data.map((vm) => ({
          type: "vm",
          name: vm.name || vm.vmId,
          id: vm.vmId,
          details: `Size: ${vm.vmSize}, State: ${vm.state}`,
          selected: false,
        })),
        ...(storageRes.data.storageAccountsList || []).map((account) => ({
          type: "storage",
          name: account.name,
          id: account.name,
          details: `Region: ${account.region}, Type: ${account.accountType}`,
          selected: false,
        })),
        ...(functionRes.data.functionsList || []).map((fn) => ({
          type: "function",
          name: fn.functionName,
          id: fn.functionName,
          details: `Runtime: ${fn.runtime}, Memory: ${fn.memorySize}MB`,
          selected: false,
        })),
        ...(vnetRes.data.vnetsList || []).map((vnet) => ({
          type: "vnet",
          name: vnet.name || vnet.id,
          id: vnet.id,
          details: `CIDR: ${vnet.addressSpace}, State: ${vnet.state}`,
          selected: false,
        })),
      ];
      setAvailableResources(resources);
    } catch (err) {
      console.error("Failed to fetch available resources:", err);
      toast.error("Failed to load available resources.");
      setAvailableResources([]);
    }
  };

  const handleAddResource = (type, id) => {
    switch (type) {
      case "vm":
        const newVm = {
          vmId: id,
          name: "New VM",
          vmSize: "Standard_B1s",
          state: "running",
          location: "eastus",
        };
        setVms((prev) => [...prev, newVm]);
        scrollToSection("vms");
        break;
      case "storage":
        const newStorage = {
          name: id,
          size: "0 B",
          region: "eastus",
          containers: 0,
        };
        setMetrics((prev) => ({
          ...prev,
          storageAccounts: (prev?.storageAccounts || 0) + 1,
          storageAccountsList: [...(prev?.storageAccountsList || []), newStorage],
        }));
        scrollToSection("storage");
        break;
      case "function":
        const newFn = {
          functionName: id,
          runtime: "nodejs18.x",
          memorySize: 128,
          lastModified: new Date().toISOString(),
        };
        setMetrics((prev) => ({
          ...prev,
          functions: (prev?.functions || 0) + 1,
          functionsList: [...(prev?.functionsList || []), newFn],
        }));
        scrollToSection("functions");
        break;
      case "vnet":
        const newVnet = {
          id: id,
          name: id,
          addressSpace: "10.0.0.0/16",
          state: "Succeeded",
          subnets: [],
          securityGroups: [],
        };
        setMetrics((prev) => ({
          ...prev,
          vnets: (prev?.vnets || 0) + 1,
          vnetsList: [...(prev?.vnetsList || []), newVnet],
        }));
        scrollToSection("vnet");
        break;
      default:
        toast.info("Resource type not supported yet.");
    }
    toast.success(`✅ ${type.toUpperCase()} added successfully!`);
  };

  const fetchAllData = async () => {
    if (!accountId) return;
    try {
      setLastSynced(new Date().toLocaleTimeString());
      const [
        metricsRes,
        clustersRes,
        vmRes,
        lbRes,
        storageRes,
        functionRes,
        vnetRes,
        costRes,
        cwRes,
      ] = await Promise.all([
        api.get(`/api/azure/${accountId}/metrics`),
        api.get(`/api/azure/${accountId}/clusters`),
        api.get(`/api/azure/${accountId}/vms`),
        api.post(`/api/azure/${accountId}/load-balancers`, { accountId }),
        api.post(`/api/azure/${accountId}/storage`, { accountId }),
        api.post(`/api/azure/${accountId}/functions`, { accountId }),
        api.post(`/api/azure/${accountId}/vnets`, { accountId }),
        api.post(`/api/azure/${accountId}/cost-explorer`, { accountId }),
        api.post(`/api/azure/${accountId}/cloudwatch-metrics-with-credits`, { accountId }),
      ]);

      // Fetch K8s data
      const k8sPromises = clustersRes.data.map((cluster) =>
        api.post(`/api/azure/${accountId}/k8s-resources`, {
          clusterName: cluster.name,
          accountId,
        })
      );
      const k8sResults = await Promise.all(k8sPromises);
      const allNamespaces = k8sResults.flatMap((r) => r.data.namespaces || []);
      const allWorkloads = k8sResults.flatMap((r) => r.data.workloads || []);
      const allServices = k8sResults.flatMap((r) => r.data.services || []);

      setK8sData({ namespaces: allNamespaces, workloads: allWorkloads, services: allServices });
      setClusters(clustersRes.data);
      setVms(vmRes.data);

      const currentMonth = costRes.data.currentMonth || 0;
      setMetrics({
        ...metricsRes.data,
        loadBalancers: lbRes.data.loadBalancers || 0,
        storageAccounts: storageRes.data.storageAccounts || 0,
        functions: functionRes.data.functions || 0,
        vnets: vnetRes.data.vnets || 0,
        loadBalancerList: lbRes.data.loadBalancerList || [],
        storageAccountsList: storageRes.data.storageAccountsList || [],
        functionsList: functionRes.data.functionsList || [],
        vnetsList: vnetRes.data.vnetsList || [],
        costCurrent: currentMonth,
        storage: cwRes.data.storage,
        cpu: cwRes.data.cpu,
        memory: cwRes.data.memory,
      });
    } catch (err) {
      console.error("Failed to fetch Azure data:", err);
      toast.error("Failed to load Azure account details.");
    } finally {
      setLoading(false);
      if (onRefresh) onRefresh();
    }
  };

  useEffect(() => {
    if (accountId) {
      setLoading(true);
      fetchAllData();
    }
  }, [accountId]);

  const refreshData = () => {
    setIsRefreshing(true);
    setMetrics(null);
    setClusters([]);
    setVms([]);
    setK8sData({ namespaces: [], workloads: [], services: [] });
    setLoading(true);
    fetchAllData().finally(() => setIsRefreshing(false));
  };

  const scrollToSection = (tabKey) => {
    setActiveTab(tabKey);
    if (sectionsRef[tabKey]?.current) {
      sectionsRef[tabKey].current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-white">
        <div className="loader" aria-label="Loading">
          <div className="box"></div>
        </div>
        <p className="mt-6 text-lg font-medium">Loading Azure account...</p>
      </div>
    );
  }

  const overviewCards = [
    { key: "vnet", label: "Virtual Networks", value: metrics?.vnets || 0, icon: <MapPin size={24} className="text-orange-400" /> },
    { key: "vms", label: "VMs", value: vms.length, icon: <Cpu size={24} className="text-amber-400" /> },
    { key: "clusters", label: "AKS Clusters", value: metrics?.clusters || 0, icon: <Server size={24} className="text-blue-400" /> },
    { key: "namespaces", label: "Namespaces", value: k8sData.namespaces.length, icon: <Layers size={24} className="text-emerald-400" /> },
    { key: "pods", label: "Pods", value: k8sData.namespaces.reduce((sum, ns) => sum + (ns.pods || 0), 0), icon: <Package size={24} className="text-violet-400" /> },
    { key: "loadbalancers", label: "Load Balancers", value: metrics?.loadBalancers || 0, icon: <Network size={24} className="text-purple-400" /> },
    { key: "storage", label: "Storage Accounts", value: metrics?.storageAccounts || 0, icon: <HardDrive size={24} className="text-indigo-400" /> },
    { key: "functions", label: "Functions", value: metrics?.functions || 0, icon: <Zap size={24} className="text-yellow-400" /> },
    { key: "workloads", label: "Workloads", value: k8sData.workloads.length, icon: <Cloud size={24} className="text-cyan-400" /> },
    { key: "services", label: "Services", value: k8sData.services.length, icon: <Globe size={24} className="text-green-400" /> },
  ];

  const getChangeBadgeClass = (change) => {
    if (change > 0) return "bg-green-500/20 text-green-400 border border-green-500/30";
    if (change < 0) return "bg-red-500/20 text-red-400 border border-red-500/30";
    return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
  };

  return (
    <div className={`p-2 max-w-9xl mx-auto ${isRefreshing ? "refreshing" : ""}`}>
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
              className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all cursor-pointer group"
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

      {/* Add Resource Modal */}
      {isAddResourceModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsAddResourceModalOpen(false)}
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">Select a Resource to Add</h3>
            <ul className="space-y-2">
              {availableResources.map((res) => (
                <li key={res.id}>
                  <button
                    onClick={() => {
                      handleAddResource(res.type, res.id);
                      setIsAddResourceModalOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-white/10 text-white"
                  >
                    + {res.name}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsAddResourceModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
              className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 w-full h-36 hover:bg-white/10 transition-all cursor-pointer relative group"
            >
              <div className={`absolute top-2 right-2 text-xs font-medium px-1.5 py-0.5 rounded-full ${getChangeBadgeClass(0)}`}>
                ~0%
              </div>
              {card.icon}
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <div className="text-sm text-gray-400">{card.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Credits & Cost Overview */}
      {metrics && (
        <div className="mb-8">
          <h2 className="red-orange-gradient-text text-xl font-bold mb-4 flex items-center gap-2">
            <Database size={20} className="text-emerald-400" />
            Credits & Cost Overview
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Breakdown */}
            <div className="card-glow bg-white/5 bg-gradient-to-r from-teal-900/30 via-cyan-900/30 to-blue-900/30 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">Cost Breakdown (Top 10)</h3>
                <span className="text-xs text-gray-400 bg-black/20 px-2 py-1 rounded">Current Month</span>
              </div>
              <div className="mb-4 pb-3 border-b border-gray-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Overall Cost</span>
                  <span className="text-xl font-bold text-emerald-400">{formatCost(safeNumber(metrics.costCurrent))}</span>
                </div>
              </div>
              {metrics?.resourceCosts && Object.keys(metrics.resourceCosts).length > 0 ? (
                <ul className="space-y-3">
                  {Object.entries(metrics.resourceCosts)
                    .map(([resource, cost]) => ({ resource, cost }))
                    .filter((item) => typeof item.cost === "number" && item.cost > 0)
                    .sort((a, b) => b.cost - a.cost)
                    .slice(0, 10)
                    .map(({ resource, cost }, idx) => {
                      const percent = metrics.costCurrent > 0 ? ((cost / metrics.costCurrent) * 100).toFixed(1) : 0;
                      return (
                        <li key={resource} className="group p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="text-xs text-gray-500 w-5 font-mono">{idx + 1}.</span>
                              <div>
                                <span className="font-medium text-white">{resource}</span>
                                <div className="text-xs text-gray-400 mt-0.5">{percent}% of total</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="font-bold text-white">{formatCost(cost)}</div>
                              </div>
                              <div className="w-20 h-8">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={generateTrendData(cost)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
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
            {/* Resource Utilization */}
            <div className="card-glow bg-white/5 bg-gradient-to-r from-blue-900/30 via-cyan-900/30 to-teal-900/30 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Resource Utilization</h3>
              {["storage", "cpu", "memory"].map((key) => {
                const val = metrics[key];
                if (!val || typeof val !== "object") return null;
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
                      <div className={`h-2 rounded-full ${getUtilizationColor(percent)}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
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
            { key: "vms", label: `Virtual Machines (${vms.length})` },
            { key: "vnet", label: `Virtual Networks (${metrics?.vnets || 0})` },
            { key: "loadbalancers", label: `Load Balancers (${metrics?.loadBalancers || 0})` },
            { key: "clusters", label: `AKS Clusters (${clusters.length})` },
            { key: "namespaces", label: `Namespaces (${k8sData.namespaces.length})` },
            { key: "services", label: `Services (${k8sData.services.length})` },
            { key: "workloads", label: `Workloads (${k8sData.workloads.length})` },
            { key: "storage", label: `Storage Accounts (${metrics?.storageAccounts || 0})` },
            { key: "functions", label: `Functions (${metrics?.functions || 0})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (sectionsRef[tab.key]?.current) {
                  sectionsRef[tab.key].current.scrollIntoView({ behavior: "smooth", block: "start" });
                }
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
      <div className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        {/* Virtual Machines */}
        <div ref={sectionsRef.vms}>
          {activeTab === "vms" && (
            <div>
              <h3 className="text-lg font-bold mb-4">Virtual Machines</h3>
              {vms.length === 0 ? (
                <p className="text-gray-400">No virtual machines found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">VM ID</th>
                      <th className="py-2 text-left">Name</th>
                      <th className="py-2 text-left">Size</th>
                      <th className="py-2 text-left">State</th>
                      <th className="py-2 text-left">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vms.map((i, idx) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="py-2 font-mono">{i.vmId}</td>
                        <td className="py-2">{i.name || "—"}</td>
                        <td className="py-2">{i.vmSize}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              i.state === "running"
                                ? "bg-green-500/20 text-green-300"
                                : i.state === "stopped"
                                ? "bg-gray-500/20 text-gray-300"
                                : "bg-yellow-500/20 text-yellow-300"
                            }`}
                          >
                            {i.state}
                          </span>
                        </td>
                        <td className="py-2">{i.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* AKS Clusters */}
        <div ref={sectionsRef.clusters}>
          {activeTab === "clusters" && (
            <div>
              <h3 className="text-lg font-bold mb-4">AKS Clusters</h3>
              {clusters.length === 0 ? (
                <p className="text-gray-400">No clusters found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">Cluster Name</th>
                      <th className="py-2 text-left">Version</th>
                      <th className="py-2 text-left">Region</th>
                      <th className="py-2 text-left">Nodes</th>
                      <th className="py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusters.map((c, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2">{c.name}</td>
                        <td className="py-2">{c.version}</td>
                        <td className="py-2">{c.region}</td>
                        <td className="py-2">{c.nodes}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              c.status === "Running"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-yellow-500/20 text-yellow-300"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Namespaces */}
        <div ref={sectionsRef.namespaces}>
          {activeTab === "namespaces" && (
            <div>
              <h3 className="text-lg font-bold mb-4">Kubernetes Namespaces</h3>
              {k8sData.namespaces.length === 0 ? (
                <p className="text-gray-400">No namespaces found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">Namespace</th>
                      <th className="py-2 text-left">Pods</th>
                      <th className="py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {k8sData.namespaces.map((ns, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2">{ns.name}</td>
                        <td className="py-2">{ns.pods}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              ns.status === "Active" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"
                            }`}
                          >
                            {ns.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Workloads */}
        <div ref={sectionsRef.workloads}>
          {activeTab === "workloads" && (
            <div>
              <h3 className="text-lg font-bold mb-4">Kubernetes Workloads</h3>
              {k8sData.workloads.length === 0 ? (
                <p className="text-gray-400">No workloads found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">Name</th>
                      <th className="py-2 text-left">Namespace</th>
                      <th className="py-2 text-left">Type</th>
                      <th className="py-2 text-left">Replicas</th>
                      <th className="py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {k8sData.workloads.map((w, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2">{w.name}</td>
                        <td className="py-2">
                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300">
                            {w.namespace}
                          </span>
                        </td>
                        <td className="py-2">{w.type}</td>
                        <td className="py-2">{w.readyReplicas}/{w.replicas}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              w.status === "True" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"
                            }`}
                          >
                            {w.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Services */}
        <div ref={sectionsRef.services}>
          {activeTab === "services" && (
            <div>
              <h3 className="text-lg font-bold mb-4">Kubernetes Services</h3>
              {k8sData.services.length === 0 ? (
                <p className="text-gray-400">No services found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">Service Name</th>
                      <th className="py-2 text-left">Namespace</th>
                      <th className="py-2 text-left">Type</th>
                      <th className="py-2 text-left">Cluster IP</th>
                      <th className="py-2 text-left">Ports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {k8sData.services.map((s, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2">{s.name}</td>
                        <td className="py-2">
                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300">
                            {s.namespace}
                          </span>
                        </td>
                        <td className="py-2">{s.type}</td>
                        <td className="py-2">{s.clusterIP || "—"}</td>
                        <td className="py-2">{s.ports?.join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Load Balancers */}
        <div ref={sectionsRef.loadbalancers}>
          {activeTab === "loadbalancers" && (
            <div>
              <h3 className="text-lg font-bold mb-4">Load Balancers</h3>
              {metrics?.loadBalancerList?.length === 0 ? (
                <p className="text-gray-400">No load balancers found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">Name</th>
                      <th className="py-2 text-left">Type</th>
                      <th className="py-2 text-left">State</th>
                      <th className="py-2 text-left">Region</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.loadBalancerList.map((lb, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2">{lb.name}</td>
                        <td className="py-2">{lb.type}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              lb.state === "active" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"
                            }`}
                          >
                            {lb.state}
                          </span>
                        </td>
                        <td className="py-2">{lb.region}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Storage Accounts */}
        <div ref={sectionsRef.storage}>
          {activeTab === "storage" && (
            <div>
              <h3 className="text-lg font-bold mb-4">Storage Accounts</h3>
              {metrics?.storageAccountsList?.length === 0 ? (
                <p className="text-gray-400">No storage accounts found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">Account Name</th>
                      <th className="py-2 text-left">Size</th>
                      <th className="py-2 text-left">Region</th>
                      <th className="py-2 text-left">Containers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.storageAccountsList.map((account, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 font-mono">{account.name}</td>
                        <td className="py-2">{account.size}</td>
                        <td className="py-2">{account.region}</td>
                        <td className="py-2">{account.containers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Functions */}
        <div ref={sectionsRef.functions}>
          {activeTab === "functions" && (
            <div>
              <h3 className="text-lg font-bold mb-4">Functions</h3>
              {metrics?.functionsList?.length === 0 ? (
                <p className="text-gray-400">No functions found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">Function Name</th>
                      <th className="py-2 text-left">Runtime</th>
                      <th className="py-2 text-left">Memory</th>
                      <th className="py-2 text-left">Last Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.functionsList.map((fn, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2">{fn.functionName}</td>
                        <td className="py-2">{fn.runtime}</td>
                        <td className="py-2">{fn.memorySize} MB</td>
                        <td className="py-2">{new Date(fn.lastModified).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Virtual Networks */}
        <div ref={sectionsRef.vnet}>
          {activeTab === "vnet" && (
            <div>
              <h3 className="text-lg font-bold mb-4">Virtual Networks</h3>
              {loading ? (
                <p className="text-gray-400">Loading...</p>
              ) : !metrics?.vnetsList || metrics.vnetsList.length === 0 ? (
                <p className="text-gray-400">No virtual networks found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">VNet ID</th>
                      <th className="py-2 text-left">Name</th>
                      <th className="py-2 text-left">Address Space</th>
                      <th className="py-2 text-left">State</th>
                      <th className="py-2 text-left">Subnets</th>
                      <th className="py-2 text-left">Security Groups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.vnetsList.map((vnet, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 font-mono">{vnet.id}</td>
                        <td className="py-2">{vnet.name || vnet.id}</td>
                        <td className="py-2">{vnet.addressSpace}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              vnet.state === "Succeeded"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-yellow-500/20 text-yellow-300"
                            }`}
                          >
                            {vnet.state}
                          </span>
                        </td>
                        <td className="py-2">{vnet.subnets?.length || 0}</td>
                        <td className="py-2">{vnet.securityGroups?.length || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resource Detail Modal */}
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
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AzureData;
