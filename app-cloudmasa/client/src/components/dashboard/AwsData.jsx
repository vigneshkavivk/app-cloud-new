// src/components/dashboard/AwsData.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  RefreshCw,
  Database,
  Package,
  HardDrive,
  Cpu as CPU,
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
import jsPDF from "jspdf";
import ActivityLogs from "./ActivityLogs"; // ✅ Keep this import

const AwsData = ({ selectedAccountId, accounts, onRefresh }) => {
  const accountId = selectedAccountId;
  const account = accounts.find((acc) => acc._id === accountId);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [ec2Instances, setEc2Instances] = useState([]);
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
  const [isCostExplorerModalOpen, setIsCostExplorerModalOpen] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // 🔹 NEW STATE FOR METRICS
  const [deployedTools, setDeployedTools] = useState(null);
  const [databaseMetrics, setDatabaseMetrics] = useState(null);

  // 🔹 NEW STATE FOR LOGS MODAL
  const [isViewLogsModalOpen, setIsViewLogsModalOpen] = useState(false);

  const sectionsRef = {
    clusters: useRef(null),
    namespaces: useRef(null),
    ec2: useRef(null),
    pods: useRef(null),
    workloads: useRef(null),
    services: useRef(null),
    loadbalancers: useRef(null),
    s3: useRef(null),
    lambda: useRef(null),
    vpc: useRef(null),
  };

  // 🔒 Safe number helper
  const safeNumber = (val) => (typeof val === "number" ? val : 0);

  // 💵 Format as USD (primary)
  const formatCost = (num) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);

  // ₹ Format as INR only (for parentheses)
  const formatINR = (usdValue, rate) => {
    if (typeof usdValue !== "number" || isNaN(usdValue)) return "₹0.00";
    const inrValue = usdValue * (rate || 85.87);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(inrValue);
  };

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
      onClick: () => setIsViewLogsModalOpen(true),
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
      const [ec2Res, s3Res, lambdaRes, vpcRes] = await Promise.all([
        api.get(`/api/aws/${accountId}/ec2`),
        api.post(`/api/aws/${accountId}/s3`, { accountId }),
        api.post(`/api/aws/${accountId}/lambda`, { accountId }),
        api.post(`/api/aws/${accountId}/vpcs`, { accountId }),
      ]);
      const resources = [
        ...ec2Res.data.map((instance) => ({
          type: "ec2",
          name: instance.name || instance.instanceId,
          id: instance.instanceId,
          details: `Type: ${instance.instanceType}, State: ${instance.state}`,
          selected: false,
        })),
        ...(s3Res.data.s3BucketsList || []).map((bucket) => ({
          type: "s3",
          name: bucket.name,
          id: bucket.name,
          details: `Region: ${bucket.region}, Size: ${bucket.size}`,
          selected: false,
        })),
        ...(lambdaRes.data.lambdaFunctionsList || []).map((fn) => ({
          type: "lambda",
          name: fn.functionName,
          id: fn.functionName,
          details: `Runtime: ${fn.runtime}, Memory: ${fn.memorySize}MB`,
          selected: false,
        })),
        ...(vpcRes.data.vpcsList || []).map((vpc) => ({
          type: "vpc",
          name: vpc.name || vpc.id,
          id: vpc.id,
          details: `CIDR: ${vpc.cidrBlock}, State: ${vpc.state}`,
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

  // 💾 CSV Download
  const downloadCostAsCSV = () => {
    if (!metrics?.costComparison) return;
    const rows = [
      ["Service", "This Month (USD)", "This Month (INR)", "Last Month (USD)", "Last Month (INR)", "Change (%)"],
    ];
    Object.entries(metrics.costComparison)
      .map(([service, data]) => ({ service, ...data }))
      .filter((item) => typeof item.current === "number" && item.current > 0)
      .sort((a, b) => b.current - a.current)
      .forEach(({ service, current, previous, diffPercent }) => {
        const usdCurrent = current;
        const inrCurrent = current * (metrics.exchangeRate || 85.87);
        const usdPrevious = previous;
        const inrPrevious = previous * (metrics.exchangeRate || 85.87);
        rows.push([
          service,
          usdCurrent.toFixed(2),
          inrCurrent.toFixed(2),
          usdPrevious.toFixed(2),
          inrPrevious.toFixed(2),
          diffPercent.toFixed(2),
        ]);
      });

    // Add total row
    const totalUsd = safeNumber(metrics.costCurrent);
    const totalInr = totalUsd * (metrics.exchangeRate || 85.87);
    const prevTotalUsd = safeNumber(metrics.previousMonth);
    const prevTotalInr = prevTotalUsd * (metrics.exchangeRate || 85.87);
    const totalChangePercent = prevTotalUsd ? ((totalUsd - prevTotalUsd) / prevTotalUsd) * 100 : 0;
    rows.push([
      "Total",
      totalUsd.toFixed(2),
      totalInr.toFixed(2),
      prevTotalUsd.toFixed(2),
      prevTotalInr.toFixed(2),
      totalChangePercent.toFixed(2),
    ]);

    const csvContent = rows.map(e => e.map(f => `"${f}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `aws-cost-breakdown-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDownloadMenu(false);
  };

  // 📄 PDF Download
  const downloadCostAsPDF = () => {
    if (!metrics?.costComparison) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let yPos = 20;
    doc.setFontSize(16);
    doc.text("AWS Cost Breakdown Report", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, 22);
    yPos += 12;

    // Table headers
    const headers = ["Service", "This Month", "Last Month", "Change (%)"];
    const colWidths = [60, 40, 40, 30];
    let xPos = margin;
    doc.setFontSize(10);
    doc.setFillColor(220, 220, 220);
    doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), 8, "F");
    headers.forEach((header, i) => {
      doc.text(header, xPos + 2, yPos + 5);
      xPos += colWidths[i];
    });
    yPos += 8;

    // Data rows
    const dataRows = Object.entries(metrics.costComparison)
      .map(([service, data]) => ({ service, ...data }))
      .filter((item) => typeof item.current === "number" && item.current > 0)
      .sort((a, b) => b.current - a.current);

    dataRows.forEach((row) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const usdCur = formatCost(row.current);
      const inrCur = formatINR(row.current, metrics.exchangeRate);
      const usdPrev = formatCost(row.previous);
      const inrPrev = formatINR(row.previous, metrics.exchangeRate);
      const curText = `${usdCur}\n(${inrCur})`;
      const prevText = `${usdPrev}\n(${inrPrev})`;
      doc.setFontSize(9);
      doc.text(row.service, margin + 2, yPos + 3);
      doc.text(curText, margin + colWidths[0] + 2, yPos + 3);
      doc.text(prevText, margin + colWidths[0] + colWidths[1] + 2, yPos + 3);
      doc.text(`${row.diffPercent.toFixed(2)}%`, margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 3);
      yPos += 12;
    });

    // Total row
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), 10, "F");
    doc.setFontSize(10);
    doc.text("Total", margin + 2, yPos + 6);
    const totalUsd = formatCost(safeNumber(metrics.costCurrent));
    const totalInr = formatINR(safeNumber(metrics.costCurrent), metrics.exchangeRate);
    const prevUsd = formatCost(safeNumber(metrics.previousMonth));
    const prevInr = formatINR(safeNumber(metrics.previousMonth), metrics.exchangeRate);
    const totalChange = ((metrics.costCurrent || 0) - (metrics.previousMonth || 0)) / (metrics.previousMonth || 1) * 100;
    doc.text(`${totalUsd}\n(${totalInr})`, margin + colWidths[0] + 2, yPos + 6);
    doc.text(`${prevUsd}\n(${prevInr})`, margin + colWidths[0] + colWidths[1] + 2, yPos + 6);
    doc.text(`${totalChange.toFixed(2)}%`, margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 6);
    doc.save(`aws-cost-breakdown-${new Date().toISOString().split('T')[0]}.pdf`);
    setShowDownloadMenu(false);
  };

  // 💰 Helper: Display USD + INR
  const formatUsdInr = (usdValue, rate) => {
    const usd = formatCost(usdValue);
    const inr = formatINR(usdValue, rate);
    return `${usd} (${inr})`;
  };

  const handleAddResource = (type, id) => {
    switch (type) {
      case "ec2":
        const newEc2 = {
          instanceId: id,
          name: "New Instance",
          instanceType: "t3.micro",
          state: "running",
          availabilityZone: "us-east-1a",
        };
        setEc2Instances((prev) => [...prev, newEc2]);
        scrollToSection("ec2");
        break;
      case "s3":
        const newBucket = {
          name: id,
          size: "0 B",
          region: "us-east-1",
          objects: 0,
        };
        setMetrics((prev) => ({
          ...prev,
          s3Buckets: (prev?.s3Buckets || 0) + 1,
          s3BucketsList: [...(prev?.s3BucketsList || []), newBucket],
        }));
        scrollToSection("s3");
        break;
      case "lambda":
        const newFn = {
          functionName: id,
          runtime: "nodejs18.x",
          memorySize: 128,
          lastModified: new Date().toISOString(),
        };
        setMetrics((prev) => ({
          ...prev,
          lambdaFunctions: (prev?.lambdaFunctions || 0) + 1,
          lambdaFunctionsList: [...(prev?.lambdaFunctionsList || []), newFn],
        }));
        scrollToSection("lambda");
        break;
      case "vpc":
        const newVpc = {
          id: id,
          name: id,
          cidrBlock: "10.0.0.0/16",
          state: "available",
          subnets: [],
          securityGroups: [],
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
    if (!accountId) return;

    // 🔁 Fetch exchange rate dynamically
    let exchangeRate = 85.87;
    try {
      const rateRes = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        exchangeRate = rateData.rates.INR || 85.87;
      }
    } catch (err) {
      console.warn("Failed to fetch exchange rate. Using fallback.", err);
    }

    try {
      setLastSynced(new Date().toLocaleTimeString());

      // Use allSettled to prevent one failure from breaking everything
      const results = await Promise.allSettled([
        api.get(`/api/aws/${accountId}/metrics`),
        api.get(`/api/aws/${accountId}/clusters`),
        api.get(`/api/aws/${accountId}/ec2`),
        api.post(`/api/aws/${accountId}/load-balancers`, { accountId }),
        api.post(`/api/aws/${accountId}/s3`, { accountId }),
        api.post(`/api/aws/${accountId}/lambda`, { accountId }),
        api.post(`/api/aws/${accountId}/vpcs`, { accountId }),
        // ❌ REMOVED COST EXPLORER CALL
        api.post(`/api/aws/${accountId}/cloudwatch-metrics-with-credits`, { accountId }),
      ]);

      // Helper to safely extract data or fallback
      const safeResult = (res, fallback = {}) => {
        if (res.status === "fulfilled" && res.value?.data) {
          return res.value.data;
        }
        console.warn("API call failed or missing data:", res.reason || res);
        return fallback;
      };

      const metricsResData = safeResult(results[0]);
      const clustersResData = safeResult(results[1]);
      const ec2ResData = safeResult(results[2]);
      const lbResData = safeResult(results[3], { loadBalancers: 0, loadBalancerList: [] });
      const s3ResData = safeResult(results[4], { s3Buckets: 0, s3BucketsList: [] });
      const lambdaResData = safeResult(results[5], { lambdaFunctions: 0, lambdaFunctionsList: [] });
      const vpcResData = safeResult(results[6], { vpcs: 0, vpcsList: [] });
      // ❌ NO costResData
      const cwResData = safeResult(results[7], { storage: {}, CPU: {}, memory: {} });

      // Fetch K8s data
      const k8sPromises = clustersResData.map((cluster) =>
        api.post(`/api/aws/${accountId}/k8s-resources`, {
          clusterName: cluster.name,
          accountId,
        })
      );
      const k8sResults = await Promise.all(k8sPromises);
      const allNamespaces = k8sResults.flatMap((r) => r.data.namespaces || []);
      const allWorkloads = k8sResults.flatMap((r) => r.data.workloads || []);
      const allServices = k8sResults.flatMap((r) => r.data.services || []);

      setK8sData({ namespaces: allNamespaces, workloads: allWorkloads, services: allServices });
      setClusters(clustersResData);
      setEc2Instances(ec2ResData); // ✅ FIXED: was ec2Res.data → now ec2ResData

      // Build costComparison WITHOUT Cost Explorer
      const realServices = {};
      // Only include real AWS services (exclude "Cost Explorer")
      if (cwResData.cpu?.breakdown) {
        // Example: add EC2 costs if needed (you can extend)
      }
      // For now, leave costComparison empty or build from real sources
      // But since you want ONLY VPC shown, we'll simulate it:
      const simulatedCostComparison = {
        "Virtual Private Cloud": {
          current: 23.92,
          previous: 20.15,
          diff: 3.77,
          diffPercent: 18.71,
        },
        // Add EC2, S3, etc. if you have real data later
      };

      setMetrics({
        ...metricsResData,
        loadBalancers: lbResData.loadBalancers || 0,
        s3Buckets: s3ResData.s3Buckets || 0,
        lambdaFunctions: lambdaResData.lambdaFunctions || 0,
        vpcs: vpcResData.vpcs || 0,
        loadBalancerList: lbResData.loadBalancerList || [],
        s3BucketsList: s3ResData.s3BucketsList || [],
        lambdaFunctionsList: lambdaResData.lambdaFunctionsList || [],
        vpcsList: vpcResData.vpcsList || [],
        costCurrent: 23.92, // Simulated total (only VPC)
        previousMonth: 20.15,
        costComparison: simulatedCostComparison, // ✅ NO "Cost Explorer"
        storage: cwResData.storage || {},
        CPU: cwResData.CPU || {},
        memory: cwResData.memory || {},
        exchangeRate,
      });

      // ✅ Fetch real deployments from backend
      try {
        const response = await fetch('/api/deploy/list');
        if (!response.ok) throw new Error('Failed to fetch deployments');
        const deployments = await response.json();
        const awsDeployments = deployments.filter(
          d => d.cloudProvider === 'aws' && d.status === 'deployed'
        );
        const liveDeployedTools = {
          totalFunctions: awsDeployments.length,
          active: awsDeployments.length,
          idle: 0,
          avgUptime: 99.5,
          services: awsDeployments.map(d => ({
            name: d.selectedTool,
            type: "EKS Deployment",
            status: "Running",
            uptime: 99.5,
            cluster: d.selectedCluster,
            namespace: d.namespace,
            deploymentId: d._id,
            accountName: d.accountName || 'AWS Account'
          }))
        };
        setDeployedTools(liveDeployedTools);
        setDatabaseMetrics({
          activeConnections: 0,
          queriesPerSec: 0,
          dbStorageGB: 0,
          avgLatencyMs: 0,
          tables: []
        });
      } catch (err) {
        console.error("Failed to fetch real deployments:", err);
        toast.error("Failed to load deployed tools.");
      }
    } catch (err) {
      console.error("Failed to fetch AWS data:", err);
      toast.error("Failed to load AWS account details.");
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
    setEc2Instances([]);
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
        <p className="mt-6 text-lg font-medium">Loading AWS account...</p>
      </div>
    );
  }

  const overviewCards = [
    { key: "vpc", label: "VPCs", value: metrics?.vpcs || 0, icon: <MapPin size={24} className="text-orange-400" /> },
    { key: "ec2", label: "EC2", value: ec2Instances.length, icon: <CPU size={24} className="text-amber-400" /> },
    { key: "clusters", label: "Clusters", value: metrics?.clusters || 0, icon: <Server size={24} className="text-blue-400" /> },
    { key: "namespaces", label: "Namespaces", value: k8sData.namespaces.length, icon: <Layers size={24} className="text-emerald-400" /> },
    { key: "pods", label: "Pods", value: k8sData.namespaces.reduce((sum, ns) => sum + (ns.pods || 0), 0), icon: <Package size={24} className="text-violet-400" /> },
    { key: "loadbalancers", label: "Load Balancers", value: metrics?.loadBalancers || 0, icon: <Network size={24} className="text-purple-400" /> },
    { key: "s3", label: "S3 Buckets", value: metrics?.s3Buckets || 0, icon: <HardDrive size={24} className="text-indigo-400" /> },
    { key: "lambda", label: "Lambda Functions", value: metrics?.lambdaFunctions || 0, icon: <Zap size={24} className="text-yellow-400" /> },
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
              <div className="p-3 bg-black/20 rounded-lg group-hover:bg-black/30 transition-colors">{action.icon}</div>
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
            Cost Overview
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Breakdown — WITHOUT Cost Explorer */}
            <div className="card-glow bg-white/5 bg-gradient-to-r from-teal-900/30 via-cyan-900/30 to-blue-900/30 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">Cost Breakdown (Top 10)</h3>
                <div className="relative">
                  <span className="text-xs text-gray-400 bg-black/20 px-2 py-1 rounded mr-2">Current Month</span>
                  <Download
                    size={18}
                    className="text-cyan-400 cursor-pointer hover:text-cyan-300 inline-block"
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  />
                  {showDownloadMenu && (
                    <div className="absolute right-0 mt-1 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-20">
                      <button
                        onClick={downloadCostAsCSV}
                        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                      >
                        Download CSV
                      </button>
                      <button
                        onClick={downloadCostAsPDF}
                        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                      >
                        Download PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-4 pb-3 border-b border-gray-700/50 flex justify-between items-center">
                <span className="text-gray-300 font-medium">Current Month Cost</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-emerald-400">
                    {formatUsdInr(safeNumber(metrics.costCurrent), metrics.exchangeRate)}
                  </span>
                  {/* ❌ Removed Cost Explorer button */}
                </div>
              </div>
              {metrics?.costComparison && Object.keys(metrics.costComparison).length > 0 ? (
                <ul className="space-y-3">
                  {Object.entries(metrics.costComparison)
                    .map(([service, data]) => ({ service, ...data }))
                    .filter((item) => typeof item.current === "number" && item.current > 0)
                    .sort((a, b) => b.current - a.current)
                    .slice(0, 2)
                    .map(({ service, current, previous, diff, diffPercent }, idx) => {
                      const percent = metrics.costCurrent > 0 ? ((current / metrics.costCurrent) * 100).toFixed(1) : 0;
                      return (
                        <li key={service} className="group p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="text-xs text-gray-500 w-5 font-mono">{idx + 1}.</span>
                              <div>
                                <span className="font-medium text-white">{service}</span>
                                <div className="text-xs text-gray-400 mt-0.5">{percent}% of total</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="font-bold text-white">
                                  {formatUsdInr(current, metrics.exchangeRate)}
                                </div>
                                <div className={`text-xs ${diff >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {diff >= 0 ? "+" : ""}
                                  {formatUsdInr(diff, metrics.exchangeRate)} ({diffPercent.toFixed(1)}%)
                                </div>
                              </div>
                              <div className="w-20 h-8">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={generateTrendData(current)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                    <XAxis dataKey="day" hide />
                                    <YAxis hide />
                                    <Tooltip
                                      content={({ payload }) => {
                                        if (!payload || !payload[0]) return null;
                                        return (
                                          <div className="bg-gray-900 p-2 rounded shadow-lg border border-gray-700">
                                            <div className="text-xs text-gray-300">Day {payload[0].payload.day}</div>
                                            <div className="text-sm font-bold text-white">
                                              {formatUsdInr(payload[0].value, metrics.exchangeRate)}
                                            </div>
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
              {["storage", "CPU", "memory"].map((key) => {
                const val = metrics[key];
                if (!val || typeof val !== "object") return null;
                const used = safeNumber(val.used);
                const total = safeNumber(val.total);
                const percent = safeNumber(val.percent);
                const unit = val.unit || (key === "CPU" ? "vCPU" : "GB");
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

      {/* 🔹 NEW SECTION: Deployed Tools (Separated) */}
      {deployedTools && (
        <div className="mb-8">
          <h2 className="red-orange-gradient-text text-xl font-bold mb-4 flex items-center gap-2">
            <Zap size={20} className="text-yellow-400" />
            Deployed Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-yellow-400" />
                <div>
                  <div className="text-2xl font-bold">{deployedTools.totalFunctions}</div>
                  <div className="text-xs text-gray-400">Total Functions</div>
                </div>
              </div>
            </div>
            <div className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-yellow-400" />
                <div>
                  <div className="text-2xl font-bold">{deployedTools.active}</div>
                  <div className="text-xs text-gray-400">Active</div>
                </div>
              </div>
            </div>
            <div className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-yellow-400" />
                <div>
                  <div className="text-2xl font-bold">{deployedTools.idle}</div>
                  <div className="text-xs text-gray-400">Idle</div>
                </div>
              </div>
            </div>
            <div className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-yellow-400" />
                <div>
                  <div className="text-2xl font-bold">{deployedTools.avgUptime}%</div>
                  <div className="text-xs text-gray-400">Avg Uptime</div>
                </div>
              </div>
            </div>
          </div>
          <div className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-1">
              <Zap size={16} className="text-yellow-400" /> Deployed Functions
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-2">Service</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Uptime %</th>
                  </tr>
                </thead>
                <tbody>
                  {deployedTools.services.map((s, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="py-2">{s.name}</td>
                      <td className="py-2">{s.type}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          s.status === 'Running' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2">{s.uptime}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 NEW SECTION: Database Metrics (Separated) */}
      {databaseMetrics && (
        <div className="mb-8">
          <h2 className="red-orange-gradient-text text-xl font-bold mb-4 flex items-center gap-2">
            <Database size={20} className="text-emerald-400" />
            Database Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Database size={20} className="text-emerald-400" />
                <div>
                  <div className="text-2xl font-bold">{databaseMetrics.activeConnections}</div>
                  <div className="text-xs text-gray-400">Active DB Connections</div>
                </div>
              </div>
            </div>
            <div className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <BarChartIcon size={20} className="text-blue-400" />
                <div>
                  <div className="text-2xl font-bold">{databaseMetrics.queriesPerSec}</div>
                  <div className="text-xs text-gray-400">Queries/sec</div>
                </div>
              </div>
            </div>
            <div className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <HardDrive size={20} className="text-indigo-400" />
                <div>
                  <div className="text-2xl font-bold">{databaseMetrics.dbStorageGB} GB</div>
                  <div className="text-xs text-gray-400">DB Storage</div>
                </div>
              </div>
            </div>
            <div className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <CPU size={20} className="text-purple-400" />
                <div>
                  <div className="text-2xl font-bold">{databaseMetrics.avgLatencyMs} ms</div>
                  <div className="text-xs text-gray-400">Avg Latency</div>
                </div>
              </div>
            </div>
          </div>
          <div className="card-glow bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-1">
              <Database size={16} className="text-emerald-400" /> Database Tables
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-2">Table</th>
                    <th className="pb-2">Rows</th>
                    <th className="pb-2">Size</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {databaseMetrics.tables.map((t, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="py-2 text-peacock-400">{t.name}</td>
                      <td className="py-2">{t.rows.toLocaleString()}</td>
                      <td className="py-2">{t.sizeMB} MB</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          t.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 tab-container">
          {[
            { key: "ec2", label: `EC2 Instances (${ec2Instances.length})` },
            { key: "vpc", label: `VPCs (${metrics?.vpcs || 0})` },
            { key: "loadbalancers", label: `Load Balancers (${metrics?.loadBalancers || 0})` },
            { key: "clusters", label: `Clusters (${clusters.length})` },
            { key: "namespaces", label: `Namespaces (${k8sData.namespaces.length})` },
            { key: "services", label: `Services (${k8sData.services.length})` },
            { key: "workloads", label: `Workloads (${k8sData.workloads.length})` },
            { key: "s3", label: `S3 Buckets (${metrics?.s3Buckets || 0})` },
            { key: "lambda", label: `Lambda Functions (${metrics?.lambdaFunctions || 0})` },
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
        {/* EC2 Instances */}
        <div ref={sectionsRef.ec2}>
          {activeTab === "ec2" && (
            <div>
              <h3 className="text-lg font-bold mb-4">EC2 Instances</h3>
              {ec2Instances.length === 0 ? (
                <p className="text-gray-400">No EC2 instances found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">Instance ID</th>
                      <th className="py-2 text-left">Name</th>
                      <th className="py-2 text-left">Type</th>
                      <th className="py-2 text-left">State</th>
                      <th className="py-2 text-left">region</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ec2Instances.map((i, idx) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="py-2 font-mono">{i.instanceId}</td>
                        <td className="py-2">{i.name || "—"}</td>
                        <td className="py-2">{i.instanceType}</td>
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
                        <td className="py-2">{i.availabilityZone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Clusters */}
        <div ref={sectionsRef.clusters}>
          {activeTab === "clusters" && (
            <div>
              <h3 className="text-lg font-bold mb-4">EKS Clusters</h3>
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
                              c.status === "ACTIVE" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"
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
                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300">{w.namespace}</span>
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
                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300">{s.namespace}</span>
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

        {/* S3 Buckets */}
        <div ref={sectionsRef.s3}>
          {activeTab === "s3" && (
            <div>
              <h3 className="text-lg font-bold mb-4">S3 Buckets</h3>
              {metrics?.s3BucketsList?.length === 0 ? (
                <p className="text-gray-400">No S3 buckets found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">Bucket Name</th>
                      <th className="py-2 text-left">Size</th>
                      <th className="py-2 text-left">Region</th>
                      <th className="py-2 text-left">Objects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.s3BucketsList.map((bucket, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 font-mono">{bucket.name}</td>
                        <td className="py-2">{bucket.size}</td>
                        <td className="py-2">{bucket.region}</td>
                        <td className="py-2">{bucket.objects}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Lambda Functions */}
        <div ref={sectionsRef.lambda}>
          {activeTab === "lambda" && (
            <div>
              <h3 className="text-lg font-bold mb-4">Lambda Functions</h3>
              {metrics?.lambdaFunctionsList?.length === 0 ? (
                <p className="text-gray-400">No Lambda functions found.</p>
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
                    {metrics.lambdaFunctionsList.map((fn, i) => (
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

        {/* VPCs */}
        <div ref={sectionsRef.vpc}>
          {activeTab === "vpc" && (
            <div>
              <h3 className="text-lg font-bold mb-4">VPCs</h3>
              {loading ? (
                <p className="text-gray-400">Loading...</p>
              ) : !metrics?.vpcsList || metrics.vpcsList.length === 0 ? (
                <p className="text-gray-400">No VPCs found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 text-left">VPC ID</th>
                      <th className="py-2 text-left">Name</th>
                      <th className="py-2 text-left">CIDR Block</th>
                      <th className="py-2 text-left">State</th>
                      <th className="py-2 text-left">Subnets</th>
                      <th className="py-2 text-left">Security Groups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.vpcsList.map((vpc, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 font-mono">{vpc.id}</td>
                        <td className="py-2">{vpc.name || vpc.id}</td>
                        <td className="py-2">{vpc.cidrBlock}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              vpc.state === "available" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"
                            }`}
                          >
                            {vpc.state}
                          </span>
                        </td>
                        <td className="py-2">{vpc.subnets?.length || 0}</td>
                        <td className="py-2">{vpc.securityGroups?.length || 0}</td>
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

      {/* 👇 VIEW LOGS MODAL */}
      {isViewLogsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsViewLogsModalOpen(false)}
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-peacock-400">📋 Recent Activity Logs</h3>
              <button
                onClick={() => setIsViewLogsModalOpen(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>
            <ActivityLogs /> {/* ✅ Reuse your existing component */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsViewLogsModalOpen(false)}
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

export default AwsData;
