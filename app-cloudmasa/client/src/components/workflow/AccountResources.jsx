// src/components/workflow/AccountResources.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Code, X, Lock, AlertTriangle, Trash2, CheckCircle, ExternalLink, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const AccountResources = ({ selectedAccount, selectedProvider, onCreateNewResource }) => {
  const { hasPermission, user } = useAuth();

  // 🔐 RBAC: Require 'Agent.Read' to view this page at all
  if (!hasPermission('Agent', 'Read')) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 text-red-400 mb-3">
            <Lock className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Access Denied</h3>
          </div>
          <p className="text-gray-400">
            You need <code className="bg-gray-800 px-1.5 py-0.5 rounded">Agent Read</code> permission to view deployments.
          </p>
        </div>
      </div>
    );
  }

  const canDestroy = hasPermission('Agent', 'Delete');
  const canCreate = hasPermission('Agent', 'Create');

  const [deployments, setDeployments] = useState([]);
  const [loadingDeployments, setLoadingDeployments] = useState(true);
  const [errorDeployments, setErrorDeployments] = useState(null);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [destroyModal, setDestroyModal] = useState(null);
  const navigate = useNavigate();
  const [deploymentCost, setDeploymentCost] = useState(null);
  // ✅ Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  // 🔒 Escape key handling
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setSelectedDeployment(null);
        setDestroyModal(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);
