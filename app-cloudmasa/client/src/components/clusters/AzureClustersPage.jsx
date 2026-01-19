// src/components/cluster/AzureClustersPage.jsx
"use client";
import React, { useState, useEffect } from "react";
import {
  Server, Plus, RefreshCw, Settings, ArrowLeftCircle, Cloud, XCircle,
  Search, AlertCircle, CheckCircle2, X, Layers, Loader2, ArrowUpCircle,
  User, MapPin, Star
} from "lucide-react";
import api from "../../interceptor/api.interceptor";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../hooks/useAuth';
import UpgradeClusterModal from '../UpgradeClusterModal';
import ClusterConfigPage from '../ClusterConfigPage.jsx';
import CreateAzureClusterForm from '../addClusters/CreateAzureClusterForm';

// 🔁 ClusterCard (unchanged)
const ClusterCard = ({ title, status, region, version, account, accountName, onClick, onRemove, onUpgrade, onConfigure, canManage = false, canUpgrade = false, canConfigure = false, liveNodeCount }) => (
  <div className="relative bg-gradient-to-br from-[#0078d4] via-[#0e2a47] to-[#0078d4] rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col h-full w-full min-w-[300px]">
    <div className="absolute inset-0 bg-white opacity-10 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 pointer-events-none" />
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Server className="text-[#38bdf8]" size={20} />
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

// ✅ ConfirmRemoveClusterModal Component
const ConfirmRemoveClusterModal = ({ isOpen, onClose, onConfirm, clusterName }) => {
  const [inputValue, setInputValue] = useState("");

  const handleConfirm = () => {
    if (inputValue === "REMOVE") {
      onConfirm();
      setInputValue("");
      onClose();
    }
  };

  if (!isOpen) return null;

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

// 📄 Main Azure Page
const AzureClustersPage = () => {
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

  const handleCreateClusterClick = () => {
    setView("create");
    setShowAddClusterPopup(false);
  };

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

  // ✅ FIXED: Send accountId as QUERY PARAM
  const fetchClusters = async () => {
    setLoading(true);
    try {
      const dbClustersRes = await api.get("/api/clusters/get-clusters");
      const dbClusters = (dbClustersRes.data || []).filter(c => c.provider === 'azure');

      const accountsRes = await api.get('/api/azure/accounts');
      const accounts = accountsRes.data || [];

      let liveClusters = [];
      for (const acc of accounts) {
        if (!acc._id) continue; // ✅ safety

        try {
          // ✅ CORRECT: accountId in QUERY, not body
          const aksRes = await api.post(`/api/azure/aks-clusters?accountId=${acc._id}`);
          const clusters = (aksRes.data || []).map(c => {
            let clusterName = c.name || c.clusterName;
            if (!clusterName && c.id) {
              const parts = c.id.split('/');
              clusterName = parts[parts.length - 1];
            }
            return {
              name: clusterName || 'unknown',
              region: c.location || c.region || 'unknown',
              version: c.kubernetesVersion || c.version || 'unknown',
              liveNodeCount: c.nodeCount || c.liveNodeCount || 0,
              account: acc.subscriptionId,
              accountName: acc.accountName,
              provider: 'azure',
              resourceGroup: c.resourceGroup || acc.resourceGroup
            };
          });
          liveClusters.push(...clusters);
        } catch (err) {
          console.warn(`⚠️ Skip Azure account: ${acc.accountName}`, err.message);
        }
      }

      const mergedClusters = dbClusters.map(db => {
        const live = liveClusters.find(live =>
          live.name === db.name &&
          live.account === db.account
        );
        return {
          ...db,
          status: live ? "running" : "not-found",
          liveNodeCount: live ? live.liveNodeCount : db.liveNodeCount,
          version: live ? live.version : db.version,
          region: live ? live.region : db.region,
          resourceGroup: live ? live.resourceGroup : db.resourceGroup
        };
      });

      setClusters(mergedClusters);
    } catch (error) {
      console.error("Azure clusters sync failed:", error);
      toast.error("Failed to sync Azure clusters");
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
        provider: 'azure',
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
      provider: 'azure',
    });
    setShowUpgradeModal(true);
  };
  // ✅ ADD THIS FUNCTION — handles actual deletion
const deleteCluster = async (clusterId) => {
  try {
    // 🔥 CORRECT ROUTE: matches your backend `/api/clusters/delete-cluster/:id`
    await api.delete(`/api/clusters/delete-cluster/${clusterId}`);
    toast.success("✅ Cluster removed successfully.");
    await fetchClusters(); // refresh list
  } catch (error) {
    console.error("Failed to delete cluster:", error);
    toast.error("⚠️ Failed to remove cluster.");
  }
};

  const handleConfigureCluster = (cluster) => {
    setClusterToConfigure(cluster);
    setShowConfigModal(true);
  };

  const handleAddClusterClick = () => setShowAddClusterPopup(true);
  const handleCloseAddClusterPopup = () => setShowAddClusterPopup(false);

  const filteredClusters = clusters.filter(cluster => {
    const name = (cluster.name || "").toLowerCase();
    return (
      name.includes(searchTerm.toLowerCase()) &&
      (statusFilter === "all" || cluster.status === statusFilter) &&
      (regionFilter === "all" || cluster.region === regionFilter)
    );
  });

  const regionOptions = [
    { value: "eastus", label: "East US" },
    { value: "westeurope", label: "West Europe" },
    { value: "southeastasia", label: "Southeast Asia" },
    { value: "centralus", label: "Central US" },
    { value: "uksouth", label: "UK South" },
  ];

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <div className="min-h-screen p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <ConfirmRemoveClusterModal
            isOpen={showRemoveModal}
            onClose={() => {
              setShowRemoveModal(false);
              setClusterToRemove(null);
            }}
            onConfirm={() => {
              if (clusterToRemove?._id) {
                deleteCluster(clusterToRemove._id);
              }
            }}
            clusterName={clusterToRemove?.name || ''}
          />
          {view === "create" ? (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    Create AKS Cluster
                  </span>
                </h1>
                <button
                  onClick={handleBackToClusters}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 font-semibold px-4 py-2.5 rounded-md hover:from-orange-600 hover:to-orange-700 shadow transition flex items-center gap-2 text-sm"
                >
                  <ArrowLeftCircle size={16} /> Back
                </button>
              </div>
              <CreateAzureClusterForm onBack={handleBackToClusters} />
            </div>
          ) : view === "add-existing" ? (
            <AddExistingAzureFlow onBack={handleBackToClusters} onClusterAdded={fetchClusters} />
          ) : (
            <>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      Azure Cloud Clusters
                    </span>
                  </h1>
                  <p className="text-gray-300">Manage your AKS clusters</p>
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

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#38bdf8] mb-4"></div>
                  <p className="text-gray-300">Loading Azure clusters...</p>
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
                    <div className="col-span-full text-center py-12 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl">
                      <XCircle size={48} className="mx-auto mb-4 text-gray-500" />
                      <h3 className="text-xl font-semibold text-gray-300">No Azure clusters found</h3>
                      <p className="text-gray-400 text-sm">Try adding an existing AKS cluster.</p>
                    </div>
                  )}
                </div>
              )}

              {showAddClusterPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-lg font-bold text-white">Add or Create Azure Cluster</h2>
                      <button onClick={handleCloseAddClusterPopup} className="text-gray-400 hover:text-red-400 p-1.5 rounded">
                        <X size={20} />
                      </button>
                    </div>
                    <p className="text-gray-300 mb-5 text-sm">Select how you’d like to proceed:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={handleAddExistingClusterClick}
                        className="bg-gray-700 border border-green-600/40 rounded-lg p-4 text-center cursor-pointer hover:shadow-lg transition hover:scale-103"
                      >
                        <Plus className="text-green-400 mx-auto mb-2" size={28} />
                        <p className="text-white text-sm font-medium">Add Existing</p>
                      </div>
                      <div
                        onClick={handleCreateClusterClick}
                        className="bg-gray-700 border border-orange-500/40 rounded-lg p-4 text-center cursor-pointer hover:shadow-lg transition hover:scale-103"
                      >
                        <Cloud className="text-[#38bdf8] mx-auto mb-2" size={28} />
                        <p className="text-white text-sm font-medium">Create New</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

// ✅ NEW: Dedicated component for "Add Existing" flow — MATCHES AWS UI
const AddExistingAzureFlow = ({ onBack, onClusterAdded }) => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [addedClusters, setAddedClusters] = useState(new Set());
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load accounts
  useEffect(() => {
    const loadAccounts = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/api/azure/accounts');
        setAccounts(data.filter(a => a.cloudProvider === 'Azure'));
        if (data.length === 1) setSelectedAccount(data[0]);
      } catch (err) {
        setError('Failed to load Azure accounts.');
      } finally {
        setLoading(false);
      }
    };
    loadAccounts();
  }, []);

  // Fetch added clusters
  const fetchAddedClusters = async () => {
    if (!selectedAccount?.subscriptionId) return;
    try {
      const res = await api.get('/api/clusters/get-clusters', {
        params: { azureSubscriptionId: selectedAccount.subscriptionId }
      });
      const names = new Set(res.data.map(c => c.name.trim()));
      setAddedClusters(names);
    } catch {
      setAddedClusters(new Set());
    }
  };
 
  // Fetch live AKS clusters
  const fetchClusters = async () => {
    if (!selectedAccount?._id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/azure/aks-clusters?accountId=${selectedAccount._id}`);
      const liveClusters = (response.data || []).map(c => ({
        ...c,
        provider: 'azure',
        account: selectedAccount.subscriptionId,
        accountName: selectedAccount.accountName,
      }));
      setClusters(liveClusters);
      await fetchAddedClusters();
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch AKS clusters:', err);
      setError('Failed to fetch clusters from Azure.');
      setClusters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) fetchClusters();
  }, [selectedAccount]);

  const handleAdd = async () => {
    if (!selectedCluster || !selectedAccount) return setError('Select account and cluster.');
    const name = selectedCluster.name.trim();
    const subId = selectedAccount.subscriptionId?.trim();
    if (!subId) return setError('Subscription ID missing.');

    const payload = {
      name,
      provider: 'azure',
      account: subId,
      subscriptionId: subId,
      resourceGroup: selectedCluster.resourceGroup || '',
      location: selectedCluster.location || selectedAccount.azureRegion || 'eastus',
      kubeContext: name,
      outputFormat: 'json'
    };

    setIsAdding(true);
    setError(null);
    try {
      await api.post('/api/clusters/save-data', payload);
      setAddedClusters(prev => new Set([...prev, name]));
      setSuccess(`✅ Cluster "${name}" added!`);
      setSelectedCluster(null);
      onClusterAdded();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add cluster.');
    } finally {
      setIsAdding(false);
    }
  };

  const isClusterAdded = (name) => addedClusters.has(name);

  const getAccountName = (acc) => acc.accountName || acc.subscriptionId || 'Unknown';
  const getAccountRegion = (acc) => acc.azureRegion || 'Not set';

  const getStatusClass = (status) => {
    const s = status?.toUpperCase() || 'UNKNOWN';
    if (s.includes('RUNNING') || s.includes('SUCCEEDED')) return 'bg-green-900 text-green-300';
    if (s.includes('PROVISIONING') || s.includes('CREATING')) return 'bg-blue-900 text-blue-300';
    if (s.includes('STOPPING') || s.includes('DELETING')) return 'bg-yellow-900 text-yellow-300';
    return 'bg-red-900 text-red-300';
  };

  const getVersionField = (cluster) => cluster.kubernetesVersion || cluster.version;
  const getNodeCountField = (cluster) => cluster.nodeCount || cluster.liveNodeCount || 0;

  const filteredAccounts = accounts.filter(acc =>
    acc.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.subscriptionId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const favorites = filteredAccounts.filter(acc => acc.isFavorite);
  const allAccounts = filteredAccounts.filter(acc => !acc.isFavorite);

  return (
    <>
      {/* Global Styles */}
      <style>{`
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
            #38bdf8,
            #60a5fa,
            #7dd3fc,
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
          0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.2; }
          25% { transform: translate(10px, -15px) rotate(90deg); opacity: 0.5; }
          50% { transform: translate(20px, 10px) rotate(180deg); opacity: 0.3; }
          75% { transform: translate(-10px, 20px) rotate(270deg); opacity: 0.6; }
        }
        .card-glow {
          box-shadow: 0 4px 20px rgba(56, 189, 248, 0.08),
            0 0 15px rgba(56, 189, 248, 0.05);
          transition: box-shadow 0.3s ease;
        }
        .card-glow:hover {
          box-shadow: 0 6px 25px rgba(56, 189, 248, 0.12),
            0 0 20px rgba(56, 189, 248, 0.08);
        }
        .red-orange-gradient-text {
          background: linear-gradient(to right, #f87171, #fb923c);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .text-peacock-400 { color: #38bdf8; }
        .text-peacock-500 { color: #60a5fa; }
        .text-peacock-300 { color: #7dd3fc; }
        .text-gray-300 { color: #d1d5db; }
      `}</style>

      <div className="dashboard-root">
        <div className="grid-overlay" />
        <div className="animated-gradient" />

        {/* Floating Particles */}
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
              animationDelay: p.delay,
            }}
          />
        ))}

        {/* Main Content Area */}
        <div className="min-h-screen p-4 sm:p-6 md:p-8">
          <div className="max-full mx-auto">

            {/* Back Button */}
            <div className="mb-6">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
              >
                <ArrowLeftCircle size={16} /> Back to Clusters
              </button>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Cloud size={24} className="text-peacock-400" />
                <h1 className="text-xl font-bold red-orange-gradient-text">Azure AKS Cluster Manager</h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Multi-subscription cluster management</span>
                {lastUpdated && (
                  <>
                    <span>•</span>
                    <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
                    <button
                      onClick={fetchClusters}
                      disabled={loading || !selectedAccount}
                      className="p-1 hover:text-peacock-400"
                    >
                      <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

              {/* Left Sidebar (Accounts) */}
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 border border-gray-700 card-glow">
                <div className="flex items-center gap-2 mb-4">
                  <Server size={18} className="text-peacock-400" />
                  <h2 className="font-semibold red-orange-gradient-text">Subscriptions</h2>
                </div>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search subscriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2.5 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm"
                  />
                </div>

                {/* FAVORITES */}
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-gray-500 mb-2">FAVORITES</h3>
                  {favorites.length > 0 ? (
                    favorites.map((acc) => (
                      <div
                        key={acc._id}
                        className={`p-3 rounded-lg cursor-pointer mb-2 flex items-center justify-between ${
                          selectedAccount?._id === acc._id
                            ? 'bg-blue-500/15 border border-blue-500'
                            : 'bg-gray-800/50 hover:bg-gray-700/50'
                        }`}
                      >
                        <div
                          className="flex items-center gap-2 flex-1"
                          onClick={() => setSelectedAccount(acc)}
                        >
                          <div className="flex items-center gap-1">
                            <User size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-200">{getAccountName(acc)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin size={12} />
                            {getAccountRegion(acc)}
                          </div>
                        </div>
                        <Star
                          size={14}
                          className={`cursor-pointer ${
                            acc.isFavorite
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-500 hover:text-yellow-400'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(acc._id);
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-gray-800/50 rounded-lg text-gray-400 text-sm">
                      No favorites yet.
                    </div>
                  )}
                </div>

                {/* ALL ACCOUNTS */}
                <div>
                  <h3 className="text-xs font-medium text-gray-500 mb-2">ALL SUBSCRIPTIONS</h3>
                  {allAccounts.length > 0 ? (
                    allAccounts.map((acc) => (
                      <div
                        key={acc._id}
                        className={`p-3 rounded-lg cursor-pointer mb-2 flex items-center justify-between ${
                          selectedAccount?._id === acc._id
                            ? 'bg-blue-500/15 border border-blue-500'
                            : 'bg-gray-800/50 hover:bg-gray-700/50'
                        }`}
                      >
                        <div
                          className="flex items-center gap-2 flex-1"
                          onClick={() => setSelectedAccount(acc)}
                        >
                          <div className="flex items-center gap-1">
                            <User size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-200">{getAccountName(acc)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin size={12} />
                            {getAccountRegion(acc)}
                          </div>
                        </div>
                        <Star
                          size={14}
                          className={`cursor-pointer ${
                            acc.isFavorite
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-500 hover:text-yellow-400'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(acc._id);
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-gray-800/50 rounded-lg text-gray-400 text-sm">
                      No subscriptions found.
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3 space-y-6">

                {selectedAccount && (
                  <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-700 card-glow">
                    <div className="flex items-center gap-2 mb-4">
                      <User size={18} className="text-peacock-400" />
                      <h2 className="font-semibold red-orange-gradient-text">Subscription Summary</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Subscription Name</p>
                        <p className="text-white font-mono">{selectedAccount.accountName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Subscription ID</p>
                        <p className="text-white font-mono">{selectedAccount.subscriptionId || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Region</p>
                        <p className="text-white font-mono">{selectedAccount.azureRegion || 'eastus'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Discover Clusters */}
                <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-700 card-glow">
                  <h2 className="text-lg font-semibold red-orange-gradient-text mb-4">Discover Clusters</h2>
                  {loading ? (
                    <div className="flex justify-center items-center p-8 text-gray-300">
                      <Loader2 size={20} className="animate-spin mr-2 text-peacock-400" />
                      Loading clusters...
                    </div>
                  ) : clusters.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No AKS clusters found.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clusters.map((cluster) => (
                        <div
                          key={cluster.name}
                          className={`p-4 rounded-lg border ${
                            selectedCluster?.name === cluster.name
                              ? 'border-peacock-500 bg-peacock-500/10'
                              : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Cloud size={16} className="text-peacock-400" />
                              <h3 className="text-base font-medium text-white">{cluster.name}</h3>
                              <span className="px-2 py-0.5 bg-gray-800 rounded-full text-xs text-gray-300">
                                Available
                              </span>
                            </div>
                            <input
                              type="radio"
                              checked={selectedCluster?.name === cluster.name}
                              onChange={() => !isClusterAdded(cluster.name) && setSelectedCluster(cluster)}
                              disabled={isClusterAdded(cluster.name)}
                              className="h-4 w-4 text-peacock-500 focus:ring-peacock-500"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Status</p>
                              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClass(cluster.provisioningState || cluster.status)}`}>
                                {(cluster.provisioningState || cluster.status || 'UNKNOWN').toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-gray-500">Version</p>
                              <p className="text-white">v{getVersionField(cluster)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Nodes</p>
                              <p className="text-white">{getNodeCountField(cluster)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Region</p>
                              <p className="text-white">{cluster.location || cluster.region || '—'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Added Clusters */}
                <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-700 card-glow">
                  <h2 className="text-lg font-semibold red-orange-gradient-text mb-4">Added Clusters ({addedClusters.size})</h2>
                  {addedClusters.size === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No clusters added yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[...addedClusters].map(name => (
                        <div
                          key={name}
                          className="p-4 rounded-lg border border-gray-700 bg-gray-800/50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Cloud size={16} className="text-peacock-400" />
                              <h3 className="text-base font-medium text-white">{name}</h3>
                              <span className="px-2 py-0.5 bg-green-900/50 text-green-300 rounded-full text-xs">
                                Added
                              </span>
                            </div>
                            <CheckCircle2 size={16} className="text-green-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Button */}
                {selectedCluster && !isClusterAdded(selectedCluster.name) && (
                  <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 border border-gray-700 card-glow">
                    <button
                      onClick={handleAdd}
                      disabled={isAdding}
                      className={`w-full py-3 px-4 font-semibold rounded-lg text-white ${
                        isAdding
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-peacock-500 to-peacock-400 hover:from-peacock-400 hover:to-peacock-300 shadow-md transition-all'
                      }`}
                    >
                      {isAdding ? (
                        <>
                          <Loader2 size={16} className="inline animate-spin mr-2" />
                          Adding Cluster...
                        </>
                      ) : (
                        '+ Add Cluster'
                      )}
                    </button>
                  </div>
                )}

                {/* Messages */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-900/20 border-l-4 border-red-500 rounded-lg text-red-300">
                    <AlertCircle size={16} />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 p-3 bg-green-900/20 border-l-4 border-green-500 rounded-lg text-green-300">
                    <CheckCircle2 size={16} />
                    <span className="text-sm">{success}</span>
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default AzureClustersPage;
