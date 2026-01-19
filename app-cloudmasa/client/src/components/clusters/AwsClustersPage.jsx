// src/components/clusters/AwsClustersPage.jsx
"use client";
import React, { useState, useEffect } from "react";
import {
  Server, Plus, RefreshCw, Settings, ArrowLeftCircle, Cloud, XCircle,
  Search, AlertCircle, CheckCircle2, X, Layers, Loader2, ArrowUpCircle
} from "lucide-react";
import api from "../../interceptor/api.interceptor";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../hooks/useAuth';
import AddCluster from "../addClusters/AddAwsCluster";
import { useLocation, useNavigate } from 'react-router-dom'; // ✅ added useNavigate
import UpgradeClusterModal from '../UpgradeClusterModal';
import ClusterConfigPage from '../ClusterConfigPage.jsx';

// 🔁 Reuse ClusterCard (unchanged)
const ClusterCard = ({
  title,
  status,
  region,
  version,
  account,
  accountName,
  onClick,
  onRemove,
  onUpgrade,
  onConfigure,
  canManage = false,
  canUpgrade = false,
  canConfigure = false,
  liveNodeCount
}) => (
  <div
    className="relative bg-gradient-to-br from-[#2A4C83] via-[#1E2633] to-[#2A4C83] rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col h-full w-full min-w-[300px]"
  >
    <div className="absolute inset-0 bg-white opacity-10 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 pointer-events-none" />
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Server className="text-[#0ea5e9]" size={20} />
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      {status === "not-found" ? (
        <div className="group relative">
          <span
            className="px-2 py-1 text-xs font-semibold rounded-full bg-red-600 text-white flex items-center gap-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              const modal = document.createElement('div');
              modal.innerHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div class="bg-[#1e2633] border border-white/10 rounded-xl p-5 max-w-sm w-full shadow-xl">
                    <div class="flex justify-between items-start mb-3">
                      <h3 class="text-base font-bold text-red-400 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        Cluster Unavailable
                      </h3>
                      <button class="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-red-900/10 close-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <p class="text-gray-300 text-sm mb-3">
                      This cluster is no longer available because this cluster has been removed.
                    </p>
                    <div class="text-xs text-gray-400 space-y-1">
                      <div><span class="font-medium">Cluster:</span> ${title}</div>
                      <div><span class="font-medium">Account:</span> ${accountName || account || '—'}</div>
                      <div><span class="font-medium">Region:</span> ${region || '—'}</div>
                    </div>
                    <div class="mt-4 flex justify-end">
                      <button class="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-md hover:opacity-90 ok-btn">
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              `;
              document.body.appendChild(modal);
              const closeBtns = modal.querySelectorAll('.close-btn, .ok-btn');
              closeBtns.forEach(btn => {
                btn.onclick = () => document.body.removeChild(modal);
              });
            }}
          >
            <AlertCircle size={12} />
            Not Found
          </span>
        </div>
      ) : (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            status === "running"
              ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white"
              : status === "stopped"
                ? "bg-gradient-to-r from-red-500 to-orange-500 text-white"
                : "bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900"
          }`}
        >
          {status}
        </span>
      )}
    </div>
    <div className="space-y-2 text-xs flex-1">
      <div className="flex justify-between py-1.5 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Region:</span>
        <span className="text-white">{region || 'N/A'}</span>
      </div>
      <div className="flex justify-between py-1.5 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Nodes:</span>
        <span className="text-white">
          {liveNodeCount !== undefined ? liveNodeCount : '—'}
        </span>
      </div>
      <div className="flex justify-between py-1.5 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Version:</span>
        <span className="text-white">v{version || 'N/A'}</span>
      </div>
      <div className="flex justify-between py-1.5 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Account:</span>
        <span className="text-white truncate max-w-[160px]">
          {accountName || account || '—'}
        </span>
      </div>
    </div>
    <div className="mt-4 pt-3 flex gap-1.5">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onConfigure();
        }}
        disabled={!canConfigure || status === "not-found"}
        className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 rounded transition-colors ${
          canConfigure
            ? "text-gray-300 hover:text-white bg-white bg-opacity-5 hover:bg-white hover:bg-opacity-10"
            : "text-gray-500 bg-white/5 cursor-not-allowed"
        }`}
      >
        <Settings size={12} />
        Config
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        disabled={!canManage || status !== "running" || status === "not-found"}
        className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 rounded transition-colors ${
          canManage && status === "running"
            ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
            : "bg-white/5 text-gray-400 cursor-not-allowed"
        }`}
      >
        Connect
      </button>
      {canUpgrade && status === "running" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpgrade();
          }}
          className="px-2.5 py-1.5 text-blue-300 hover:text-blue-200 flex items-center justify-center bg-blue-500 bg-opacity-10 hover:bg-blue-500 hover:bg-opacity-20 rounded transition-colors"
          title="Upgrade Kubernetes Version"
        >
          <ArrowUpCircle size={14} />
        </button>
      )}
      {canManage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="px-2.5 py-1.5 text-red-400 hover:text-red-300 flex items-center justify-center bg-red-500 bg-opacity-10 hover:bg-red-500 hover:bg-opacity-20 rounded transition-colors"
          title="Remove Cluster"
        >
          <XCircle size={14} />
        </button>
      )}
    </div>
  </div>
);

