// src/components/CloudConnector.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Cloud, XCircle, Plus, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../interceptor/api.interceptor';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AWSForm from './AWSForm';
import GCPForm from './GCPForm';
import AzureForm from './AzureForm';
import { MdArrowOutward } from 'react-icons/md';

// 🪞 Glass Card (reusable) — now with local class for scoped glow
const GlassCard = ({ children, className = "" }) => (
  <div
    className={`relative backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cloud-card-glow ${className}`}
  >
    {children}
  </div>
);

// 🏷️ Section Heading
const SectionHeading = ({ children, className = "" }) => (
  <h2
    className={`text-white font-bold text-xl mb-6 uppercase tracking-wide ${className}`}
  >
    <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
      {children}
    </span>
  </h2>
);

// 🧾 AccountCard — Updated to match new glass style
const AccountCard = React.memo(({ account, onRemove, canDelete, onDetailsClick }) => {
  const provider = account.cloudProvider || 'Unknown';
  const region = account.region || account.awsRegion || 'N/A';
  const accountId = account.accountId || account.projectId || account.subscriptionId || 'N/A';

  const accountName = account.accountName || (
    provider === 'AWS' ? `AWS-${accountId.slice(-6)}` :
    provider === 'Azure' ? `Azure-${accountId.slice(-6)}` :
    provider === 'GCP' ? `GCP-${accountId.slice(-6)}` :
    accountId
  );

  // Provider-specific icon & color
  const getProviderIcon = () => {
    switch (provider) {
      case 'AWS': return <Cloud className="text-orange-400" size={20} />;
      case 'GCP': return <Cloud className="text-green-400" size={20} />;
      case 'Azure': return <Cloud className="text-blue-400" size={20} />;
      default: return <Cloud className="text-gray-400" size={20} />;
    }
  };

  return (
  <GlassCard className="flex flex-col h-full">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {getProviderIcon()}
        <h3 className="text-lg font-semibold">{provider} Cloud</h3>
      </div>
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
        Connected
      </span>
    </div>
    <div className="space-y-2 text-sm flex-1">
      <div className="flex justify-between py-1.5 px-3 bg-white/5 rounded">
        <span className="text-gray-400">Account:</span>
        <span className="text-white font-medium truncate max-w-[160px]">{accountName}</span>
      </div>
      <div className="flex justify-between py-1.5 px-3 bg-white/5 rounded">
        <span className="text-gray-400">Region:</span>
        <span className="text-gray-300">{region}</span>
      </div>

      {/* Azure-specific */}
      {provider === 'Azure' && (
        <>
          <div className="flex justify-between py-1.5 px-3 bg-white/5 rounded">
            <span className="text-gray-400">Sub ID:</span>
            <span className="text-gray-200 font-mono text-xs">...{account.subscriptionId.slice(-8)}</span>
          </div>
          <div className="flex justify-between py-1.5 px-3 bg-white/5 rounded">
            <span className="text-gray-400">Tenant ID:</span>
            <span className="text-gray-200 font-mono text-xs">...{account.tenantId.slice(-8)}</span>
          </div>
        </>
      )}

      {/* Generic ID for AWS/GCP */}
      {provider !== 'Azure' && (
        <div className="flex justify-between py-1.5 px-3 bg-white/5 rounded">
          <span className="text-gray-400">ID:</span>
          <span className="text-gray-200 font-mono">...{accountId.slice(-6)}</span>
        </div>
      )}

      {account.roleArn && provider === 'AWS' && (
        <div className="flex justify-between py-1.5 px-3 bg-white/5 rounded">
          <span className="text-gray-400">Role:</span>
          <span className="text-gray-200 text-xs truncate max-w-[140px] font-mono">
            ...{account.roleArn.split('/').pop()}
          </span>
        </div>
      )}
      {account.email && provider === 'GCP' && (
        <div className="flex justify-between py-1.5 px-3 bg-white/5 rounded">
          <span className="text-gray-400">SA Email:</span>
          <span className="text-gray-200 text-xs truncate max-w-[140px]">
            {account.email}
          </span>
        </div>
      )}
    </div>

    {/* 👇 DETAILS BUTTON ADDED HERE */}
    <div className="mt-auto pt-3 flex justify-between">
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(account);
          }}
          className="p-2 text-red-400 hover:text-red-300 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 rounded-md transition-all duration-200"
          title="Remove Account"
          aria-label="Remove Account"
        >
          <XCircle size={16} />
        </button>
      )}

      {/* ✅ Details Button */}
      <button
        onClick={() => onDetailsClick(account)}
        className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm font-medium px-3 py-1.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 transition-all duration-200"
        title={`View details for ${accountName}`}
        aria-label={`View details for ${accountName}`}
      >
        <MdArrowOutward size={14} />
        Details
      </button>
    </div>
  </GlassCard>
);
});

