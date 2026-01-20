// src/components/addClusters/AddAzureCluster.jsx
import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  User,
  MapPin,
  Cloud,
  Server,
  Star,
  ArrowLeftCircle,
} from 'lucide-react';
import api from '../../interceptor/api.interceptor';
import { useNavigate } from 'react-router-dom';

export default function AddAzureCluster({ onClusterAdded = () => {} }) {
  const navigate = useNavigate();

  // ✅ REMOVED THE BAD REDIRECT USEEFFECT

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [addedClusters, setAddedClusters] = useState(new Set());
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load Azure accounts
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/api/azure/accounts');
        const azure = data.filter(a => a.cloudProvider === 'Azure');
        setAccounts(azure);
        if (azure.length === 1) setSelectedAccount(azure[0]);
      } catch (err) {
        setError('Failed to load Azure accounts.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  const fetchClusters = async () => {
    if (!selectedAccount?._id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/api/azure/aks-clusters?accountId=${selectedAccount._id}`);
      setClusters((res.data || []).map(c => ({ ...c, provider: 'azure' })));
      await fetchAddedClusters();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch AKS clusters.');
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

  const toggleFavorite = async (id) => {
    const acc = accounts.find(a => a._id === id);
    if (!acc) return;
    try {
      await api.post(`/api/azure/update-account/${id}`, { isFavorite: !acc.isFavorite });
      setAccounts(accounts.map(a => a._id === id ? { ...a, isFavorite: !a.isFavorite } : a));
    } catch (err) {
      setError('Failed to update favorite.');
    }
  };

  const getAccountName = (a) => a.accountName || a.subscriptionId || 'Unknown';
  const getAccountRegion = (a) => a.azureRegion || 'Not set';
  const isClusterAdded = (name) => addedClusters.has(name);
  const getStatusClass = (s) => {
    const status = (s || 'UNKNOWN').toUpperCase();
    if (status.includes('RUNNING') || status.includes('SUCCEEDED')) return 'bg-green-900 text-green-300';
    if (status.includes('PROVISIONING') || status.includes('CREATING')) return 'bg-blue-900 text-blue-300';
    if (status.includes('STOPPING') || status.includes('DELETING')) return 'bg-yellow-900 text-yellow-300';
    return 'bg-red-900 text-red-300';
  };
  const getVersion = (c) => c.kubernetesVersion || c.version;
  const getNodeCount = (c) => c.nodeCount || c.liveNodeCount || 0;

  const filtered = accounts.filter(a =>
    a.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.subscriptionId?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const favorites = filtered.filter(a => a.isFavorite);
  const others = filtered.filter(a => !a.isFavorite);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .dashboard-root { 
          min-height: 100vh; 
          background: linear-gradient(125deg, #0a0d1a 0%, #0d1124 100%); 
          color: #e5e7eb; 
          font-family: 'Inter', sans-serif; 
        }
        .card-glow { 
          box-shadow: 0 4px 20px rgba(56, 189, 248, 0.08); 
        }
        .red-orange-gradient-text { 
          background: linear-gradient(to right, #f87171, #fb923c); 
          -webkit-background-clip: text; 
          -webkit-text-fill-color: transparent; 
          color: transparent; 
        }
        .text-peacock-400 { 
          color: #38bdf8; 
        }
      `}</style>

      {/* ✅ FIXED: Removed marginLeft hacks */}
      <div className="dashboard-root">
        <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:ml-64">
          <div className="w-full">
            <div className="mb-6">
              <button
                onClick={() => navigate('/sidebar/clusters')}
                className="w-half flex items-center px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
              >
                <ArrowLeftCircle size={16} /> Back to Clusters
              </button>
            </div>

            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <Cloud size={24} className="text-peacock-400 gap-4" />
                <h1 className="text-xl font-bold red-orange-gradient-text"> AKS Cluster Manager</h1>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar */}
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 border border-gray-700 card-glow">
                <div className="flex items-center mb-4">
                  <Server size={18} className="text-peacock-400" />
                  <h2 className="font-semibold red-orange-gradient-text">Subscriptions</h2>
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2.5 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm mb-4"
                />
                {favorites.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">FAVORITES</h3>
                    {favorites.map(acc => (
                      <AccountItem key={acc._id} acc={acc} selected={selectedAccount?._id === acc._id} onSelect={setSelectedAccount} onToggle={toggleFavorite} />
                    ))}
                  </div>
                )}
                <div>
                  <h3 className="text-xs font-medium text-gray-500 mb-2">ALL SUBSCRIPTIONS</h3>
                  {others.length > 0 ? others.map(acc => (
                    <AccountItem key={acc._id} acc={acc} selected={selectedAccount?._id === acc._id} onSelect={setSelectedAccount} onToggle={toggleFavorite} />
                  )) : <p className="text-gray-400 text-sm">No subscriptions</p>}
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3 space-y-6">
                {selectedAccount && (
                  <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-700 card-glow">
                    <h2 className="font-semibold red-orange-gradient-text mb-3">Subscription Summary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 text-sm">
                      <div><p className="text-gray-500">Name</p><p className="text-white">{getAccountName(selectedAccount)}</p></div>
                      <div><p className="text-gray-500">ID</p><p className="text-white">{selectedAccount.subscriptionId}</p></div>
                      <div><p className="text-gray-500">Region</p><p className="text-white">{getAccountRegion(selectedAccount)}</p></div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-700 card-glow">
                  <h2 className="text-lg font-semibold red-orange-gradient-text mb-4">Discover Clusters</h2>
                  {loading ? (
                    <div className="text-gray-300 flex items-center ">
                      <Loader2 className="animate-spin" size={16} />
                      Loading...
                    </div>
                  ) : clusters.length === 0 ? (
                    <p className="text-gray-400">No AKS clusters found.</p>
                  ) : (
                    <div className="space-y-3">
                      {clusters.map(c => (
                        <ClusterItem
                          key={c.name}
                          cluster={c}
                          selected={selectedCluster?.name === c.name}
                          added={isClusterAdded(c.name)}
                          onSelect={setSelectedCluster}
                          getStatusClass={getStatusClass}
                          getVersion={getVersion}
                          getNodeCount={getNodeCount}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-700 card-glow">
                  <h2 className="text-lg font-semibold red-orange-gradient-text mb-4">Added Clusters ({addedClusters.size})</h2>
                  {addedClusters.size === 0 ? (
                    <p className="text-gray-400">None added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...addedClusters].map(name => (
                        <div key={name} className="flex items-center text-white">
                          <Cloud size={14} className="text-peacock-400" />
                          <span>{name}</span>
                          <CheckCircle2 size={14} className="text-green-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCluster && !isClusterAdded(selectedCluster.name) && (
                  <button
                    onClick={handleAdd}
                    disabled={isAdding}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold"
                  >
                    {isAdding ? 'Adding...' : '+ Add Cluster'}
                  </button>
                )}

                {error && <div className="text-red-400 text-sm p-2 bg-red-900/20 rounded">{error}</div>}
                {success && <div className="text-green-400 text-sm p-2 bg-green-900/20 rounded">{success}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Account Item Component
const AccountItem = ({ acc, selected, onSelect, onToggle }) => (
  <div
    className={`p-3 rounded-lg cursor-pointer mb-2 flex items-center justify-between ${
      selected ? 'bg-blue-500/15 border border-blue-500' : 'bg-gray-800/50 hover:bg-gray-700/50'
    }`}
    onClick={() => onSelect(acc)}
  >
    <div className="flex items-center">
      <User size={14} className="text-gray-400" />
      <span className="text-sm text-white">{acc.accountName || acc.subscriptionId}</span>
    </div>
    <Star
      size={14}
      className={`${acc.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`}
      onClick={(e) => { e.stopPropagation(); onToggle(acc._id); }}
    />
  </div>
);

// Cluster Item Component
const ClusterItem = ({ cluster, selected, added, onSelect, getStatusClass, getVersion, getNodeCount }) => (
  <div className={`p-3 rounded-lg border ${selected ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-800/50'}`}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center">
        <Cloud size={14} className="text-peacock-400" />
        <span className="text-white font-medium">{cluster.name}</span>
      </div>
      <input
        type="radio"
        checked={selected}
        onChange={() => !added && onSelect(cluster)}
        disabled={added}
        className="h-4 w-4 text-blue-500"
      />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 text-xs text-gray-300">
      <div>
        <span>Status:</span>{' '}
        <span className={`px-1.5 py-0.5 rounded ${getStatusClass(cluster.status)}`}>
          {(cluster.status || 'UNKNOWN').toUpperCase()}
        </span>
      </div>
      <div>
        <span>Version:</span> <span>v{getVersion(cluster)}</span>
      </div>
      <div>
        <span>Nodes:</span> <span>{getNodeCount(cluster)}</span>
      </div>
      <div>
        <span>Region:</span> <span>{cluster.location || '—'}</span>
      </div>
    </div>
  </div>
);