// 📊 Fetch live deployment cost
useEffect(() => {
  if (!selectedDeployment) {
    setDeploymentCost(null);
    return;
  }

  const fetchDeploymentCost = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('user'))?.token || '';
      const res = await fetch(`/api/costs/deployment-cost?deploymentId=${selectedDeployment.deploymentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setDeploymentCost(data.cost);
      } else {
        console.error('Failed to fetch deployment cost:', data.error);
        setDeploymentCost(null);
      }
    } catch (err) {
      console.error('Error fetching deployment cost:', err);
      setDeploymentCost(null);
    }
  };

  fetchDeploymentCost();
}, [selectedDeployment]);
  // 💎 DESTROY MODAL — matches TerraFlow design
  const DestroyDeploymentModal = ({ deploymentId, onClose, onConfirm }) => {
    const [inputValue, setInputValue] = useState('');
    const [isCapsLockOn, setIsCapsLockOn] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
      if (inputRef.current) inputRef.current.focus();
    }, []);

    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.getModifierState && e.getModifierState('CapsLock')) {
          setIsCapsLockOn(true);
        } else {
          setIsCapsLockOn(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const isValid = inputValue === 'DELETE';

    const handleConfirm = () => {
      if (isValid) onConfirm();
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && isValid) handleConfirm();
    };

    return (
      <div
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-red-900/10 border-b border-red-800/20 px-6 py-4 flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Destroy Deployment?</h3>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            <div className="text-gray-300 leading-relaxed">
              This will permanently delete all resources managed by Terraform for:
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm font-medium">ID:</span>
                <code className="font-mono text-cyan-300 bg-gray-900 px-2 py-1 rounded text-sm">
                  {deploymentId}
                </code>
              </div>
            </div>

            <div className="bg-red-900/10 border border-red-800/20 rounded-lg p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-200 leading-relaxed">
                  <strong className="text-red-300">This action cannot be undone.</strong> All AWS resources will be deleted.
                </div>
              </div>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <label className="block text-gray-200 font-medium">
                Type <span className="text-yellow-400 font-mono">DELETE</span> to confirm:
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type DELETE here"
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                    isValid
                      ? 'border-green-500 focus:ring-green-500/30'
                      : inputValue && !isValid
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-gray-700 focus:ring-blue-500/20'
                  }`}
                />
                {isCapsLockOn && inputValue.length > 0 && (
                  <div className="absolute inset-y-0 right-3 flex items-center text-xs text-yellow-400 gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Caps Lock
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Case-sensitive. Must be exact: <code className="px-1.5 py-0.5 bg-gray-700 rounded font-mono">DELETE</code>
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValid}
                className={`flex-1 py-3 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isValid
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-red-600/30 text-red-300/70 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Destroy
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDestroyDeployment = (deploymentId) => {
    if (!canDestroy) {
      showToast('🔒 Permission denied: Agent Delete required.', 'error');
      return;
    }
    setSelectedDeployment(null);
    setDestroyModal({ deploymentId });
  };

  const executeDestroy = async (deploymentId) => {
    setDestroyModal(null);
    try {
      showToast(`⏳ Destroying ${deploymentId}...`, 'info');
      const res = await fetch('/api/terraform/destroy-deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deploymentId, accountId: selectedAccount._id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✅ Deployment ${deploymentId} destroyed successfully.`, 'success');
        setDeployments(prev => prev.filter(d => d.deploymentId !== deploymentId));
      } else {
        showToast(`❌ Destruction failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      console.error('Destroy error:', err);
      showToast(`🌐 Network error. Try again.`, 'error');
    }
  };

  // 📥 Fetch deployments
  useEffect(() => {
    if (!selectedAccount || selectedProvider !== 'aws') {
      setLoadingDeployments(false);
      return;
    }

    const fetchDeployments = async () => {
      setLoadingDeployments(true);
      setErrorDeployments(null);
      try {
        const res = await fetch(`/api/terraform/resources?accountId=${selectedAccount._id}`);
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const json = await res.json();
            msg = json.error || json.message || msg;
          } catch {}
          throw new Error(msg);
        }
        const data = await res.json();
        if (data.success) {
          setDeployments((data.deployments || []).filter(dep => dep.accountId === selectedAccount._id?.toString()));
        } else {
          setErrorDeployments(data.error || 'Unknown error');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setErrorDeployments(err.message || 'Failed to load');
      } finally {
        setLoadingDeployments(false);
      }
    };
    fetchDeployments();
  }, [selectedAccount, selectedProvider]);

  return (
    <div className="space-y-6">
      {/* 🟢 HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-green-500/20 rounded">
            <Code className="w-4 h-4 text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Terraform Deployments</h2>
        </div>
        <div className="text-gray-400 text-sm">
          Manage your infrastructure as code
        </div>
      </div>

      {/* ✅ NEW DEPLOYMENT BUTTON — BIGGER, ON LEFT SIDE, PROFESSIONAL */}
      <div className="flex items-center gap-4">
        {canCreate && (
          <button
            onClick={onCreateNewResource || (() => console.warn('onCreateNewResource not provided'))}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl flex items-center gap-2 transition transform hover:-translate-y-0.5 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            New Deployment
          </button>
        )}
      </div>
      {/* 💰 Live Usage Cost */}
{deploymentCost !== null && (
  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-4">
    <div className="text-gray-400 text-sm font-medium mb-1">Live Usage Cost</div>
    <div className="text-green-400 font-bold text-xl">
      ${deploymentCost.toFixed(2)} / month
    </div>
    <div className="text-xs text-gray-500 mt-1">
      Actual AWS billing data (updated daily).
    </div>
  </div>
)}
      {/* 📦 DEPLOYMENTS GRID */}
      {loadingDeployments ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mb-3"></div>
          <p className="text-gray-400">Loading deployments...</p>
        </div>
      ) : errorDeployments ? (
        <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-4 text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorDeployments}</span>
          </div>
        </div>
      ) : deployments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {deployments.map((dep) => (
            <div
              key={dep.deploymentId}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all duration-300 group cursor-pointer"
              onClick={() => setSelectedDeployment(dep)} // 👈 CLICK TO OPEN DETAIL MODAL
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-gray-800 rounded">
                      <Code className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="font-mono text-cyan-300 text-sm">{dep.deploymentId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-gray-800 text-xs text-yellow-300 rounded font-medium">
                      {dep.modules[0]?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                      <CheckCircle className="w-3 h-3" />
                      Healthy
                    </div>
                    <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                      <CheckCircle className="w-3 h-3" />
                      {dep.resources?.length || 0} resources
                    </div>
                  </div>
                </div>
                {canDestroy && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // 👈 STOP PROPAGATION — DON’T OPEN DETAIL MODAL
                      handleDestroyDeployment(dep.deploymentId);
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center gap-1 transition-colors group-hover:scale-105"
                  >
                    <Trash2 className="w-4 h-4" />
                    Destroy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-900 border border-dashed border-gray-800 rounded-xl">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-800 rounded-xl mb-4">
            <Code className="w-6 h-6 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-200 mb-2">No Deployments Found</h3>
          <p className="text-gray-400 max-w-md mx-auto leading-relaxed mb-6">
            Start by creating your first infrastructure stack. Terraform state will appear here automatically.
          </p>
        </div>
      )}

      {/* 📋 Deployment Detail Modal — OPENED ON CLICK */}
      {selectedDeployment && (
        <div
          className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
          onClick={() => setSelectedDeployment(null)}
        >
          <div
            className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Deployment Details</h3>
              <button
                onClick={() => setSelectedDeployment(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-sm font-medium mb-1">ID</div>
                  <div className="font-mono text-cyan-300 break-all text-base">{selectedDeployment.deploymentId}</div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-sm font-medium mb-1">Modules</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDeployment.modules.map((m, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-700 text-yellow-300 rounded text-xs font-medium">
                        {m.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-sm font-medium mb-1">Created At</div>
                  <div className="text-blue-400 text-base">
                    {new Date(selectedDeployment.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-sm font-medium mb-1">Resources</div>
                  <div className="text-green-400 font-medium text-base">
                    {selectedDeployment.resources?.length || 0} ACTIVE
                  </div>
                </div>
              </div>

              {selectedDeployment.resources?.length > 0 && (
                <>
                  <h4 className="text-gray-200 font-medium mb-3 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Managed Resources ({selectedDeployment.resources.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {selectedDeployment.resources.map((r, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-gray-800 border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm"
                      >
                        <span className="font-medium text-gray-100">{r.name || r.id}</span>
                        <span className="text-gray-400 font-mono">{r.type}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-8 pt-4 border-t border-gray-700 flex justify-end gap-3">
                {canDestroy ? (
                  <button
                    onClick={() => {
                      setSelectedDeployment(null);
                      setDestroyModal({ deploymentId: selectedDeployment.deploymentId });
                    }}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Destroy Deployment
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-5 py-2.5 bg-gray-700 text-gray-400 font-medium rounded-lg cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4 inline mr-1.5" />
                    Destroy (Access Denied)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ DESTROY MODAL */}
      {destroyModal && (
        <DestroyDeploymentModal
          deploymentId={destroyModal.deploymentId}
          onClose={() => setDestroyModal(null)}
          onConfirm={() => executeDestroy(destroyModal.deploymentId)}
        />
      )}

      {/* 📍 Footer */}
      {selectedAccount && (
        <div className="text-center pt-4 text-gray-500 text-sm">
          <div className="inline-flex items-center gap-1.5 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
            <span className="w-4 h-4 flex items-center justify-center">🔍</span>
            ID: <code className="font-mono bg-gray-900 px-1.5 py-0.5 rounded">
              {selectedAccount.accountId ? `${selectedAccount.accountId.slice(0, 8)}...${selectedAccount.accountId.slice(-4)}` : 'N/A'}
            </code>
            <span className="mx-1">•</span>
            <code className="font-mono bg-gray-900 px-1.5 py-0.5 rounded">{selectedAccount.awsRegion}</code>
          </div>
        </div>
      )}

      {/* 🍞 TOAST */}
      {toast.show && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg text-white font-medium shadow-lg transition-all duration-300 flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-green-600'
              : toast.type === 'error'
              ? 'bg-red-600'
              : 'bg-blue-600'
          }`}
        >
          {toast.type === 'success' && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AccountResources;
