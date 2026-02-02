// src/components/AccountDetails/AzureAccountDetails.jsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, Settings } from 'lucide-react';
import api from '../../interceptor/api.interceptor';
import { toast } from 'react-toastify';

const AzureAccountDetails = ({ accountId, account }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [aksClusters, setAksClusters] = useState([]);
  const [workloads, setWorkloads] = useState([]);
  const [vms, setVms] = useState([]);
  const [lastSynced, setLastSynced] = useState(null);

  const fetchAllData = async () => {
    try {
      const [
        metricsRes,
        aksRes,
        workloadsRes,
        vmsRes,
      ] = await Promise.all([
        api.get(`/api/azure/${accountId}/metrics`),
        api.get(`/api/azure/${accountId}/aks`),
        api.get(`/api/azure/${accountId}/workloads`),
        api.get(`/api/azure/${accountId}/vms`),
      ]);

      setMetrics(metricsRes.data);
      setAksClusters(aksRes.data);
      setWorkloads(workloadsRes.data);
      setVms(vmsRes.data);
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch Azure data:', err);
      toast.error('Failed to load Azure account details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [accountId]);

  const refreshData = () => {
    setLoading(true);
    fetchAllData();
  };

  if (loading && !metrics) {
    return <div className="p-6">Loading Azure account data...</div>;
  }

  const tabs = [
    { key: 'aks', label: `AKS (${aksClusters.length})` },
    { key: 'workloads', label: `Workloads (${workloads.length})` },
    { key: 'vms', label: `VMs (${vms.length})` },
    { key: 'storage', label: 'Storage' },
  ];

  const [activeTab, setActiveTab] = useState('aks');

  const formatCost = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Microsoft Azure</h1>
          <p className="text-sm text-gray-400">
            {account.accountName} • {account.region || 'global'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Sub ID: ...{account.subscriptionId?.slice(-8)} • Tenant: ...{account.tenantId?.slice(-8)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Last synced: {lastSynced || '—'}</span>
          <button
            onClick={refreshData}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-gray-800 hover:bg-gray-700"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-gray-800 hover:bg-gray-700">
            <Settings size={16} /> Settings
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Resource Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'AKS Clusters', value: metrics.aks || 0, icon: '📦' },
              { label: 'Namespaces', value: metrics.namespaces || 0, icon: '📦' },
              { label: 'VMs', value: metrics.vms || 0, icon: '🖥️' },
              { label: 'Pods', value: metrics.pods || 0, icon: '🪄' },
              { label: 'Workloads', value: metrics.workloads || 0, icon: '⚙️' },
              { label: 'Services', value: metrics.services || 0, icon: '🌐' },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 text-center hover:bg-white/10 transition-all">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-3xl font-bold">{item.value}</div>
                <div className="text-sm text-gray-400">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Utilization */}
      {metrics && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Resource Utilization</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-xl p-4">
              {['storage', 'cpu', 'memory'].map((key) => {
                const val = metrics[key];
                if (!val) return null;
                return (
                  <div key={key} className="mb-4 last:mb-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                      <span>
                        {val.used} / {val.total} {val.unit || 'TB'} ({val.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          val.percent > 90 ? 'bg-red-500' :
                          val.percent > 70 ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(val.percent, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{metrics.networkIn || 0} GB</div>
                <div className="text-sm text-gray-400">Network In</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{metrics.networkOut || 0} GB</div>
                <div className="text-sm text-gray-400">Network Out</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{formatCost(metrics.costCurrent || 0)}</div>
                <div className="text-sm text-gray-400">Current Month</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{formatCost(metrics.costProjected || 0)}</div>
                <div className="text-sm text-gray-400">Projected</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-500 text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/5 rounded-xl p-6">
        {activeTab === 'aks' && (
          <div>
            <h3 className="text-lg font-bold mb-4">AKS Clusters</h3>
            {aksClusters.length === 0 ? (
              <p className="text-gray-400">No AKS clusters found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-2 text-left">Cluster Name</th>
                    <th className="py-2 text-left">Location</th>
                    <th className="py-2 text-left">Version</th>
                    <th className="py-2 text-left">Node Count</th>
                    <th className="py-2 text-left">Provisioning State</th>
                  </tr>
                </thead>
                <tbody>
                  {aksClusters.map((c, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="py-2">{c.name}</td>
                      <td className="py-2">{c.location}</td>
                      <td className="py-2">{c.kubernetesVersion}</td>
                      <td className="py-2">{c.nodeCount}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          c.provisioningState === 'Succeeded' ? 'bg-green-500/20 text-green-300' :
                          c.provisioningState === 'Failed' ? 'bg-red-500/20 text-red-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {c.provisioningState}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'workloads' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Kubernetes Workloads</h3>
            {workloads.length === 0 ? (
              <p className="text-gray-400">No workloads found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-2 text-left">Name</th>
                    <th className="py-2 text-left">Namespace</th>
                    <th className="py-2 text-left">Type</th>
                    <th className="py-2 text-left">Replicas</th>
                    <th className="py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workloads.map((w, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="py-2">{w.name}</td>
                      <td className="py-2">
                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300">
                          {w.namespace}
                        </span>
                      </td>
                      <td className="py-2">{w.type}</td>
                      <td className="py-2">{w.replicas}</td>
                      <td className="py-2">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300">
                          Running
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'vms' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Virtual Machines</h3>
            {vms.length === 0 ? (
              <p className="text-gray-400">No VMs found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-2 text-left">VM Name</th>
                    <th className="py-2 text-left">Resource Group</th>
                    <th className="py-2 text-left">Size</th>
                    <th className="py-2 text-left">Location</th>
                    <th className="py-2 text-left">Power State</th>
                  </tr>
                </thead>
                <tbody>
                  {vms.map((vm, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="py-2 font-mono">{vm.name}</td>
                      <td className="py-2">{vm.resourceGroup}</td>
                      <td className="py-2">{vm.size}</td>
                      <td className="py-2">{vm.location}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          vm.powerState === 'running' ? 'bg-green-500/20 text-green-300' :
                          vm.powerState === 'deallocated' ? 'bg-gray-500/20 text-gray-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {vm.powerState}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'storage' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Blob Storage & Disks</h3>
            <p className="text-gray-400">Managed disks, blob containers, and storage account metrics will appear here soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AzureAccountDetails;
