// src/components/cluster/GcpClustersPage.jsx
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
//import AddCluster from "../AddCluster";
import AddGcpCluster from '../addClusters/AddGcpCluster';
import { useLocation } from 'react-router-dom';
import UpgradeClusterModal from '../UpgradeClusterModal';
import ClusterConfigPage from '../ClusterConfigPage.jsx';

// 🔁 ClusterCard (same)
const ClusterCard = ({ title, status, region, version, account, accountName, onClick, onRemove, onUpgrade, onConfigure, canManage = false, canUpgrade = false, canConfigure = false, liveNodeCount }) => (
  <div className="relative bg-gradient-to-br from-[#1a73e8] via-[#0d2a4d] to-[#1a73e8] rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col h-full w-full min-w-[300px]">
    <div className="absolute inset-0 bg-white opacity-10 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 pointer-events-none" />
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Server className="text-[#81d4fa]" size={20} />
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
            <AlertCircle size={12} /> Not Found
          </span>
        </div>
      ) : (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
          status === "running" ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white" :
          status === "stopped" ? "bg-gradient-to-r from-red-500 to-orange-500 text-white" :
          "bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900"
        }`}>
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
        <span className="text-white">{liveNodeCount !== undefined ? liveNodeCount : '—'}</span>
      </div>
      <div className="flex justify-between py-1.5 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Version:</span>
        <span className="text-white">v{version || 'N/A'}</span>
      </div>
      <div className="flex justify-between py-1.5 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Account:</span>
        <span className="text-white truncate max-w-[160px]">{accountName || account || '—'}</span>
      </div>
    </div>
    <div className="mt-4 pt-3 flex gap-1.5">
      <button
        onClick={(e) => { e.stopPropagation(); onConfigure(); }}
        disabled={!canConfigure || status === "not-found"}
        className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 rounded transition-colors ${
          canConfigure ? "text-gray-300 hover:text-white bg-white bg-opacity-5 hover:bg-white hover:bg-opacity-10" : "text-gray-500 bg-white/5 cursor-not-allowed"
        }`}
      >
        <Settings size={12} /> Config
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        disabled={!canManage || status !== "running" || status === "not-found"}
        className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 rounded transition-colors ${
          canManage && status === "running" ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white" : "bg-white/5 text-gray-400 cursor-not-allowed"
        }`}
      >
        Connect
      </button>
      {canUpgrade && status === "running" && (
        <button
          onClick={(e) => { e.stopPropagation(); onUpgrade(); }}
          className="px-2.5 py-1.5 text-blue-300 hover:text-blue-200 flex items-center justify-center bg-blue-500 bg-opacity-10 hover:bg-blue-500 hover:bg-opacity-20 rounded transition-colors"
          title="Upgrade Kubernetes Version"
        >
          <ArrowUpCircle size={14} />
        </button>
      )}
      {canManage && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="px-2.5 py-1.5 text-red-400 hover:text-red-300 flex items-center justify-center bg-red-500 bg-opacity-10 hover:bg-red-500 hover:bg-opacity-20 rounded transition-colors"
          title="Remove Cluster"
        >
          <XCircle size={14} />
        </button>
      )}
    </div>
  </div>
);

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
          <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">Remove Cluster</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-400 p-1.5 hover:bg-red-900/20 rounded">
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
            <X size={14} className="inline mr-1" /> Remove Cluster
          </button>
        </div>
      </div>
    </div>
  );
};

const GcpClustersPage = () => {
  const location = useLocation();
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

  useEffect(() => {
    if (location.pathname === '/clusters/gcp/create') {
      setView('create');
    }
  }, [location.pathname]);

  const fetchClusters = async () => {
    setLoading(true);
    setIsRefetching(false);
    try {
      // DB clusters (GCP only)
      const dbClustersRes = await api.get("/api/clusters/get-clusters");
      const dbClusters = (dbClustersRes.data || []).filter(c => c.provider === 'gcp');

      // Live GKE clusters
      let liveClusters = [];
      try {
        const accountsRes = await api.get('/api/gcp/accounts');
        const accounts = accountsRes.data || [];
        for (const acc of accounts) {
          try {
            const gkeRes = await api.post('/api/gcp/gke-clusters', { accountId: acc._id });
            const clusters = (gkeRes.data || []).map(c => ({
              ...c,
              account: acc.projectId,
              accountName: acc.projectName,
              provider: 'gcp',
            }));
            liveClusters.push(...clusters);
          } catch (err) {
            console.warn(`⚠️ Skip GCP account: ${acc.projectName}`, err.message);
          }
        }
      } catch (err) {
        toast.warn('GCP accounts/clusters not loaded (endpoint may be missing)');
      }

      // Merge
      const mergedClusters = dbClusters.map(db => {
        const live = liveClusters.find(live =>
          live.name === db.name &&
          live.account === db.account &&
          live.provider === 'gcp'
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
      console.error("GCP clusters sync failed:", error);
      toast.error("Failed to sync GCP clusters");
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
      await api.post("/api/clusters/connect-cluster", {
        clusterId: cluster._id,
        name: cluster.name,
        region: cluster.region,
        account: cluster.account,
        provider: 'gcp',
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
      provider: 'gcp',
    });
    setShowUpgradeModal(true);
  };

  const handleConfigureCluster = (cluster) => {
    setClusterToConfigure(cluster);
    setShowConfigModal(true);
  };

  const handleAddClusterClick = () => setShowAddClusterPopup(true);
  const handleCloseAddClusterPopup = () => setShowAddClusterPopup(false);
  const handleAddExistingClusterClick = () => {
    setView("add-existing");
    setShowAddClusterPopup(false);
  };

  const handleBackToClusters = async () => {
    setIsRefetching(true);
    await fetchClusters();
    setIsRefetching(false);
    setView("list");
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
    { value: "us-central1", label: "us-central1 (Iowa)" },
    { value: "us-east1", label: "us-east1 (South Carolina)" },
    { value: "europe-west1", label: "europe-west1 (Belgium)" },
    { value: "asia-south1", label: "asia-south1 (Mumbai)" },
    { value: "asia-east1", label: "asia-east1 (Taiwan)" },
  ];

  // --- START: Create GKE Cluster Form ---
const CreateGkeClusterForm = ({ onBack }) => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [clusterName, setClusterName] = useState('');
  const [region, setRegion] = useState('us-central1');
  const [nodeCount, setNodeCount] = useState(2);
  const [machineType, setMachineType] = useState('e2-medium');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const { data } = await api.get('/api/gcp/accounts');
        const gcpAccounts = data.filter(a => a.cloudProvider === 'Google Cloud');
        setAccounts(gcpAccounts);
        if (gcpAccounts.length === 1) setSelectedAccount(gcpAccounts[0]);
      } catch (err) {
        toast.error('Failed to load GCP accounts');
      }
    };
    loadAccounts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedAccount) return setError('Select a GCP project');
    if (!clusterName.trim()) return setError('Cluster name is required');

    const payload = {
      clusterName: clusterName.trim(),
      projectId: selectedAccount.projectId,
      region,
      nodeCount: parseInt(nodeCount),
      machineType,
    };

    setCreating(true);
    try {
      // ⚠️ You must implement this backend endpoint
      const res = await api.post('/api/clusters/create-gke', payload);
      if (res.data?.success) {
        setSuccess(`✅ Cluster "${clusterName}" creation started!`);
        setTimeout(onBack, 2000);
      } else {
        throw new Error(res.data?.message || 'Unknown error');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create GKE cluster');
    } finally {
      setCreating(false);
    }
  };

  const machineTypes = [
    'e2-micro', 'e2-small', 'e2-medium',
    'e2-standard-2', 'e2-standard-4', 'e2-standard-8',
    'n2-standard-2', 'n2-standard-4'
  ];

  return (
    <div className="bg-[#1e2633] p-6 rounded-xl border border-white/10 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">Create New GKE Cluster</h2>
      <p className="text-gray-300 text-sm mb-6">Configure your Google Kubernetes Engine cluster.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 text-red-200 rounded-md flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-800/50 text-green-200 rounded-md flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* GCP Project */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">GCP Project</label>
          <select
            value={selectedAccount?._id || ''}
            onChange={(e) => {
              const acc = accounts.find(a => a._id === e.target.value);
              setSelectedAccount(acc);
            }}
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500"
            required
          >
            <option value="">Select a project</option>
            {accounts.map(acc => (
              <option key={acc._id} value={acc._id}>
                {acc.projectName} ({acc.projectId})
              </option>
            ))}
          </select>
        </div>

        {/* Cluster Name */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">Cluster Name</label>
          <input
            type="text"
            value={clusterName}
            onChange={(e) => setClusterName(e.target.value)}
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500"
            placeholder="my-gke-cluster"
            required
          />
        </div>

        {/* Region */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">Region</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500"
          >
            {regionOptions.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Node Count */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">Node Count</label>
          <select
            value={nodeCount}
            onChange={(e) => setNodeCount(e.target.value)}
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500"
          >
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Machine Type */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">Machine Type</label>
          <select
            value={machineType}
            onChange={(e) => setMachineType(e.target.value)}
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500"
          >
            {machineTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-md font-medium flex items-center gap-1.5 text-sm"
          >
            <ArrowLeftCircle size={14} /> Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className={`px-4 py-2.5 rounded-md font-medium flex items-center gap-1.5 text-sm ${
              creating
                ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-gray-900 hover:from-emerald-600 hover:to-emerald-700'
            }`}
          >
            {creating ? (
              <>
                <Loader2 className="animate-spin h-4 w-4" /> Creating...
              </>
            ) : (
              'Create GKE Cluster'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
// --- END: Create GKE Cluster Form ---

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .gcp-cluster-page {
          min-height: 100vh;
          background: linear-gradient(125deg, #0a0d1a 0%, #0d2a4d 35%, #1a73e8/20% 65%, #0c1120 100%);
          color: #e5e7eb;
          font-family: 'Inter', system-ui, sans-serif;
          padding: 1.5rem;
        }
      `}</style>
      <div className="gcp-cluster-page">
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />

       {view === "add-existing" ? (
  <div>
    <button
      onClick={handleBackToClusters}
      className="bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 font-semibold px-4 py-2.5 rounded-md hover:from-orange-600 hover:to-orange-700 shadow transition flex items-center gap-2 mb-6 text-sm"
    >
      <ArrowLeftCircle size={16} /> Back
    </button>
    <AddGcpCluster onClusterAdded={fetchClusters} />
  </div>
) : view === "create" ? (
  <div>
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold">
        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Create GKE Cluster
        </span>
      </h1>
      <button
        onClick={handleBackToClusters}
        className="bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 font-semibold px-4 py-2.5 rounded-md hover:from-orange-600 hover:to-orange-700 shadow transition flex items-center gap-2 text-sm"
      >
        <ArrowLeftCircle size={16} /> Back
      </button>
    </div>
    <CreateGkeClusterForm onBack={handleBackToClusters} />
  </div>
) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold">
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    Google Cloud Clusters
                  </span>
                </h1>
                <p className="text-gray-300">Manage your GKE clusters</p>
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
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Regions</option>
                {regionOptions.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="not-found">Not Found</option>
              </select>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#81d4fa] mb-4"></div>
                <p className="text-gray-300">Loading GCP clusters...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredClusters.length > 0 ? (
                  filteredClusters
                    .filter(c => c.name)
                    .map(cluster => (
                      <ClusterCard
                        key={cluster._id}
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
                  <div className="col-span-full text-center py-12 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl">
                    <XCircle size={48} className="mx-auto mb-4 text-gray-500" />
                    <h3 className="text-xl font-semibold text-gray-300">No GCP clusters found</h3>
                    <p className="text-gray-400 text-sm">Try adding an existing GKE cluster.</p>
                  </div>
                )}
              </div>
            )}

            {/* Modals */}
    {showAddClusterPopup && (
       <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg flex items-center justify-center z-50 p-4">
       <div className="bg-[#1e2633] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
       <div className="flex justify-between items-start mb-4">
       <h2 className="text-lg font-bold text-white">Add or Create Google Cloud Cluster</h2>
       <button onClick={handleCloseAddClusterPopup} className="text-gray-400 hover:text-red-400 p-1.5 rounded">
          <X size={20} />
        </button>
      </div>
      <p className="text-gray-300 mb-6 text-sm">Select how you’d like to proceed:</p>

      <div className="grid grid-cols-2 gap-4">
        {/* Add Existing */}
        <button
          onClick={handleAddExistingClusterClick}
          className="flex flex-col items-center p-4 border border-green-500 rounded-lg hover:bg-green-500 hover:bg-opacity-10 transition"
        >
          <span className="text-green-400 mb-2">➕</span>
          <span>Add Existing</span>
        </button>

        {/* Create New */}
        <button
          onClick={() => {
            setView('create');
            setShowAddClusterPopup(false);
          }}
          className="flex flex-col items-center p-4 border border-blue-500 rounded-lg hover:bg-blue-500 hover:bg-opacity-10 transition"
        >
          <span className="text-blue-400 mb-2">☁️</span>
          <span>Create New</span>
        </button>
      </div>
    </div>
  </div>
)}

            <UpgradeClusterModal
              isOpen={showUpgradeModal}
              onClose={() => { setShowUpgradeModal(false); setClusterToUpgrade(null); }}
              cluster={clusterToUpgrade}
              onUpgradeSuccess={fetchClusters}
            />
            {showConfigModal && clusterToConfigure && (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg flex items-start justify-center z-50 p-4 overflow-auto">
                <div className="bg-[#0f172a] rounded-xl border border-white/10 w-full max-w-7xl max-h-[90vh] overflow-auto mt-8 shadow-2xl">
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
    </>
  );
};

export default GcpClustersPage;
