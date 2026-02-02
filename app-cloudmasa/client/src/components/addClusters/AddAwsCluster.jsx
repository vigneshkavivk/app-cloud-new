// src/components/addClusters/AddAwsCluster.jsx
import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  User,
  MapPin,
  Cloud,
  Server,
  Star,
  XCircle,
  ArrowLeftCircle,
} from 'lucide-react';
import api from '../../interceptor/api.interceptor';
import { useNavigate } from 'react-router-dom';

export default function AddAwsCluster({ onClusterAdded = () => {} }) {
  const navigate = useNavigate();

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

  // Fetch AWS accounts
  useEffect(() => {
    const loadAccounts = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/api/aws/get-aws-accounts');
        const awsAccounts = data.filter(a => a.cloudProvider === 'AWS');
        setAccounts(awsAccounts);
        if (awsAccounts.length === 1) setSelectedAccount(awsAccounts[0]);
      } catch (err) {
        setError('Failed to load AWS accounts.');
      } finally {
        setLoading(false);
      }
    };
    loadAccounts();
  }, []);

  // Fetch added clusters (from DB)
  const fetchAddedClusters = async () => {
    if (!selectedAccount?.accountId) return;
    try {
      const res = await api.get('/api/clusters/get-clusters', {
        params: { awsAccountId: selectedAccount.accountId }
      });
      const names = new Set(res.data.map(c => c.name.trim()));
      setAddedClusters(names);
    } catch {
      setAddedClusters(new Set());
    }
  };

  // Fetch live EKS clusters
  const fetchClusters = async () => {
    if (!selectedAccount?._id) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/api/aws/eks-clusters', { accountId: selectedAccount._id });
      setClusters(data.map(c => ({ ...c, provider: 'aws' })));
      setLastUpdated(new Date());
      await fetchAddedClusters();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch EKS clusters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) fetchClusters();
  }, [selectedAccount]);

  const handleAdd = async () => {
    if (!selectedCluster || !selectedAccount)
      return setError('Select account and cluster.');
    const name = selectedCluster.name.trim();
    if (!name) return setError('Invalid cluster name.');
    const accountId = selectedAccount.accountId?.trim();
    if (!/^\d{12}$/.test(accountId))
      return setError('Invalid AWS Account ID.');

    const payload = {
      name,
      provider: 'aws',
      account: accountId,
      accountId,
      region: selectedCluster.region || selectedAccount.awsRegion || 'us-east-1',
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

  const toggleFavorite = async (accountId) => {
  const account = accounts.find(acc => acc._id === accountId);
  if (!account) return;

  const newFavoriteStatus = !account.isFavorite;

  try {
    // ✅ Call backend to update favorite status
    await api.post(`/api/aws/update-account/${accountId}`, {
      isFavorite: newFavoriteStatus
    });

    // ✅ Update local state only after success
    const updatedAccounts = accounts.map(acc =>
      acc._id === accountId ? { ...acc, isFavorite: newFavoriteStatus } : acc
    );
    setAccounts(updatedAccounts);
  } catch (err) {
    console.error('Failed to update favorite:', err);
    setError('Failed to update favorite. Please try again.');
  }
};

  const getAccountName = (acc) => acc.accountName || acc.accountId || 'Unknown';
  const getAccountRegion = (acc) => acc.awsRegion || 'Not set';
  const isClusterAdded = (name) => addedClusters.has(name);

  const getStatusClass = (status) => {
    const s = status?.toUpperCase() || 'UNKNOWN';
    if (s.includes('RUNNING')) return 'bg-green-900 text-green-300';
    if (s.includes('PROVISIONING')) return 'bg-blue-900 text-blue-300';
    if (s.includes('STOPPING') || s.includes('DELETING')) return 'bg-yellow-900 text-yellow-300';
    return 'bg-red-900 text-red-300';
  };

  const getVersionField = (cluster) => cluster.version;
  const getNodeCountField = (cluster) => cluster.liveNodeCount || 0;

  const filteredAccounts = accounts.filter(acc =>
    acc.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.accountId?.toLowerCase().includes(searchTerm.toLowerCase())
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

        {/* Main Content Area (Right Side) */}
        <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:ml-64">
          <div className="max-w-7xl mx-auto" style={{ width: '1603px', maxWidth: '100%' }}>

            {/* Back Button */}
            <div className="mb-6">
              <button
                onClick={() => navigate('/sidebar/clusters')}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
              >
                <ArrowLeftCircle size={16} />
                Back to Clusters
              </button>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Cloud size={24} className="text-peacock-400" />
                <h1 className="text-xl font-bold red-orange-gradient-text">AWS EKS Cluster Manager</h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Multi-account cluster management</span>
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
                  <h2 className="font-semibold red-orange-gradient-text">Accounts</h2>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search accounts..."
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
                  <h3 className="text-xs font-medium text-gray-500 mb-2">ALL ACCOUNTS</h3>
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
                      No accounts found.
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
                      <h2 className="font-semibold red-orange-gradient-text">Account Summary</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Account Name</p>
                        <p className="text-white font-mono">{selectedAccount.accountName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Account ID</p>
                        <p className="text-white font-mono">{selectedAccount.accountId || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Region</p>
                        <p className="text-white font-mono">{selectedAccount.awsRegion || 'us-east-1'}</p>
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
                      No EKS clusters found.
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
                              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClass(cluster.status)}`}>
                                {cluster.status?.toUpperCase() || 'UNKNOWN'}
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
                              <p className="text-white">{cluster.region || 'us-east-1'}</p>
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
}
