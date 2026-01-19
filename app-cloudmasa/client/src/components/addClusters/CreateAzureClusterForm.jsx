// src/components/addclusters/CreateAzureClusterForm.jsx
import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeftCircle,
  Layers
} from 'lucide-react';
import api from '../../interceptor/api.interceptor';
import { toast } from 'react-toastify';

export default function CreateAzureClusterForm({ onBack }) {
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [clusterName, setClusterName] = useState('');
  const [region, setRegion] = useState('us-east-1'); // ✅ AWS-style region key
  const [nodeCount, setNodeCount] = useState(2);
  const [vmSize, setVmSize] = useState('Standard_B2s');
  const [kubernetesVersion, setKubernetesVersion] = useState('1.29');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // VNet & Subnet state
  const [vnetId, setVnetId] = useState('');
  const [subnetIds, setSubnetIds] = useState([]);
  const [vnets, setVnets] = useState([]);
  const [subnets, setSubnets] = useState([]);

  // Fetch Azure accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get('/api/azure/accounts');
        setSavedAccounts(res.data);
        if (res.data.length === 1) setSelectedAccount(res.data[0]);
      } catch (err) {
        toast.error('Failed to load Azure accounts');
      }
    };
    fetchAccounts();
  }, []);

  // Fetch VNets when account changes
  useEffect(() => {
    if (!selectedAccount?.subscriptionId) {
      setVnets([]);
      setVnetId('');
      return;
    }

    const fetchVnets = async () => {
      try {
        const res = await api.get(`/api/azure/vnets?subscriptionId=${selectedAccount.subscriptionId}`);
        setVnets(res.data || []);
      } catch (err) {
        console.error('Failed to load VNets:', err);
        toast.error('Failed to load virtual networks');
      }
    };

    fetchVnets();
  }, [selectedAccount]);

  // Fetch subnets when VNet changes
  useEffect(() => {
    if (!vnetId) {
      setSubnets([]);
      setSubnetIds([]);
      return;
    }

    const fetchSubnets = async () => {
      try {
        const res = await api.get(`/api/azure/subnets?vnetId=${encodeURIComponent(vnetId)}`);
        setSubnets(res.data || []);
      } catch (err) {
        console.error('Failed to load subnets:', err);
        toast.error('Failed to load subnets');
      }
    };

    fetchSubnets();
  }, [vnetId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedAccount) return setError('Select an Azure account');
    if (!clusterName.trim()) return setError('Cluster name is required');

    // Validate subnet selection if VNet is chosen
    if (vnetId && subnetIds.length < 2) {
      return setError('At least 2 subnets must be selected when using an existing VNet.');
    }

    const safeNodeCount = parseInt(nodeCount) || 2;
    const safeVmSize = vmSize || 'Standard_B2s';
    const safeK8sVersion = kubernetesVersion || '1.29';

    const validVmSizes = new Set([
      'Standard_B2s',
      'Standard_B2ms',
      'Standard_D2_v2',
      'Standard_D4_v2',
      'Standard_E2b_v5'
    ]);
    if (!validVmSizes.has(safeVmSize)) {
      return setError('Invalid VM size selected');
    }

    setCreating(true);
    try {
      const payload = {
        account: selectedAccount._id,
        region, // AWS-style (e.g., 'us-east-1')
        modules: ['aks'],
        moduleConfig: {
          aks: {
            cluster_name: clusterName.trim(),
            node_count: safeNodeCount,
            vm_size: safeVmSize,
            kubernetes_version: safeK8sVersion,
            vnet_id: vnetId || undefined,
            subnet_ids: vnetId && subnetIds.length >= 2 ? subnetIds : undefined
          }
        }
      };

      console.log('Sending AKS deployment payload:', payload);

      const res = await api.post('/api/azure/terraform/deploy', payload);
      if (res.data?.success) {
        setSuccess(`✅ Azure cluster "${clusterName}" creation initiated!`);
        setTimeout(onBack, 1500);
      } else {
        throw new Error(res.data?.message || 'Deployment request failed');
      }
    } catch (err) {
      console.error('AKS Creation Error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to create Azure cluster. Check logs for details.'
      );
    } finally {
      setCreating(false);
    }
  };

  // Region options using AWS-style keys (to match backend mapping)
  const regionOptions = [
    { value: 'us-east-1', label: 'East US' },
    { value: 'eu-west-1', label: 'West Europe' },
    { value: 'ap-southeast-1', label: 'Southeast Asia' },
    { value: 'us-central-1', label: 'Central US' },
    { value: 'uk-south-1', label: 'UK South' }
  ];

  const vmSizeOptions = [
    'Standard_B2s',
    'Standard_B2ms',
    'Standard_D2_v2',
    'Standard_D4_v2',
    'Standard_E2b_v5'
  ];

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
        <Layers className="text-[#38bdf8]" size={20} />
        Configure AKS Cluster
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
        {/* Azure Account */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">Azure Account</label>
          <select
            value={selectedAccount?._id || ''}
            onChange={(e) => {
              const acc = savedAccounts.find(a => a._id === e.target.value);
              setSelectedAccount(acc);
            }}
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Subscription</option>
            {savedAccounts.map(acc => (
              <option key={acc._id} value={acc._id}>
                {acc.accountName || acc.subscriptionId} ({acc.azureRegion})
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
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500"
            placeholder="my-aks-cluster"
            required
          />
        </div>

        {/* Region */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">Region</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500"
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
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* VM Size */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">VM Size</label>
          <select
            value={vmSize}
            onChange={(e) => setVmSize(e.target.value)}
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500"
          >
            {vmSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        {/* VNet Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">Virtual Network</label>
          <select
            value={vnetId}
            onChange={(e) => setVnetId(e.target.value)}
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Auto-create new VNet</option>
            {vnets.map(vnet => (
              <option key={vnet.id} value={vnet.id}>
                {vnet.name} ({vnet.location})
              </option>
            ))}
          </select>
        </div>

        {/* Subnet Selection */}
        {vnetId && (
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">
              Subnets (Select at least 2)
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-white/10 rounded-md p-2 bg-white/5">
              {subnets.length === 0 ? (
                <p className="text-gray-400 text-sm">No subnets found.</p>
              ) : (
                subnets.map(subnet => (
                  <label key={subnet.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={subnetIds.includes(subnet.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSubnetIds(prev => [...prev, subnet.id]);
                        } else {
                          setSubnetIds(prev => prev.filter(id => id !== subnet.id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white">{subnet.name}</span>
                  </label>
                ))
              )}
            </div>
            {subnetIds.length < 2 && (
              <p className="text-red-400 text-xs mt-1">At least 2 subnets are required.</p>
            )}
          </div>
        )}

        {/* Actions */}
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
                ? 'bg-white/10 cursor-not-allowed text-gray-400'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-gray-900 hover:from-blue-600 hover:to-cyan-600'
            }`}
          >
            {creating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Creating...
              </>
            ) : (
              'Create AKS Cluster'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
