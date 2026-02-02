// src/components/dashboard/GcpData.jsx
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

const GcpData = ({ selectedAccountId, accounts, onRefresh }) => {
  const projectId = selectedAccountId;

  // ✅ SAFETY CHECK: If accounts is undefined or not an array → show loading
  if (!accounts || !Array.isArray(accounts)) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-white">
        <div className="loader" aria-label="Loading">
          <div className="box"></div>
        </div>
        <p className="mt-6 text-lg font-medium">Loading GCP accounts...</p>
      </div>
    );
  }

  // ✅ SAFETY CHECK: If accounts is empty → show message
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-white">
        <div className="text-xl mb-4">No GCP accounts found.</div>
        <p className="text-gray-400">Please connect a GCP account in Cloud Connector.</p>
      </div>
    );
  }

  const account = accounts.find(acc => acc.projectId === projectId);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [instances, setInstances] = useState([]);
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
    instances: useRef(null),
    pods: useRef(null),
    workloads: useRef(null),
    services: useRef(null),
    loadbalancers: useRef(null),
    storage: useRef(null),
    functions: useRef(null),
    vpc: useRef(null),
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
    if (!projectId) return;
    try {
      const [instanceRes, storageRes, functionRes, vpcRes] = await Promise.all([
        api.get(`/api/gcp/${projectId}/instances`),
        api.post(`/api/gcp/${projectId}/storage`, { projectId }),
        api.post(`/api/gcp/${projectId}/functions`, { projectId }),
        api.post(`/api/gcp/${projectId}/vpcs`, { projectId }),
      ]);
      const resources = [
        ...instanceRes.data.map((inst) => ({
          type: "instance",
          name: inst.name || inst.instanceId,
          id: inst.instanceId,
          details: `Machine Type: ${inst.machineType}, Status: ${inst.status}`,
          selected: false,
        })),
        ...(storageRes.data.bucketsList || []).map((bucket) => ({
          type: "storage",
          name: bucket.name,
          id: bucket.name,
          details: `Location: ${bucket.location}, Class: ${bucket.storageClass}`,
          selected: false,
        })),
        ...(functionRes.data.functionsList || []).map((fn) => ({
          type: "function",
          name: fn.functionName,
          id: fn.functionName,
          details: `Runtime: ${fn.runtime}, Memory: ${fn.memorySize}MB`,
          selected: false,
        })),
        ...(vpcRes.data.vpcsList || []).map((vpc) => ({
          type: "vpc",
          name: vpc.name || vpc.id,
          id: vpc.id,
          details: `CIDR: ${vpc.cidrRange}, Region: ${vpc.region}`,
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
      case "instance":
        const newInstance = {
          instanceId: id,
          name: "New Instance",
          machineType: "e2-micro",
          status: "RUNNING",
          zone: "us-central1-a",
        };
        setInstances((prev) => [...prev, newInstance]);
        scrollToSection("instances");
        break;
      case "storage":
        const newStorage = {
          name: id,
          size: "0 B",
          location: "us-central1",
          storageClass: "STANDARD",
        };
        setMetrics((prev) => ({
          ...prev,
          buckets: (prev?.buckets || 0) + 1,
          bucketsList: [...(prev?.bucketsList || []), newStorage],
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
      case "vpc":
        const newVpc = {
          id: id,
          name: id,
          cidrRange: "10.0.0.0/16",
          region: "global",
          subnets: [],
        };
        setMetrics((prev) => ({
          ...prev,
          vpcs: (prev?.vpcs || 0) + 1,
          vpcsList: [...(prev?.vpcsList || []), newVpc],
        }));
        scrollToSection("vpc");
        break;
      default:
        toast.info("Resource type not supported yet.");
    }
    toast.success(`✅ ${type.toUpperCase()} added successfully!`);
  };

  const fetchAllData = async () => {
    if (!projectId) return;
    try {
      setLastSynced(new Date().toLocaleTimeString());
      
      // For now, use mock data since backend routes may not exist
      const mockMetrics = {
        clusters: 2,
        vpcs: 1,
        loadBalancers: 2,
        buckets: 3,
        functions: 4,
        costCurrent: 75.25,
        storage: { used: 80, total: 500, percent: 16, unit: "GB" },
        cpu: { used: 6, total: 24, percent: 25, unit: "vCPU" },
        memory: { used: 3072, total: 12288, percent: 25, unit: "MB" },
        resourceCosts: {
          "Compute Engine": 45,
          "Cloud Storage": 8,
          "GKE": 22.25
        }
      };

      const mockClusters = [
        { name: "prod-gke", version: "1.28.3", region: "us-central1", nodes: 4, status: "Running" },
        { name: "dev-gke", version: "1.27.7", region: "us-west1", nodes: 2, status: "Running" }
      ];

      const mockInstances = [
        { instanceId: "inst-001", name: "web-server", machineType: "e2-medium", status: "RUNNING", zone: "us-central1-a" },
        { instanceId: "inst-002", name: "db-server", machineType: "e2-standard-2", status: "TERMINATED", zone: "us-west1-b" }
      ];

      const mockK8sData = {
        namespaces: [{ name: "default", pods: 6, status: "Active" }, { name: "monitoring", pods: 4, status: "Active" }],
        workloads: [{ name: "nginx", namespace: "default", type: "Deployment", readyReplicas: 2, replicas: 2, status: "True" }],
        services: [{ name: "frontend", namespace: "default", type: "LoadBalancer", clusterIP: "10.0.1.10", ports: ["80:30080"] }]
      };

      setK8sData(mockK8sData);
      setClusters(mockClusters);
      setInstances(mockInstances);
      setMetrics(mockMetrics);

    } catch (err) {
      console.error("Failed to fetch GCP data:", err);
      toast.error("Failed to load GCP account details.");
    } finally {
      setLoading(false);
      if (onRefresh) onRefresh();
    }
  };

  useEffect(() => {
    if (projectId) {
      setLoading(true);
      fetchAllData();
    }
  }, [projectId]);

  const refreshData = () => {
    setIsRefreshing(true);
    setMetrics(null);
    setClusters([]);
    setInstances([]);
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
        <p className="mt-6 text-lg font-medium">Loading GCP account...</p>
      </div>
    );
  }

  const overviewCards = [
    { key: "vpc", label: "VPC Networks", value: metrics?.vpcs || 0, icon: <MapPin size={24} className="text-orange-400" /> },
    { key: "instances", label: "Instances", value: instances.length, icon: <Cpu size={24} className="text-amber-400" /> },
    { key: "clusters", label: "GKE Clusters", value: metrics?.clusters || 0, icon: <Server size={24} className="text-blue-400" /> },
    { key: "namespaces", label: "Namespaces", value: k8sData.namespaces.length, icon: <Layers size={24} className="text-emerald-400" /> },
    { key: "pods", label: "Pods", value: k8sData.namespaces.reduce((sum, ns) => sum + (ns.pods || 0), 0), icon: <Package size={24} className="text-violet-400" /> },
    { key: "loadbalancers", label: "Load Balancers", value: metrics?.loadBalancers || 0, icon: <Network size={24} className="text-purple-400" /> },
    { key: "storage", label: "Buckets", value: metrics?.buckets || 0, icon: <HardDrive size={24} className="text-indigo-400" /> },
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
            { key: "instances", label: `Instances (${instances.length})` },
            { key: "vpc", label: `VPC Networks (${metrics?.vpcs || 0})` },
            { key: "loadbalancers", label: `Load Balancers (${metrics?.loadBalancers || 0})` },
            { key: "clusters", label: `GKE Clusters (${clusters.length})` },
            { key: "namespaces", label: `Namespaces (${k8sData.namespaces.length})` },
            { key: "services", label: `Services (${k8sData.services.length})` },
            { key: "workloads", label: `Workloads (${k8sData.workloads.length})` },
            { key: "storage", label: `Buckets (${metrics?.buckets || 0})` },
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
        {/* Instances */}
        <div ref={sectionsRef.instances}>
          {activeTab === "instances" && (
            <div>
              <h3 className="text-lg font-bold mb-4">Compute Engine Instances</h3>
              {instances.length === 0 ? (
                <p className="text-gray-400">No instances found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">Instance ID</th>
                      <th className="py-2 text-left">Name</th>
                      <th className="py-2 text-left">Machine Type</th>
                      <th className="py-2 text-left">Status</th>
                      <th className="py-2 text-left">Zone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instances.map((i, idx) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="py-2 font-mono">{i.instanceId}</td>
                        <td className="py-2">{i.name || "—"}</td>
                        <td className="py-2">{i.machineType}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              i.status === "RUNNING"
                                ? "bg-green-500/20 text-green-300"
                                : i.status === "TERMINATED"
                                ? "bg-gray-500/20 text-gray-300"
                                : "bg-yellow-500/20 text-yellow-300"
                            }`}
                          >
                            {i.status}
                          </span>
                        </td>
                        <td className="py-2">{i.zone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* GKE Clusters */}
        <div ref={sectionsRef.clusters}>
          {activeTab === "clusters" && (
            <div>
              <h3 className="text-lg font-bold mb-4">GKE Clusters</h3>
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
                    {(metrics.loadBalancerList || []).map((lb, i) => (
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

        {/* Buckets */}
        <div ref={sectionsRef.storage}>
          {activeTab === "storage" && (
            <div>
              <h3 className="text-lg font-bold mb-4">Cloud Storage Buckets</h3>
              {metrics?.bucketsList?.length === 0 ? (
                <p className="text-gray-400">No buckets found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">Bucket Name</th>
                      <th className="py-2 text-left">Size</th>
                      <th className="py-2 text-left">Location</th>
                      <th className="py-2 text-left">Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.bucketsList.map((bucket, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 font-mono">{bucket.name}</td>
                        <td className="py-2">{bucket.size}</td>
                        <td className="py-2">{bucket.location}</td>
                        <td className="py-2">{bucket.storageClass}</td>
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
              <h3 className="text-lg font-bold mb-4">Cloud Functions</h3>
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

        {/* VPC Networks */}
        <div ref={sectionsRef.vpc}>
          {activeTab === "vpc" && (
            <div>
              <h3 className="text-lg font-bold mb-4">VPC Networks</h3>
              {loading ? (
                <p className="text-gray-400">Loading...</p>
              ) : !metrics?.vpcsList || metrics.vpcsList.length === 0 ? (
                <p className="text-gray-400">No VPC networks found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">VPC ID</th>
                      <th className="py-2 text-left">Name</th>
                      <th className="py-2 text-left">CIDR Range</th>
                      <th className="py-2 text-left">Region</th>
                      <th className="py-2 text-left">Subnets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.vpcsList.map((vpc, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 font-mono">{vpc.id}</td>
                        <td className="py-2">{vpc.name || vpc.id}</td>
                        <td className="py-2">{vpc.cidrRange}</td>
                        <td className="py-2">{vpc.region}</td>
                        <td className="py-2">{vpc.subnets?.length || 0}</td>
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

export default GcpData;