// 🔁 Reuse ConfirmRemoveClusterModal (unchanged)
const ConfirmRemoveClusterModal = ({ isOpen, onClose, onConfirm, clusterName }) => {
  const [inputValue, setInputValue] = useState("");
  if (!isOpen) return null;
  const handleConfirm = () => {
    if (inputValue === "REMOVE") {
      onConfirm();
      onClose();
    } else {
      toast.warn("Please type 'REMOVE' to confirm.");
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e2633] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
            Remove Cluster
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-400 p-1.5 hover:bg-red-900/20 rounded"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-300 mb-4">
          Are you sure? This action <span className="font-semibold text-red-400">cannot be undone</span>.
        </p>
        <p className="text-sm text-gray-400 mb-4">
          All resources associated with <strong>{clusterName}</strong> will be removed.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-200 mb-1.5">
            Type <span className="text-red-400">REMOVE</span> to confirm:
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            placeholder="Type REMOVE here..."
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-md font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={inputValue !== "REMOVE"}
            className={`flex-1 px-4 py-2.5 rounded-md font-medium text-sm ${
              inputValue === "REMOVE"
                ? "bg-gradient-to-r from-red-500 to-red-600 text-gray-900 hover:from-red-600 hover:to-red-700"
                : "bg-white/10 cursor-not-allowed text-gray-400"
            }`}
          >
            <X size={14} className="inline mr-1" />
            Remove Cluster
          </button>
        </div>
      </div>
    </div>
  );
};

