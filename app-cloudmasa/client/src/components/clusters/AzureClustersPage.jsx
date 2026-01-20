// src/components/clusters/AzureClustersPage.jsx
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
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate(); // ✅ Added useNavigate

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

  // ✅ FIXED: Redirect to standalone route
  const handleAddExistingClusterClick = () => {
    setShowAddClusterPopup(false);
    navigate('/sidebar/clusters/create/azure'); // 👈 Full-screen standalone page
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

          {/* Only two views: "list" and "create" */}
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
          ) : (
            // Default view: "list"
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

              {/* Add Cluster Popup */}
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

export default AzureClustersPage;

