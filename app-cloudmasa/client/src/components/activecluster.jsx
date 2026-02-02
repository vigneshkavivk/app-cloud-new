// src/components/activecluster.jsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  Layers,
  Database,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../interceptor/api.interceptor";
import { useAuth } from "../hooks/useAuth";

const ActiveClusterPage = () => {
  const { hasPermission } = useAuth();
  const canViewClusters = hasPermission("Overall", "Read");

  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getProviderFromUrl = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const p = params.get('provider');
    return ['aws', 'azure', 'gcp'].includes(p) ? p : null;
  };

  const [selectedProvider, setSelectedProvider] = useState(() => getProviderFromUrl());
  const [expandedCluster, setExpandedCluster] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [expandedLoading, setExpandedLoading] = useState({});

  const fetchClusters = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        awsClustersRes,
        azureClustersRes,
        gcpClustersRes,
      ] = await Promise.all([
        api.get("/api/aws/eks-clusters").catch(() => ({ data: [] })),
        (async () => {
          try {
            const accountsRes = await api.get('/api/azure/accounts');
            const accounts = accountsRes.data || [];
            let allClusters = [];
            for (const acc of accounts) {
              try {
                const aksRes = await api.get(`/api/azure/aks-clusters?accountId=${acc._id}`);
                const clusters = (aksRes.data || []).map(c => ({
                  name: c.name || 'unknown',
                  region: c.region || c.location || 'unknown',
                  version: c.version || c.kubernetesVersion || 'unknown',
                  liveNodeCount: c.liveNodeCount || c.nodeCount || 0,
                  account: acc.subscriptionId,
                  accountName: acc.accountName,
                  provider: 'azure',
                  addedToAppAt: c.addedToAppAt,
                  status: c.status || 'unknown',
                  accountId: acc._id,
                }));
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
      ]);

      const awsWithProvider = (Array.isArray(awsClustersRes.data) ? awsClustersRes.data : []).map(c => ({ ...c, provider: 'aws' }));
      const azureWithProvider = (Array.isArray(azureClustersRes.data) ? azureClustersRes.data : []).map(c => ({ ...c, provider: 'azure' }));
      const gcpWithProvider = (Array.isArray(gcpClustersRes.data) ? gcpClustersRes.data : []).map(c => ({ ...c, provider: 'gcp' }));

      setClusters([...awsWithProvider, ...azureWithProvider, ...gcpWithProvider]);
    } catch (err) {
      console.error("Failed to fetch clusters:", err);
      setError("Failed to load cluster data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  if (!canViewClusters) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0b14] to-[#06070f] text-white">
        <div className="text-center p-8 max-w-md">
          <CheckCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">🔒 Access Denied</h2>
          <p className="text-gray-300">
            You need <span className="font-mono">Overall.Read</span> permission to view clusters.
          </p>
        </div>
      </div>
    );
  }

  const toggleExpand = async (cluster) => {
    const key = `${cluster.provider}-${cluster.name}`;
    if (expandedCluster === key) {
      setExpandedCluster(null);
      return;
    }

    if (cluster.provider !== 'azure') {
      setExpandedCluster(key);
      return;
    }

    setExpandedCluster(key);
    setExpandedLoading(prev => ({ ...prev, [key]: true }));
    setExpandedDetails(prev => ({ ...prev, [key]: null }));

    try {
      const res = await api.get(`/api/azure/aks-cluster/${encodeURIComponent(cluster.name)}`);
      setExpandedDetails(prev => ({ ...prev, [key]: res.data }));
    } catch (err) {
      console.error("Failed to fetch cluster details:", err);
      setExpandedDetails(prev => ({ ...prev, [key]: { error: "Failed to load live data from Azure." } }));
    } finally {
      setExpandedLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getAccountName = (accountId, provider) => {
    if (!accountId) return 'N/A';
    const prefix = provider === 'aws' ? 'AWS' : provider === 'azure' ? 'Azure' : 'GCP';
    return `${prefix} Account (${accountId.slice(-6)})`;
  };

  const getProviderInfo = (provider) => {
    switch (provider) {
      case 'aws': return { icon: <Server size={16} className="text-orange-400" />, label: 'EKS' };
      case 'azure': return { icon: <Server size={16} className="text-blue-400" />, label: 'AKS' };
      case 'gcp': return { icon: <Server size={16} className="text-green-400" />, label: 'GKE' };
      default: return { icon: <Server size={16} className="text-gray-400" />, label: 'Unknown' };
    }
  };

  const getStatusClass = (status) => {
    const s = (status || 'unknown').toLowerCase();
    if (s === 'running') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    if (s === 'stopped') return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
    if (s === 'degraded') return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
    return 'bg-gray-500/20 text-gray-300';
  };

  const getStatusText = (status) => {
    const s = (status || 'unknown').toLowerCase();
    if (s === 'running') return 'Running';
    if (s === 'stopped') return 'Stopped';
    if (s === 'degraded') return 'Degraded';
    return 'Unknown';
  };

  const filteredClusters = clusters.filter(cluster => {
    if (!selectedProvider) return true;
    return cluster.provider === selectedProvider;
  });

  return (
    <>
      <style>{`
        .clusters-root {
          min-height: 100vh;
          background:
            radial-gradient(circle at 10% 20%, rgba(30, 58, 138, 0.08) 0%, transparent 30%),
            radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.05) 0%, transparent 40%),
            linear-gradient(125deg, #0a0d1a 0%, #0b0e1c 35%, #0c1020 65%, #0d1124 100%);
          color: #e5e7eb;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
          position: relative;
        }
        .grid-overlay, .animated-gradient { display: none; }
      `}</style>

      <div className="clusters-root">
        <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            <header className="mb-8 flex items-center gap-4">
              <button 
                onClick={() => window.history.back()} 
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
                aria-label="Back to Dashboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div>
                <h1 className="text-3xl font-bold text-white">
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-extrabold">
                    {selectedProvider 
                      ? `${selectedProvider.toUpperCase()} ACTIVE CLUSTERS` 
                      : 'ACTIVE CLUSTERS'}
                  </span>
                </h1>
                <p className="text-gray-400 mt-2">
                  {selectedProvider 
                    ? `View and manage your ${selectedProvider.toUpperCase()} Kubernetes clusters.`
                    : 'View and manage your Kubernetes clusters across all cloud providers.'}
                </p>
              </div>
            </header>

            {error && <p className="text-red-400 mb-4">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="bg-[#0f172a] rounded-xl p-5 animate-pulse border border-white/5">
                    <div className="h-6 bg-white/10 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
                    <div className="h-4 bg-white/10 rounded w-2/3 mb-4"></div>
                    <div className="h-8 bg-white/10 rounded w-1/4 ml-auto"></div>
                  </div>
                ))
              ) : filteredClusters.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-400">
                  <Server size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">
                    {selectedProvider 
                      ? `No active ${selectedProvider.toUpperCase()} clusters found.` 
                      : 'No active clusters found.'}
                  </p>
                </div>
              ) : (
                filteredClusters.map((cluster) => {
                  const name = cluster.name || cluster.clusterName || "Unnamed Cluster";
                  const region = cluster.region || "N/A";
                  const nodes = cluster.liveNodeCount ?? cluster.nodeCount ?? "N/A";
                  const version = cluster.version || "N/A";
                  const accountName = getAccountName(cluster.account, cluster.provider || 'unknown');
                  const statusClass = getStatusClass(cluster.status);
                  const statusText = getStatusText(cluster.status);
                  const { icon, label } = getProviderInfo(cluster.provider || 'unknown');

                  const key = `${cluster.provider}-${name}`;
                  const isExpanded = expandedCluster === key;
                  const details = expandedDetails[key];
                  const isLoading = expandedLoading[key];

                  return (
                    <div
                      key={cluster._id || `${cluster.account}-${name}`}
                      className="bg-[#0f172a] rounded-xl p-5 border border-white/5 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            {icon}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-lg">{name}</h3>
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-black/30 text-gray-300">
                              {label}
                            </span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                          {statusText}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mb-4">
                        <div className="flex items-center gap-2">
                          <Info size={14} className="opacity-70" />
                          <span>Region: <span className="font-mono text-cyan-300">{region}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Server size={14} className="opacity-70" />
                          <span>Nodes: <span className="font-mono text-white">{nodes}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="opacity-70" />
                          <span>Version: <span className="font-mono text-cyan-300">{version}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Info size={14} className="opacity-70" />
                          <span>Account: <span className="font-mono text-orange-300">{accountName}</span></span>
                        </div>
                      </div>

                      {/* View More Details Button — only for Azure */}
                      {cluster.provider === 'azure' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(cluster);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
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

                      {/* Expanded Details Section — Exact Screenshot Match */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-white/10 animate-fadeIn">
                          {isLoading ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-cyan-500 mx-auto"></div>
                              <p className="mt-2 text-gray-300 text-sm">Loading live data from Azure...</p>
                            </div>
                          ) : details?.error ? (
                            <div className="text-center py-4 text-red-400 text-sm">
                              <AlertTriangle className="h-5 w-5 mx-auto mb-1" />
                              <p>{details.error}</p>
                            </div>
                          ) : details ? (
                            <>
                              {/* Cluster Overview */}
                              <div className="mb-4">
                                <h4 className="font-medium text-white text-sm mb-2 flex items-center gap-1.5">
                                  <Server size={16} className="text-blue-400" /> Cluster Overview
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-xs text-gray-300">
                                  <div><span className="text-gray-400">Status:</span> <span className={`font-mono ${details.status === 'running' ? 'text-emerald-300' : 'text-yellow-300'}`}>{details.status}</span></div>
                                  <div><span className="text-gray-400">Version:</span> <span className="font-mono text-cyan-300">{details.kubernetesVersion}</span></div>
                                  <div><span className="text-gray-400">Region:</span> <span className="font-mono text-cyan-300">{details.region}</span></div>
                                  <div><span className="text-gray-400">Zones:</span> <span className="font-mono text-white">{details.availabilityZones}</span></div>
                                  <div><span className="text-gray-400">Added:</span> <span className="font-mono text-white">{details.addedToAppAt}</span></div>
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="border-t border-white/10 my-4"></div>

                              {/* Account & Compute */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div className="bg-[#111b2a] rounded-lg p-3">
                                  <h4 className="font-medium text-white text-sm mb-2 flex items-center gap-1.5">
                                    <Info size={16} className="text-purple-400" /> Account
                                  </h4>
                                  <div className="text-xs text-gray-300 space-y-1">
                                    <div><span className="text-gray-400">Name:</span> <span className="font-mono text-orange-300">{details.accountName}</span></div>
                                    <div><span className="text-gray-400">Sub ID:</span> <span className="font-mono text-white">{details.subscriptionId}</span></div>
                                    <div><span className="text-gray-400">RG:</span> <span className="font-mono text-white">{details.resourceGroup}</span></div>
                                  </div>
                                </div>

                                <div className="bg-[#111b2a] rounded-lg p-3">
                                  <h4 className="font-medium text-white text-sm mb-2 flex items-center gap-1.5">
                                    <Layers size={16} className="text-purple-400" /> Compute
                                  </h4>
                                  <div className="text-xs text-gray-300 space-y-1">
                                    <div><span className="text-gray-400">Type:</span> <span className="font-mono text-white">{details.instanceType}</span></div>
                                    <div><span className="text-gray-400">Nodes:</span> <span className="font-mono text-white">{details.totalNodes}</span></div>
                                  </div>
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="border-t border-white/10 my-4"></div>

                              {/* Capacity */}
                              <div className="space-y-3">
                                <h4 className="font-medium text-white text-sm flex items-center gap-1.5">
                                  <Database size={16} className="text-teal-400" /> Capacity
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
                            <div className="text-center py-4 text-gray-400 text-sm">
                              No additional details available.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ActiveClusterPage;
