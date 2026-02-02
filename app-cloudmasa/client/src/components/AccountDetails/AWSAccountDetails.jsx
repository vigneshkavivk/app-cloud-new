// src/components/AccountDetails/AWSAccountDetails.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  BarChart2 as BarChartIcon, // Renamed to avoid conflict
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import api from '../../interceptor/api.interceptor';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../index.css';

  const AWSAccountDetails = ({ accountId, account }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [ec2Instances, setEc2Instances] = useState([]);
  const [lastSynced, setLastSynced] = useState(null);
  const [activeTab, setActiveTab] = useState('clusters');
  const [k8sData, setK8sData] = useState({
    namespaces: [],
    workloads: [],
    services: []
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  const safeNumber = (val) => (typeof val === 'number' ? val : 0);

  // 📈 Format currency
  const formatCost = (num) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  // 🎨 Utilization color
  const getUtilizationColor = (percent) => {
    if (percent >= 90) return 'bg-red-600';
    if (percent >= 70) return 'bg-orange-700';
    return 'bg-green-500';
  };

  // 🕒 Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return isNaN(date) ? '—' : date.toLocaleDateString();
  };

  // 📊 Generate mock trend data for sparklines
  const generateTrendData = (baseValue = 30) => {
    return Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      value: Math.max(0, baseValue + Math.floor(Math.random() * 10 - 5))
    }));
  };

  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [availableResources, setAvailableResources] = useState([]); 
  const quickActions = [
    {
      key: 'add-resource',
      label: 'Add Resource',
      subtitle: 'To View In Resource Overview',
      icon: <Plus size={24} className="text-emerald-400" />,
      onClick: () => {
        setIsAddResourceModalOpen(true);
        fetchAvailableResources();
      },
    },
    {
      key: 'view-logs',
      label: 'View Logs',
      subtitle: 'Check activity logs',
      icon: <FileText size={24} className="text-blue-400" />,
      onClick: () => alert('View Logs clicked!'),
    },
    {
      key: 'set-alerts',
      label: 'Set Alerts',
      subtitle: 'Configure notifications',
      icon: <Bell size={24} className="text-yellow-400" />,
      onClick: () => alert('Set Alerts clicked!'),
    },
    {
      key: 'export-report',
      label: 'Export Report',
      subtitle: 'Download CSV/PDF',
      icon: <Download size={24} className="text-cyan-400" />,
      onClick: () => alert('Export Report clicked!'),
    },
    {
      key: 'security',
      label: 'Security',
      subtitle: 'Review policies',
      icon: <Shield size={24} className="text-green-400" />,
      onClick: () => alert('Security clicked!'),
    },
    {
      key: 'analytics',
      label: 'Analytics',
      subtitle: 'Deep insights',
      icon: <BarChartIcon size={24} className="text-purple-400" />,
      onClick: () => alert('Analytics clicked!'),
    },
  ];
  // Inside AWSAccountDetails component, add this function