const CloudConnector = () => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('Credentials', 'Create');
  const canView = hasPermission('Credentials', 'View');
  const canDelete = hasPermission('Credentials', 'Delete');

  const providers = [
  {
    id: 'AWS',
    label: 'Amazon Web Services',
    color: 'from-amber-800 via-amber-700 to-yellow-900',
    iconBg: 'bg-gradient-to-br from-amber-900/30 to-amber-800/20',
  },
  {
    id: 'GCP',
    label: 'Google Cloud Platform',    
    color: 'from-emerald-800 via-teal-800 to-cyan-900',
    iconBg: 'bg-gradient-to-br from-emerald-900/30 to-teal-900/20',
  },
  {
    id: 'Azure',
    label: 'Microsoft Azure',    
    color: 'from-[#003B6D] via-[#002D5A] to-[#001F40]',
    iconBg: 'bg-gradient-to-br from-[#003B6D]/30 to-[#001F40]/20',
  },
];

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('All');

  const fetchConnectedAccounts = useCallback(async () => {
    if (!canView) return;
    try {
      const [awsRes, gcpRes, azureRes] = await Promise.all([
        api.get('/api/aws/get-aws-accounts').catch(() => ({ data: [] })),
        api.get('/api/gcp/accounts').catch(() => ({ data: [] })),
        api.get('/api/azure/accounts').catch(() => ({ data: [] })),
      ]);

      const awsAccounts = Array.isArray(awsRes.data)
        ? awsRes.data.map(acc => ({ ...acc, cloudProvider: 'AWS', region: acc.awsRegion || 'N/A' }))
        : [];

      const gcpAccounts = Array.isArray(gcpRes.data)
        ? gcpRes.data.map(acc => ({ ...acc, cloudProvider: 'GCP', region: acc.region || 'global' }))
        : [];

      const azureAccounts = Array.isArray(azureRes.data)
        ? azureRes.data.map(acc => ({
            ...acc,
            cloudProvider: 'Azure',
            region: acc.region || 'global',
            accountId: acc.subscriptionId || acc.accountId,
          }))
        : [];

      setConnectedAccounts([...awsAccounts, ...gcpAccounts, ...azureAccounts]);
    } catch (err) {
      console.error('❌ Failed to fetch accounts:', err);
      toast.error('Failed to load cloud accounts.');
    }
  }, [canView]);

  useEffect(() => {
    fetchConnectedAccounts();
  }, [fetchConnectedAccounts]);

  const handleConnect = async (data, provider) => {
    if (!canWrite) {
      toast.error("You don't have permission to connect cloud accounts.");
      return;
    }

    setLoading(true);
    try {
      let response;
      if (provider === 'AWS') {
        response = await api.post('/api/aws/connect', {
          accessKeyId: data.accessKey,
          secretAccessKey: data.secretKey,
          region: data.region,
          accountName: data.accountName,
          roleArn: data.roleArn,
        });
      } else if (provider === 'GCP') {
        response = await api.post('/api/gcp/connect', {
          projectId: data.projectId,
          clientEmail: data.clientEmail,
          privateKey: data.privateKey,
          accountName: data.accountName || data.projectId,
        });
      } else if (provider === 'Azure') {
        response = await api.post('/api/azure/connect', {
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          tenantId: data.tenantId,
          subscriptionId: data.subscriptionId,
          region: data.region,
          accountName: data.accountName,
        });
      } else {
        throw new Error('Unsupported provider');
      }

      toast.success(response.data.message || 'Account connected successfully!');
      await fetchConnectedAccounts();
      setSelectedProvider(''); // Close modal
    } catch (err) {
      const msg = err.response?.data?.error || `Failed to connect ${provider} account.`;
      toast.error(msg);
      console.error(`${provider} connect error:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccount = useCallback(
    (account) => {
      if (!canDelete) {
        toast.error("You don't have permission to remove accounts.");
        return;
      }
      setAccountToDelete(account);
      setShowDeleteModal(true);
      setDeleteConfirmationText('');
    },
    [canDelete]
  );

  const navigate = useNavigate();
  const handleDetailsClick = (account) => {
   navigate(`account/${account._id}`);
};

  const confirmDelete = async () => {
    if (deleteConfirmationText.trim() !== 'DELETE') {
      toast.error('⚠️ You must type DELETE in ALL CAPS — no lowercase!');
      return;
    }

    try { 
      const endpoint = 
        accountToDelete.cloudProvider === 'AWS' ? '/api/aws/account/' :
        accountToDelete.cloudProvider === 'GCP' ? '/api/gcp/account/' :
        '/api/azure/account/';
      
      await api.delete(`${endpoint}${accountToDelete._id}`);

      toast.success('✅ Account removed successfully!');
      setConnectedAccounts(prev => prev.filter(acc => acc._id !== accountToDelete._id));
      setShowDeleteModal(false);
      setAccountToDelete(null);
      setDeleteConfirmationText('');
    } catch (err) {
      console.error('❌ Delete failed:', err);
      toast.error(err.response?.data?.error || 'Failed to delete account.');
    }
  };

  const filteredAccounts = activeTab === 'All'
    ? connectedAccounts
    : connectedAccounts.filter(acc => acc.cloudProvider === activeTab);

  const counts = {
    AWS: connectedAccounts.filter(acc => acc.cloudProvider === 'AWS').length,
    GCP: connectedAccounts.filter(acc => acc.cloudProvider === 'GCP').length,
    Azure: connectedAccounts.filter(acc => acc.cloudProvider === 'Azure').length,
    All: connectedAccounts.length,
  };

  // ✅ Particles config — light peacock blue tones
  const particles = [
    { top: '10%', left: '5%', color: 'rgba(56, 189, 248, 0.5)', delay: '0s' },
    { top: '25%', left: '85%', color: 'rgba(96, 165, 250, 0.5)', delay: '4s' },
    { top: '65%', left: '18%', color: 'rgba(125, 211, 252, 0.5)', delay: '8s' },
    { top: '82%', left: '75%', color: 'rgba(56, 189, 248, 0.55)', delay: '12s' },
  ];

  return (
    <>
      <ToastContainer position="top-right" autoClose={4000} theme="colored" />

      {/* ✅ ONLY CLOUD CONNECTOR GETS THIS BACKGROUND — SCOPED STYLES */}
      <div className="cloud-connector-background relative min-h-screen overflow-hidden">
        {/* ✅ Animated Gradient Overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-[-1]"
          style={{
            background: 'conic-gradient(from 0deg, #38bdf8, #60a5fa, #7dd3fc, #38bdf8)',
            backgroundSize: '300% 300%',
            animation: 'gradientShift 28s ease-in-out infinite',
            opacity: 0.08,
            filter: 'blur(65px)',
          }}
        ></div>

        {/* ✅ Grid Overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-[-1]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        ></div>

        {/* ✅ Floating Particles */}
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              top: p.top,
              left: p.left,
              width: '3px',
              height: '3px',
              background: p.color,
              boxShadow: `0 0 10px ${p.color}`,
              animation: 'float 40s infinite ease-in-out',
              animationDelay: p.delay,
            }}
          />
        ))}

        {/* ✅ Main Content Container */}
        <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <header className="mb-8 text-center">
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Cloud Connector
                </span>
              </h1>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Connect and manage your AWS, GCP, and Azure accounts securely.
              </p>
            </header>

            {/* Provider Selection */}
            <GlassCard className="max-w-2xl mx-auto mb-9">              
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  disabled={loading}
                  className={`flex flex-col items-center justify-center gap-3 p-5 h-36 rounded-xl text-white font-semibold shadow-sm transition-all hover:scale-[1.03] bg-gradient-to-br ${p.color} ${p.iconBg} focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer hover:shadow-lg backdrop-blur-sm relative overflow-hidden ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  } ${
                    selectedProvider === p.id ? 'ring-2 ring-cyan-500' : ''
                  }`}
                  aria-label={`Connect to ${p.label}`}
                >
                  {/* Optional: subtle dark overlay for contrast (only if text is hard to read) */}
                  <div className="absolute inset-0 bg-black/15 pointer-events-none"></div>

                  {/* 🔷 Larger, bolder icon */}
                  <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                    {p.id === 'AWS' && (
                      <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 font-bold">
                        <path d="M12 2L2 7v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7l-10-5zm0 2.14L18.43 7 12 9.43 5.57 7 12 4.14zM4 19V9.43l6.57 2.43L12 12.3l1.43-.43L20 9.43V19H4z" />
                      </svg>
                    )}
                    {p.id === 'GCP' && (
                      <svg viewBox="0 0 24 24" className="w-7 h-7">
                        <path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                      </svg>
                    )}
                    {p.id === 'Azure' && (
                      <svg viewBox="0 0 24 24" className="w-7 h-7">
                        <path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    )}
                  </div>

                  {/* 🔤 Larger, bold label */}
                  <span className="relative z-10 text-center text-sm font-bold mt-1 leading-tight px-2">
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
            </GlassCard>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {['All', 'AWS', 'GCP', 'Azure'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                    activeTab === tab
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab} ({counts[tab]})
                </button>
              ))}
            </div>

            {/* Accounts Grid */}
            {connectedAccounts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAccounts.map((account) => (
                  <div key={account._id} className="w-full">
                    <AccountCard
                      account={account}
                      onRemove={handleRemoveAccount}
                      canDelete={canDelete}
                      onDetailsClick={handleDetailsClick}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <GlassCard>
                <div className="text-center py-12">
                  <Cloud className="mx-auto text-gray-500 mb-4" size={48} />
                  <h3 className="text-xl font-semibold text-white mb-2">No Accounts Connected</h3>
                  <p className="text-gray-400">
                    Click a provider above to connect your first cloud account.
                  </p>
                </div>
              </GlassCard>
            )}

            {/* ✅ Form Modal */}
            {selectedProvider && (
              <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-start justify-center pt-10 z-[60] p-4">
                <div className="bg-[#121826] rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10 relative">
                  <button
                    onClick={() => setSelectedProvider('')}
                    className="absolute right-4 top-4 text-gray-400 hover:text-white text-2xl font-bold p-1 rounded focus:outline-none"
                    aria-label="Close"
                  >
                    ×
                  </button>

                  <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Connect to {providers.find(p => p.id === selectedProvider)?.label}
                  </h2>

                  {selectedProvider === 'AWS' && (
                    <AWSForm
                      onSubmit={(data) => handleConnect(data, 'AWS')}
                      loading={loading}
                      onCancel={() => setSelectedProvider('')}
                    />
                  )}
                  {selectedProvider === 'GCP' && (
                    <GCPForm
                      onSubmit={(data) => handleConnect(data, 'GCP')}
                      loading={loading}
                      onCancel={() => setSelectedProvider('')}
                    />
                  )}
                  {selectedProvider === 'Azure' && (
                    <AzureForm
                      onSubmit={(data) => handleConnect(data, 'Azure')}
                      loading={loading}
                      onCancel={() => setSelectedProvider('')}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ✅ Delete Modal */}
            {showDeleteModal && accountToDelete && (
              <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                <div className="bg-[#121826] rounded-xl p-6 max-w-md w-full shadow-2xl border border-white/10 relative">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="absolute right-4 top-4 text-gray-400 hover:text-white text-2xl font-bold"
                    aria-label="Close"
                  >
                    ×
                  </button>
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <XCircle size={24} className="text-red-500" />
                      <h3 className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">
                        Delete Account
                      </h3>
                    </div>
                    <p className="text-gray-300">
                      <span className="font-mono">{accountToDelete.accountName}</span> ({accountToDelete.cloudProvider})
                    </p>
                  </div>
                  <p className="text-gray-400 text-sm text-center mb-4">
                    This action <span className="text-red-400 font-bold">cannot be undone</span>.<br />
                    All associated resources will be deregistered.
                  </p>
                  <div className="mb-5">
                    <label className="block text-gray-300 text-sm mb-2">
                      Type <span className="text-red-400 font-extrabold">DELETE</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full bg-white/5 border border-red-500/30 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      disabled={deleteConfirmationText.trim() !== 'DELETE'}
                      className="px-5 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded flex items-center gap-1 disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Local CSS for scoped animations & glow */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.2;
          }
          25% {
            transform: translate(10px, -15px) rotate(90deg);
            opacity: 0.5;
          }
          50% {
            transform: translate(20px, 10px) rotate(180deg);
            opacity: 0.3;
          }
          75% {
            transform: translate(-10px, 20px) rotate(270deg);
            opacity: 0.6;
          }
        }

        .cloud-connector-background {
          background: linear-gradient(125deg, #0a0d1a 0%, #0b0e1c 35%, #0c1020 65%, #0d1124 100%);
          color: #e5e7eb;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow-x: hidden;
        }

        .cloud-card-glow {
          box-shadow: 0 4px 20px rgba(56, 189, 248, 0.08), 
                      0 0 15px rgba(56, 189, 248, 0.05);
          transition: box-shadow 0.3s ease;
        }
        .cloud-card-glow:hover {
          box-shadow: 0 6px 25px rgba(56, 189, 248, 0.12), 
                      0 0 20px rgba(56, 189, 248, 0.08);
        }
      `}</style>
    </>
  );
};

export default CloudConnector;