// 📄 Main AWS-specific Page — PLAIN BACKGROUND
const AwsClustersPage = () => {
  const location = useLocation();
  const navigate = useNavigate(); // ✅ for navigation
  const [clusters, setClusters] = useState([]);
  const [view, setView] = useState("list");
  const [showAddClusterPopup, setShowAddClusterPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('Credentials', 'Create');
  const canDelete = hasPermission('Credentials', 'Delete');
  const canManage = canCreate || canDelete;
  const canUpgrade = hasPermission('Agent', 'Configure');
  const canConfigure = hasPermission('Agent', 'Read') || hasPermission('Agent', 'Configure');

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [clusterToUpgrade, setClusterToUpgrade] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [clusterToConfigure, setClusterToConfigure] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [clusterToRemove, setClusterToRemove] = useState(null);

  // ⚠️ This logic is obsolete now — you use route-based creation
  // useEffect(() => {
  //   if (location.pathname === '/clusters/aws/create') {
  //     setView('create');
  //   }
  // }, [location.pathname]);

  const fetchClusters = async () => {
    setLoading(true);
    setIsRefetching(false);
    try {
      const dbClustersRes = await api.get("/api/clusters/get-clusters");
      const dbClusters = (dbClustersRes.data || []).filter(c => c.provider === 'aws');
      let liveClusters = [];
      try {
        const accountsRes = await api.get('/api/aws/get-aws-accounts');
        const accounts = accountsRes.data || [];
        for (const acc of accounts) {
          try {
            const eksRes = await api.post('/api/aws/eks-clusters', { accountId: acc._id });
            const clusters = (eksRes.data || []).map(c => ({
              ...c,
              account: acc.accountId,
              accountName: acc.accountName,
              provider: 'aws',
            }));
            liveClusters.push(...clusters);
          } catch (err) {
            console.warn(`⚠️ Skip AWS account: ${acc.accountName}`, err.message);
          }
        }
      } catch (err) {
        toast.warn('AWS accounts/clusters not loaded (endpoint may be missing)');
      }

      const mergedClusters = dbClusters.map(db => {
        const live = liveClusters.find(live =>
          live.name === db.name &&
          live.account === db.account &&
          live.provider === 'aws'
        );
        return {
          ...db,
          status: live ? (db.status || "running") : "not-found",
          liveNodeCount: live ? live.liveNodeCount : db.liveNodeCount,
          version: live ? live.version : db.version,
        };
      });
      setClusters(mergedClusters);
    } catch (error) {
      console.error("AWS clusters sync failed:", error);
      toast.error("Failed to sync AWS clusters");
      setClusters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  const handleClusterSelect = async (cluster) => {
    if (!canManage) return toast.warn("You don't have permission to connect.");
    if (cluster.status !== "running") return toast.warn("Only running clusters can be connected.");
    try {
      const response = await api.post("/api/clusters/connect-cluster", {
        clusterId: cluster._id,
        name: cluster.name,
        region: cluster.region,
        account: cluster.account,
        provider: 'aws',
      });
      toast.success(`✅ Connected to: ${cluster.name}`);
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("⚠️ Failed to connect.");
    }
  };

  const handleRemoveCluster = (clusterId) => {
    const cluster = clusters.find(c => c._id === clusterId);
    if (!cluster) return;
    setClusterToRemove(cluster);
    setShowRemoveModal(true);
  };

  const handleUpgradeCluster = (cluster) => {
    if (!canUpgrade) return toast.error("No permission to upgrade.");
    if (cluster.status !== 'running') return toast.warn("Only running clusters can be upgraded.");
    setClusterToUpgrade({
      _id: cluster._id,
      name: cluster.name,
      region: cluster.region,
      currentVersion: cluster.version,
      provider: 'aws',
    });
    setShowUpgradeModal(true);
  };

  const handleConfigureCluster = (cluster) => {
    setClusterToConfigure(cluster);
    setShowConfigModal(true);
  };

  const handleAddClusterClick = () => setShowAddClusterPopup(true);
  const handleCloseAddClusterPopup = () => setShowAddClusterPopup(false);

 const handleCreateClusterClick = () => {
  setView('create');
};

  const handleAddExistingClusterClick = () => {
    navigate('/sidebar/clusters/create/aws'); // ✅ Same route handles "add existing"
  };

  const handleBackToClusters = async () => {
    setIsRefetching(true);
    await fetchClusters();
    setIsRefetching(false);
    setView("list");
  };

  // ✅ Create Cluster Form (unchanged)
  const CreateClusterForm = ({ onBack }) => {
    const [savedAccounts, setSavedAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [vpcs, setVpcs] = useState([]);
    const [selectedVpc, setSelectedVpc] = useState('');
    const [subnets, setSubnets] = useState([]);
    const [selectedSubnetIds, setSelectedSubnetIds] = useState(new Set());
    const [clusterName, setClusterName] = useState('');
    const [nodeCount, setNodeCount] = useState(2);
    const [instanceType, setInstanceType] = useState("t3.micro");
    const [loadingVpcs, setLoadingVpcs] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
      const fetchAccounts = async () => {
        try {
          const res = await api.get('/api/aws/get-aws-accounts');
          setSavedAccounts(res.data);
          if (res.data.length === 1) setSelectedAccount(res.data[0]);
        } catch (err) {
          toast.error('Failed to load AWS accounts');
        }
      };
      fetchAccounts();
    }, []);

    useEffect(() => {
      if (!selectedAccount) return;
      const fetchVpcs = async () => {
        setLoadingVpcs(true);
        setError('');
        try {
          const res = await api.post('/api/aws/get-vpcs', {
            accountId: selectedAccount._id,
          });
          setVpcs(res.data.vpcs || []);
          if (res.data.vpcs?.length > 0) setSelectedVpc(res.data.vpcs[0].id);
          else setSelectedVpc('');
        } catch (err) {
          setError('Failed to fetch VPCs: ' + (err.response?.data?.error || err.message));
        } finally {
          setLoadingVpcs(false);
        }
      };
      fetchVpcs();
    }, [selectedAccount]);

    useEffect(() => {
      if (!selectedAccount || !selectedVpc) {
        setSubnets([]);
        setSelectedSubnetIds(new Set());
        return;
      }
      const vpc = vpcs.find(v => v.id === selectedVpc);
      if (!vpc) {
        setSubnets([]);
        setSelectedSubnetIds(new Set());
        return;
      }
      const enrichedSubnets = vpc.subnets.map(subnet => {
        const hasPrivateTag = subnet.name?.toLowerCase().includes('private') ||
          subnet.Tags?.some(tag =>
            tag.Key === 'kubernetes.io/role/internal-elb' ||
            (tag.Key === 'Name' && tag.Value?.toLowerCase().includes('private'))
          );
        const type = hasPrivateTag || !subnet.isPublic ? 'Private' : 'Public';
        return {
          SubnetId: subnet.id,
          AvailabilityZone: subnet.availabilityZone,
          CidrBlock: subnet.cidrBlock,
          Tags: subnet.name ? [{ Key: 'Name', Value: subnet.name }] : [],
          type
        };
      });
      setSubnets(enrichedSubnets);
      const allIds = new Set(enrichedSubnets.map(s => s.SubnetId));
      setSelectedSubnetIds(allIds);
    }, [selectedAccount, selectedVpc, vpcs]);

    const toggleSubnet = (subnetId) => {
      const newSet = new Set(selectedSubnetIds);
      newSet.has(subnetId) ? newSet.delete(subnetId) : newSet.add(subnetId);
      setSelectedSubnetIds(newSet);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError(''); setSuccess('');
      if (!selectedAccount) return setError('Please select an AWS account');
      if (!clusterName.trim()) return setError('Cluster name is required');
      if (!selectedVpc) return setError('Please select a VPC');
      if (selectedSubnetIds.size < 2) return setError('At least 2 subnets must be selected');
      setCreating(true);
      try {
        const payload = {
          clusterName: clusterName.trim(),
          vpcId: selectedVpc,
          subnetIds: Array.from(selectedSubnetIds),
          nodeCount: parseInt(nodeCount),
          instanceType: instanceType,
          awsAccountId: selectedAccount.accountId
        };
        const res = await api.post('/api/clusters/create', payload);
        if (res.data?.success) {
          setSuccess(`✅ Cluster "${clusterName}" creation initiated!`);
          setTimeout(onBack, 1500);
        } else throw new Error(res.data?.message || 'Unknown error');
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to create cluster');
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
          <Layers className="text-[#0ea5e9]" size={20} />
          Configure EKS
        </h2>
        {error && (
          <div className="bg-red-900/30 border border-red-800/40 text-red-200 p-3 rounded-md flex items-center gap-2 mb-4 text-sm">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-800/40 text-green-200 p-3 rounded-md flex items-center gap-2 mb-4 text-sm">
            <CheckCircle2 className="h-4 w-4" /> {success}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">AWS Account</label>
            <select
              value={selectedAccount?._id || ''}
              onChange={(e) => {
                const acc = savedAccounts.find(a => a._id === e.target.value);
                setSelectedAccount(acc);
              }}
              className="w-full p-2.5 rounded-md bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            >
              <option value="">Select Account</option>
              {savedAccounts.map(acc => (
                <option key={acc._id} value={acc._id}>
                  {acc.accountName || acc.accountId} ({acc.awsRegion})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Cluster Name</label>
            <input
              type="text"
              value={clusterName}
              onChange={(e) => setClusterName(e.target.value)}
              className="w-full p-2.5 rounded-md bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="my-eks-cluster"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">VPC</label>
            {loadingVpcs ? (
              <div className="flex items-center gap-2 p-2.5 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-300">
                <Loader2 className="animate-spin h-4 w-4 text-[#0ea5e9]" />
                Loading VPCs...
              </div>
            ) : (
              <select
                value={selectedVpc}
                onChange={(e) => setSelectedVpc(e.target.value)}
                className="w-full p-2.5 rounded-md bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                disabled={!selectedAccount}
                required
              >
                <option value="">Select VPC</option>
                {vpcs.map(vpc => (
                  <option key={vpc.id} value={vpc.id}>
                    {vpc.name} ({vpc.cidrBlock})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Subnets</label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-xs">
              {subnets.length > 0 ? (
                subnets.map((subnet) => (
                  <div key={subnet.SubnetId} className="flex items-center gap-2 p-2 bg-gray-700 border border-gray-600 rounded">
                    <input
                      type="checkbox"
                      id={`subnet-${subnet.SubnetId}`}
                      checked={selectedSubnetIds.has(subnet.SubnetId)}
                      onChange={() => toggleSubnet(subnet.SubnetId)}
                      className="accent-[#0ea5e9]"
                    />
                    <label htmlFor={`subnet-${subnet.SubnetId}`} className="flex-1 truncate">
                      {subnet.SubnetId} ({subnet.type}, {subnet.AvailabilityZone})
                    </label>
                  </div>
                ))
              ) : (
                <div className="p-2 bg-gray-700 border border-gray-600 rounded text-gray-400 text-sm">
                  {loadingVpcs ? 'Loading...' : 'No subnets in this VPC'}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Select ≥2 subnets (public + private recommended)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1.5">Node Count</label>
              <select
                value={nodeCount}
                onChange={(e) => setNodeCount(parseInt(e.target.value))}
                className="w-full p-2.5 rounded-md bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1.5">Instance Type</label>
              <select
                value={instanceType}
                onChange={(e) => setInstanceType(e.target.value)}
                className="w-full p-2.5 rounded-md bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="t3.micro">t3.micro (Free Tier Eligible)</option>
                <option value="t3.medium">t3.medium</option>
                <option value="t3.large">t3.large</option>
                <option value="m5.large">m5.large</option>
                <option value="m5.xlarge">m5.xlarge</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md font-medium flex items-center gap-1.5 text-sm"
            >
              <ArrowLeftCircle size={14} /> Cancel
            </button>
            <button
              type="submit"
              disabled={creating || loadingVpcs || selectedSubnetIds.size < 2}
              className={`px-4 py-2.5 rounded-md font-medium flex items-center gap-1.5 text-sm ${
                creating || loadingVpcs || selectedSubnetIds.size < 2
                  ? 'bg-gray-800 cursor-not-allowed text-gray-500'
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 hover:from-orange-600 hover:to-orange-700'
              }`}
            >
              {creating ? <><RefreshCw className="h-4 w-4 animate-spin" /> Creating...</> : 'Create Cluster'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const filteredClusters = clusters.filter(cluster => {
    const name = (cluster.name || "").toLowerCase();
    return (
      name.includes(searchTerm.toLowerCase()) &&
      (statusFilter === "all" || cluster.status === statusFilter) &&
      (regionFilter === "all" || cluster.region === regionFilter)
    );
  });

  const regionOptions = [
    { value: "us-east-1", label: "US East (N. Virginia)" },
    { value: "us-west-2", label: "US West (Oregon)" },
    { value: "eu-west-1", label: "EU (Ireland)" },
    { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  ];

  // ✅ Return — clean layout, no custom background
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <div className="min-h-screen p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {view === "create" ? (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    Create EKS Cluster
                  </span>
                </h1>
                <button
                  onClick={handleBackToClusters}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 font-semibold px-4 py-2.5 rounded-md hover:from-orange-600 hover:to-orange-700 shadow transition flex items-center gap-2 text-sm"
                >
                  <ArrowLeftCircle size={16} /> Back
                </button>
              </div>
              <CreateClusterForm onBack={handleBackToClusters} />
            </div>
          ) : (
            // ❌ REMOVED: view === "add-existing" block (no longer needed)
            <>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      AWS Clusters
                    </span>
                  </h1>
                  <p className="text-gray-300">Manage your EKS clusters</p>
                </div>
                {canManage && (
                  <button
                    onClick={handleAddClusterClick}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 font-semibold px-4 py-2.5 rounded-md hover:from-orange-600 hover:to-orange-700 shadow transition flex items-center gap-2 text-sm"
                  >
                    <Plus size={16} /> Add Cluster
                  </button>
                )}
              </div>

              <div className="flex gap-4 mb-6 flex-wrap">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search clusters..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Regions</option>
                  {regionOptions.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="running">Running</option>
                  <option value="not-found">Not Found</option>
                </select>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#0ea5e9] mb-4"></div>
                  <p className="text-gray-300">Loading AWS clusters...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {filteredClusters.length > 0 ? (
                    filteredClusters
                      .filter(c => c.name)
                      .map(cluster => (
                        <ClusterCard
                          key={cluster._id || `${cluster.name}-${cluster.region}`}
                          title={cluster.name}
                          status={cluster.status}
                          region={cluster.region}
                          version={cluster.version}
                          account={cluster.account}
                          accountName={cluster.accountName}
                          onClick={() => handleClusterSelect(cluster)}
                          onRemove={() => handleRemoveCluster(cluster._id)}
                          onUpgrade={() => handleUpgradeCluster(cluster)}
                          onConfigure={() => handleConfigureCluster(cluster)}
                          canManage={canManage}
                          canUpgrade={canUpgrade}
                          canConfigure={canConfigure}
                          liveNodeCount={cluster.liveNodeCount}
                        />
                      ))
                  ) : (
                    <div className="col-span-full text-center py-12 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl">
                      <XCircle size={48} className="mx-auto mb-4 text-gray-500" />
                      <h3 className="text-xl font-semibold text-gray-300">No AWS clusters found</h3>
                      <p className="text-gray-400 text-sm">Try adding a new EKS cluster.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Modal: Add or Create Cluster */}
              {showAddClusterPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-lg font-bold text-white">Add or Create AWS Cluster</h2>
                      <button onClick={handleCloseAddClusterPopup} className="text-gray-400 hover:text-red-400 p-1.5 rounded">
                        <X size={20} />
                      </button>
                    </div>
                    <p className="text-gray-300 mb-5 text-sm">Select how you’d like to proceed:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div onClick={handleAddExistingClusterClick} className="bg-gray-700 border border-green-600/40 rounded-lg p-4 text-center cursor-pointer hover:scale-103 transition">
                        <Plus className="text-green-400 mx-auto mb-2" size={28} />
                        <p className="text-white text-sm font-medium">Add Existing</p>
                      </div>
                      <div onClick={handleCreateClusterClick} className="bg-gray-700 border border-orange-500/40 rounded-lg p-4 text-center cursor-pointer hover:scale-103 transition">
                        <Cloud className="text-[#0ea5e9] mx-auto mb-2" size={28} />
                        <p className="text-white text-sm font-medium">Create New</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modals */}
              <UpgradeClusterModal
                isOpen={showUpgradeModal}
                onClose={() => { setShowUpgradeModal(false); setClusterToUpgrade(null); }}
                cluster={clusterToUpgrade}
                onUpgradeSuccess={fetchClusters}
              />
              {showConfigModal && clusterToConfigure && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-auto">
                  <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-7xl max-h-[90vh] overflow-auto mt-8 shadow-xl">
                    <ClusterConfigPage
                      clusterId={clusterToConfigure._id}
                      onBack={() => { setShowConfigModal(false); setClusterToConfigure(null); }}
                    />
                  </div>
                </div>
              )}
              <ConfirmRemoveClusterModal
                isOpen={showRemoveModal}
                onClose={() => { setShowRemoveModal(false); setClusterToRemove(null); }}
                onConfirm={async () => {
                  try {
                    await api.delete(`/api/clusters/${clusterToRemove._id}`);
                    toast.success(`✅ Cluster "${clusterToRemove.name}" removed!`);
                    fetchClusters();
                  } catch (err) {
                    toast.error("❌ Failed to remove cluster");
                  }
                }}
                clusterName={clusterToRemove?.name}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AwsClustersPage;