const fetchAvailableResources = async () => {
  if (!accountId) return;
  try {
    // Fetch available resources from the backend
    const [
      ec2Res,
      s3Res,
      lambdaRes,
      vpcRes
    ] = await Promise.all([
      api.get(`/api/aws/${accountId}/ec2`), // Assuming this endpoint returns all EC2 instances
      api.get(`/api/aws/${accountId}/s3`),   // Assuming this endpoint returns all S3 buckets
      api.get(`/api/aws/${accountId}/lambda`), // Assuming this endpoint returns all Lambda functions
      api.get(`/api/aws/${accountId}/vpcs`),  // Assuming this endpoint returns all VPCs
    ]);

    // Format the data for display with checkboxes
    const resources = [
      ...ec2Res.data.map(instance => ({
        type: 'ec2',
        name: instance.name || instance.instanceId,
        id: instance.instanceId,
        details: `Type: ${instance.instanceType}, State: ${instance.state}`,
        selected: false // Initialize as not selected
      })),
      ...s3Res.data.s3BucketsList.map(bucket => ({
        type: 's3',
        name: bucket.name,
        id: bucket.name,
        details: `Region: ${bucket.region}, Size: ${bucket.size}`,
        selected: false
      })),
      ...lambdaRes.data.lambdaFunctionsList.map(fn => ({
        type: 'lambda',
        name: fn.functionName,
        id: fn.functionName,
        details: `Runtime: ${fn.runtime}, Memory: ${fn.memorySize}MB`,
        selected: false
      })),
      ...vpcRes.data.vpcsList.map(vpc => ({
        type: 'vpc',
        name: vpc.name || vpc.id,
        id: vpc.id,
        details: `CIDR: ${vpc.cidrBlock}, State: ${vpc.state}`,
        selected: false
      }))
    ];

    setAvailableResources(resources);
  } catch (err) {
    console.error('Failed to fetch available resources:', err);
    toast.error('Failed to load available resources.');
    setAvailableResources([]); // Ensure state is reset on error
  }
};

  const handleAddResource = (type, id) => {
  switch (type) {
    case 'ec2':
      const newEc2 = {
        instanceId: id,
        name: 'New Instance',
        instanceType: 't3.micro',
        state: 'running',
        availabilityZone: 'us-east-1a',
      };
      setEc2Instances(prev => [...prev, newEc2]);
      scrollToSection('ec2');
      break;

    case 's3':
      const newBucket = {
        name: id,
        size: '0 B',
        region: 'us-east-1',
        objects: 0,
      };
      setMetrics(prev => ({
        ...prev,
        s3Buckets: (prev?.s3Buckets || 0) + 1,
        s3BucketsList: [...(prev?.s3BucketsList || []), newBucket],
      }));
      scrollToSection('s3');
      break;

    case 'lambda':
      const newFn = {
        functionName: id,
        runtime: 'nodejs18.x',
        memorySize: 128,
        lastModified: new Date().toISOString(),
      };
      setMetrics(prev => ({
        ...prev,
        lambdaFunctions: (prev?.lambdaFunctions || 0) + 1,
        lambdaFunctionsList: [...(prev?.lambdaFunctionsList || []), newFn],
      }));
      scrollToSection('lambda');
      break;

    case 'vpc':
      const newVpc = {
        id: id,
        name: id,
        cidrBlock: '10.0.0.0/16',
        state: 'available',
        subnets: [],
        securityGroups: [],
      };
      setMetrics(prev => ({
        ...prev,
        vpcs: (prev?.vpcs || 0) + 1,
        vpcsList: [...(prev?.vpcsList || []), newVpc],
      }));
      scrollToSection('vpc');
      break;

    default:
      toast.info('Resource type not supported yet.');
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
        ec2Res,
        lbRes,
        s3Res,
        lambdaRes,
        vpcRes,
        costRes,
        cwRes
      ] = await Promise.all([
        api.get(`/api/aws/${accountId}/metrics`),
        api.get(`/api/aws/${accountId}/clusters`),
        api.get(`/api/aws/${accountId}/ec2`),
        api.post(`/api/aws/${accountId}/load-balancers`, { accountId }),
        api.post(`/api/aws/${accountId}/s3`, { accountId }),
        api.post(`/api/aws/${accountId}/lambda`, { accountId }),
        api.post(`/api/aws/${accountId}/vpcs`, { accountId }),
        api.post(`/api/aws/${accountId}/cost-explorer`, { accountId }),
        api.post(`/api/aws/${accountId}/cloudwatch-metrics-with-credits`, { accountId })
      ]);

      // Fetch K8s data
      const k8sPromises = clustersRes.data.map(cluster =>
        api.post(`/api/aws/${accountId}/k8s-resources`, {
          clusterName: cluster.name,
          accountId
        })
      );
      const k8sResults = await Promise.all(k8sPromises);

      const allNamespaces = k8sResults.flatMap(r => r.data.namespaces || []);
      const allWorkloads = k8sResults.flatMap(r => r.data.workloads || []);
      const allServices = k8sResults.flatMap(r => r.data.services || []);

      setK8sData({ namespaces: allNamespaces, workloads: allWorkloads, services: allServices });
      setClusters(clustersRes.data);
      setEc2Instances(ec2Res.data);

      const currentMonth = costRes.data.currentMonth || 0;

      setMetrics({
        ...metricsRes.data,
        loadBalancers: lbRes.data.loadBalancers || 0,
        s3Buckets: s3Res.data.s3Buckets || 0,
        lambdaFunctions: lambdaRes.data.lambdaFunctions || 0,
        vpcs: vpcRes.data.vpcs || 0,
        loadBalancerList: lbRes.data.loadBalancerList || [],
        s3BucketsList: s3Res.data.s3BucketsList || [],
        lambdaFunctionsList: lambdaRes.data.lambdaFunctionsList || [],
        vpcsList: vpcRes.data.vpcsList || [],
        costCurrent: currentMonth,
        storage: cwRes.data.storage,
        cpu: cwRes.data.cpu,
        memory: cwRes.data.memory,
      });

    } catch (err) {
      console.error('Failed to fetch AWS data:', err);
      toast.error('Failed to load AWS account details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accountId) return;
    fetchAllData();
  }, [accountId]);

  const refreshData = () => {
    setLastSynced(new Date().toLocaleTimeString());
    setIsRefreshing(true);
    setMetrics(null);
    setClusters([]);
    setEc2Instances([]);
    setK8sData({ namespaces: [], workloads: [], services: [] });
    setLoading(true);
    fetchAllData().finally(() => {
      setIsRefreshing(false);
    });
  };

  const scrollToSection = (tabKey) => {
    setActiveTab(tabKey);
    if (sectionsRef[tabKey]?.current) {
      sectionsRef[tabKey].current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-white">
        <div className="loader" aria-label="Loading">
          <div className="box"></div>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <clipPath id="clipping">
                <polygon points="50,0 60,40 100,50 60,60 50,100 40,60 0,50 40,40" />
                <polygon points="50,15 55,45 85,50 55,55 50,85 45,55 15,50 45,45" />
                <polygon points="50,25 53,47 75,50 53,53 50,75 47,53 25,50 47,47" />
                <polygon points="50,30 52,48 70,50 52,52 50,70 48,52 30,50 48,48" />
                <polygon points="50,35 51,49 65,50 51,51 50,65 49,51 35,50 49,49" />
                <polygon points="50,20 54,46 80,50 54,54 50,80 46,54 20,50 46,46" />
                <polygon points="50,10 56,44 90,50 56,56 50,90 44,56 10,50 44,44" />
              </clipPath>
            </defs>
          </svg>
        </div>
        <p className="mt-6 text-lg font-medium">Loading AWS account...</p>
      </div>
    );
  }

  const overviewCards = [
    { key: 'vpc', label: 'VPCs', value: metrics?.vpcs || 0, icon: <MapPin size={24} className="text-orange-400" /> },
    { key: 'ec2', label: 'EC2', value: ec2Instances.length, icon: <Cpu size={24} className="text-amber-400" /> },
    { key: 'clusters', label: 'Clusters', value: metrics?.clusters || 0, icon: <Server size={24} className="text-blue-400" /> },
    { key: 'namespaces', label: 'Namespaces', value: k8sData.namespaces.length, icon: <Layers size={24} className="text-emerald-400" /> },
    { key: 'pods', label: 'Pods', value: k8sData.namespaces.reduce((sum, ns) => sum + (ns.pods || 0), 0), icon: <Package size={24} className="text-violet-400" /> },
    { key: 'loadbalancers', label: 'Load Balancers', value: metrics?.loadBalancers || 0, icon: <Network size={24} className="text-purple-400" /> },
    { key: 's3', label: 'S3 Buckets', value: metrics?.s3Buckets || 0, icon: <HardDrive size={24} className="text-indigo-400" /> },
    { key: 'lambda', label: 'Lambda Functions', value: metrics?.lambdaFunctions || 0, icon: <Zap size={24} className="text-yellow-400" /> },
    { key: 'workloads', label: 'Workloads', value: k8sData.workloads.length, icon: <Cloud size={24} className="text-cyan-400" /> },
    { key: 'services', label: 'Services', value: k8sData.services.length, icon: <Globe size={24} className="text-green-400" /> },
  ];

  const getChangeBadgeClass = (change) => {
    if (change > 0) return 'bg-green-500/20 text-green-400 border border-green-500/30';
    if (change < 0) return 'bg-red-500/20 text-red-400 border border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  };

  return (
    <div className={`p-4 max-w-7xl mx-auto ${isRefreshing ? 'refreshing' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 text-gray-400 hover:text-white rounded-full bg-gray-800"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-4xl red-orange-gradient-text font-bold">AWS Cloud</h1>
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
              Connected
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Last synced: {lastSynced || '—'}</span>
          <button
            onClick={refreshData}
            disabled={loading}
            className={`flex items-center justify-center gap-1 px-3 py-1.5 text-sm rounded-md transition-all ${
              loading ? 'bg-gray-800 cursor-not-allowed' : 'bg-gray-800 hover:bg-orange-800 hover:text-white hover:shadow-md'
            }`}
            aria-label="Refresh data"
          >
            {loading ? (
              <div className="loader" style={{ '--size': 0.3, width: '20px', height: '20px' }} aria-hidden="true">
                <div className="box"></div>
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <clipPath id="clipping">
                      <polygon points="50,0 60,40 100,50 60,60 50,100 40,60 0,50 40,40" />
                      <polygon points="50,15 55,45 85,50 55,55 50,85 45,55 15,50 45,45" />
                      <polygon points="50,25 53,47 75,50 53,53 50,75 47,53 25,50 47,47" />
                      <polygon points="50,30 52,48 70,50 52,52 50,70 48,52 30,50 48,48" />
                      <polygon points="50,35 51,49 65,50 51,51 50,65 49,51 35,50 49,49" />
                      <polygon points="50,20 54,46 80,50 54,54 50,80 46,54 20,50 46,46" />
                      <polygon points="50,10 56,44 90,50 56,56 50,90 44,56 10,50 44,44" />
                    </clipPath>
                  </defs>
                </svg>
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

      <div className="text-sm text-gray-400 mb-2">
        Amazon Web Services • {account.accountName} • {account.region || 'N/A'}
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
            
            {/* Mock list of AWS resources */}
            <ul className="space-y-2">
              {[
                { type: 'ec2', name: 'EC2 Instance (t3.micro)', id: `i-${Date.now()}` },
                { type: 's3', name: 'S3 Bucket', id: `bucket-${Date.now()}` },
                { type: 'lambda', name: 'Lambda Function', id: `fn-${Date.now()}` },
                { type: 'vpc', name: 'VPC', id: `vpc-${Date.now()}` },
              ].map((res) => (
                <li key={res.id}>
                  <button
                    onClick={() => {
                      // ✅ Handle resource addition
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
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 w-full h-36 hover:bg-white/10 transition-all cursor-pointer relative group"
            >
              <div className={`absolute top-2 right-2 text-xs font-medium px-1.5 py-0.5 rounded-full ${getChangeBadgeClass(0)}`}>
                ~0%
              </div>
              {card.icon}
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <div className="text-sm text-gray-400">{card.label}</div>
              <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/20 rounded-xl transition-opacity pointer-events-none"></div>
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
            {/* Cost Breakdown (Top 10) */}
            <div className="bg-white/5 bg-gradient-to-r from-teal-900/30 via-cyan-900/30 to-blue-900/30 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Cost Breakdown (Top 10)
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 bg-black/20 px-2 py-1 rounded">
                    Current Month
                  </span>
                  <button
                    onClick={() => {
                      const data = Object.entries(metrics.resourceCosts || {})
                        .map(([resource, cost]) => ({ resource, cost }))
                        .filter(item => typeof item.cost === 'number' && item.cost > 0)
                        .sort((a, b) => b.cost - a.cost)
                        .slice(0, 10)
                        .map(({ resource, cost }) => ({
                          Resource: resource,
                          Cost: formatCost(cost),
                          PercentOfTotal: metrics.costCurrent > 0 ? ((cost / metrics.costCurrent) * 100).toFixed(1) + '%' : '0%'
                        }));

                      const csvContent = [
                        ['Resource', 'Cost', 'Percent of Total'],
                        ...data.map(row => [row.Resource, row.Cost, row.PercentOfTotal])
                      ]
                        .map(e => e.join(','))
                        .join('\n');

                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', `aws_cost_breakdown_${new Date().toISOString().split('T')[0]}.csv`);
                      link.style.visibility = 'hidden';
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

              {/* Overall Total */}
              <div className="mb-4 pb-3 border-b border-gray-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Overall Cost</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {formatCost(safeNumber(metrics.costCurrent))}
                  </span>
                </div>
              </div>

              {/* Top 10 Resources */}
              {metrics?.resourceCosts && Object.keys(metrics.resourceCosts).length > 0 ? (
                <ul className="space-y-3">
                  {Object.entries(metrics.resourceCosts)
                    .map(([resource, cost]) => ({ resource, cost }))
                    .filter(item => typeof item.cost === 'number' && item.cost > 0)
                    .sort((a, b) => b.cost - a.cost)
                    .slice(0, 10)
                    .map(({ resource, cost }, idx) => {
                      const percent = metrics.costCurrent > 0
                        ? ((cost / metrics.costCurrent) * 100).toFixed(1)
                        : 0;

                      const tabKeyMap = {
                        "EC2": "ec2",
                        "S3": "s3",
                        "Lambda": "lambda",
                        "RDS": "rds",
                        "VPC": "vpc",
                        "EKS": "clusters",
                        "Load Balancer": "loadbalancers",
                        "CloudWatch": "cloudwatch",
                        "DynamoDB": "dynamodb",
                        "API Gateway": "apigateway"
                      };
                      const tabKey = tabKeyMap[resource] || null;

                      return (
                        <li key={resource} className="group p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="text-xs text-gray-500 w-5 font-mono">{idx + 1}.</span>
                              <div>
                                {tabKey ? (
                                  <button
                                    onClick={() => scrollToSection(tabKey)}
                                    className="font-medium text-white group-hover:text-emerald-300 transition-colors underline-offset-2 hover:underline"
                                  >
                                    {resource}
                                  </button>
                                ) : (
                                  <span className="font-medium text-white">{resource}</span>
                                )}
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

              {metrics?.resourceCosts && Object.keys(metrics.resourceCosts).length > 10 && (
                <div className="mt-3 text-center">
                  <span className="text-xs text-gray-500">
                    Showing top 10 of {Object.keys(metrics.resourceCosts).length} billable services
                  </span>
                </div>
              )}
            </div>

            {/* Resource Utilization */}
            <div className="bg-white/5 bg-gradient-to-r from-blue-900/30 via-cyan-900/30 to-teal-900/30 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Resource Utilization</h3>
              {['storage', 'cpu', 'memory'].map((key) => {
                const val = metrics[key];
                if (!val || typeof val !== 'object') return null;
                const used = safeNumber(val.used);
                const total = safeNumber(val.total);
                const percent = safeNumber(val.percent);
                const unit = val.unit || (key === 'cpu' ? 'vCPU' : 'GB');

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
            { key: 'ec2', label: `EC2 Instances (${ec2Instances.length})` },
            { key: 'vpc', label: `VPCs (${metrics?.vpcs || 0})` },
            { key: 'loadbalancers', label: `Load Balancers (${metrics?.loadBalancers || 0})` },
            { key: 'clusters', label: `Clusters (${clusters.length})` },
            { key: 'namespaces', label: `Namespaces (${k8sData.namespaces.length})` },
            { key: 'services', label: `Services (${k8sData.services.length})` },
            { key: 'workloads', label: `Workloads (${k8sData.workloads.length})` },
            { key: 's3', label: `S3 Buckets (${metrics?.s3Buckets || 0})` },
            { key: 'lambda', label: `Lambda Functions (${metrics?.lambdaFunctions || 0})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (sectionsRef[tab.key]?.current) {
                  sectionsRef[tab.key].current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className={`px-3 py-2 rounded-md text-sm font-small whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-red-800 to-orange-700'
                  : 'bg-white/5 backdrop-blur-sm border border-white/10 text-gray-300 hover:bg-white/10'
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
          {activeTab === 'ec2' && (
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
                      <th className="py-2 text-left">AZ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ec2Instances.map((i, idx) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="py-2 font-mono">{i.instanceId}</td>
                        <td className="py-2">{i.name || '—'}</td>
                        <td className="py-2">{i.instanceType}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              i.state === 'running'
                                ? 'bg-green-500/20 text-green-300'
                                : i.state === 'stopped'
                                  ? 'bg-gray-500/20 text-gray-300'
                                  : 'bg-yellow-500/20 text-yellow-300'
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
          {activeTab === 'clusters' && (
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
                              c.status === 'ACTIVE'
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-yellow-500/20 text-yellow-300'
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
          {activeTab === 'namespaces' && (
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
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            ns.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
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
          {activeTab === 'workloads' && (
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
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            w.status === 'True' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
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
          {activeTab === 'services' && (
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
                        <td className="py-2">{s.clusterIP || '—'}</td>
                        <td className="py-2">{s.ports?.join(', ') || '—'}</td>
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
          {activeTab === 'loadbalancers' && (
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
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            lb.state === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
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
          {activeTab === 's3' && (
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
          {activeTab === 'lambda' && (
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
          {activeTab === 'vpc' && (
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
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            vpc.state === 'available' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
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
              <h3 className="text-xl font-bold capitalize">
                {selectedResource} Usage Details
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>

            {(() => {
              const resourceData = metrics[selectedResource];
              if (!resourceData?.breakdown || resourceData.breakdown.length === 0) {
                return <p className="text-gray-400">No detailed usage data available.</p>;
              }

              return (
                <div className="space-y-3">
                  {resourceData.breakdown.map((item, idx) => (
                    <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium text-white">{item.name}</div>
                          <div className="text-xs text-gray-400">{item.type}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-white">
                            {item.used} {resourceData.unit || (selectedResource === 'cpu' ? 'vCPU' : 'GB')}
                          </div>
                        </div>
                      </div>
                      {item.instanceId && (
                        <div className="text-xs text-gray-500 mt-1">Instance: {item.instanceId}</div>
                      )}
                      {item.instanceType && (
                        <div className="text-xs text-gray-500">Type: {item.instanceType}</div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

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

export default AWSAccountDetails;
