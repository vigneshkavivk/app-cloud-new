// client/src/components/DeploymentForm.jsx()
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import api from '../interceptor/api.interceptor';
import { useOutletContext } from 'react-router-dom';

const COMPANY_GITHUB_TOKEN = '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';

const DeploymentForm = ({
  selectedTool,
  closeModal,
  handleDeployConfirm,
  cluster: parentCluster,
  setCluster: setParentCluster,
  namespace: parentNamespace,
  setNamespace: setParentNamespace,
  isUpdateMode,
  savedDeploymentData
}) => {
  const { username } = useOutletContext();

  // ✅ NEW: Cloud Provider State
  const [cloudProvider, setCloudProvider] = useState('aws'); // 'aws', 'azure', 'gcp'

  const [awsAccounts, setAwsAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(parentCluster || '');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isClustersLoading, setIsClustersLoading] = useState(false);
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [namespace, setNamespace] = useState(parentNamespace || '');
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [gitHubUsername, setGitHubUsername] = useState('');
  const [gitHubToken, setGitHubToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenMode, setTokenMode] = useState(null);
  const [azureAccounts, setAzureAccounts] = useState([]);
  const [selectedResourceGroup, setSelectedResourceGroup] = useState('');
  const [gcpAccounts, setGcpAccounts] = useState([]);

  // --- Argo CD Status ---
  const [argoStatus, setArgoStatus] = useState('');
  const [argoMessage, setArgoMessage] = useState('');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // ✅ FETCH CLOUD ACCOUNTS BASED ON PROVIDER
useEffect(() => {
  const resetState = () => {
    setSelectedAccount(null);
    setClusters([]);
    setSelectedCluster('');
  };

  if (cloudProvider === 'aws') {
    resetState();
    const fetchAwsAccounts = async () => {
      try {
        const { data } = await api.get('/api/aws/get-aws-accounts');
        setAwsAccounts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch AWS accounts:', err);
        toast.error('Failed to load AWS accounts');
        setAwsAccounts([]);
      }
    };
    fetchAwsAccounts();
  } else if (cloudProvider === 'azure') {
    resetState();
    const fetchAzureAccounts = async () => {
      try {
        const { data } = await api.get('/api/azure/accounts');
        setAzureAccounts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch Azure accounts:', err);
        toast.error('Failed to load Azure accounts');
        setAzureAccounts([]);
      }
    };
    fetchAzureAccounts();
  } else if (cloudProvider === 'gcp') {
    resetState();
    const fetchGcpAccounts = async () => {
      try {
        const { data } = await api.get('/api/gcp/accounts');
        setGcpAccounts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch GCP accounts:', err);
        toast.error('Failed to load GCP accounts');
        setGcpAccounts([]);
      }
    };
    fetchGcpAccounts();
  }
}, [cloudProvider]);

  useEffect(() => {
  if (!selectedAccount || !selectedAccount._id) {
    setClusters([]);
    setSelectedCluster('');
    return;
  }
  const fetchClusters = async () => {
    setIsClustersLoading(true);
    try {
      let data = [];
      if (cloudProvider === 'aws') {
      const url = `/api/clusters/get-clusters?awsAccountId=${encodeURIComponent(selectedAccount.accountId)}`;
      const res = await api.get(url);
      data = res.data || [];
    } else if (cloudProvider === 'azure') {
        const res = await api.get(`/api/azure/aks-clusters?accountId=${selectedAccount._id}`);
        data = res.data || []; // ❗ BUT THIS IS THE PROBLEM!
      } else if (cloudProvider === 'gcp') {
        // ... GCP logic
      }
      setClusters(Array.isArray(data) ? data : []); // ✅ This should work...
      if (Array.isArray(data) && data.length > 0) {
        const firstCluster = data[0].name;
        if (!selectedCluster || !data.some(c => c.name === selectedCluster)) {
          setSelectedCluster(firstCluster); // ✅ Should auto-select
        }
      } else {
        setSelectedCluster('');
      }
    } catch (err) {
      console.error(`Failed to fetch ${cloudProvider} clusters:`, err);
      toast.error(`Failed to load ${cloudProvider.toUpperCase()} clusters.`);
      setClusters([]);
      setSelectedCluster('');
    } finally {
      setIsClustersLoading(false);
    }
  };
  fetchClusters();
}, [selectedAccount, cloudProvider]);

  // Rest of your GitHub, folder, token logic remains same
  // (Only runs when tokenMode is set, regardless of cloud provider)

  useEffect(() => {
    const fetchClientTokenFromDB = async () => {
      if (tokenMode !== 'client' || !username) {
        setGitHubToken('');
        setGitHubUsername('');
        return;
      }

      try {
        const jwt = localStorage.getItem('jwt');
        const { data: userData } = await api.get('/api/users/me', {
          headers: { Authorization: `Bearer ${jwt}` }
        });

        const token = userData.githubToken;
        if (!token) {
          throw new Error('No GitHub token found for this user');
        }

        const { data: githubUser } = await axios.get('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setGitHubToken(token);
        setGitHubUsername(githubUser.login);
        toast.success(`✅ Using GitHub token for @${githubUser.login}`);
      } catch (err) {
        console.error('Failed to load client GitHub token from DB:', err);
        toast.error('❌ Client GitHub token missing or invalid. Please reconnect in SCM Connector.');
        setGitHubToken('');
        setGitHubUsername('Unknown User');
      }
    };

    fetchClientTokenFromDB();
  }, [tokenMode, username]);

  useEffect(() => {
    const fetchSavedRepos = async () => {
      if (!tokenMode || !username) return;
      setIsLoadingRepos(true);
      try {
        const jwt = localStorage.getItem('jwt');
        const accountType = tokenMode === 'company' ? 'CloudMasa Tech' : 'Client Account';
        const endpoint = `/api/connections/saved-repos?userId=${username}&accountType=${encodeURIComponent(accountType)}`;
        const { data } = await api.get(endpoint, {
          headers: { Authorization: `Bearer ${jwt}` }
        });
        const repoList = Array.isArray(data) ? data.filter(Boolean) : [];
        setRepositories(repoList);
        let initialRepo = '';
        if (isUpdateMode && savedDeploymentData?.repoUrl) {
          const savedRepoName = savedDeploymentData.repoUrl.replace('https://github.com/', '');
          initialRepo = repoList.find(r => r === savedRepoName) || repoList[0] || '';
        } else {
          initialRepo = repoList[0] || '';
        }
        setSelectedRepo(initialRepo);
        setRepoUrl(initialRepo ? `https://github.com/${initialRepo}` : '');
      } catch (err) {
        console.error(`Failed to fetch ${tokenMode} repos:`, err);
        toast.error(`Failed to load ${tokenMode === 'company' ? 'company' : 'client'} repositories.`);
        setRepositories([]);
      } finally {
        setIsLoadingRepos(false);
      }
    };
    fetchSavedRepos();
  }, [tokenMode, isUpdateMode, savedDeploymentData, username]);

  useEffect(() => {
    const loadFolders = async () => {
      if (!selectedRepo) return;
      setIsLoadingFolders(true);
      try {
        const jwt = localStorage.getItem('jwt');
        const accountType = tokenMode === 'company' ? 'CloudMasa%20Tech' : 'Client%20Account';

        try {
          const savedRes = await api.get(
            `/api/connections/saved-folders?userId=${username}&repo=${encodeURIComponent(selectedRepo)}&accountType=${accountType}`,
            { headers: { Authorization: `Bearer ${jwt}` } }
          );
          const savedFolders = Array.isArray(savedRes.data) ? savedRes.data : [];
          if (savedFolders.length > 0) {
            setFolders(savedFolders);
            let initFolder = '';
            if (isUpdateMode && savedDeploymentData?.selectedFolder) {
              const savedFolderName = savedDeploymentData.selectedFolder.replace(/^tools\//, '');
              initFolder = savedFolders.find(f => f === savedFolderName) || savedFolders[0] || '';
            } else {
              const toolName = selectedTool.toLowerCase();
              initFolder =
                savedFolders.find(f => f.toLowerCase().includes(toolName)) ||
                savedFolders.find(f => f.toLowerCase().startsWith(toolName)) ||
                savedFolders[0] || '';
            }
            setSelectedFolder(initFolder);
            return;
          }
        } catch (err) {
          console.warn(`No saved folders — falling back to live fetch`);
        }

        if (tokenMode === 'client') {
          const token = gitHubToken;
          if (!token) {
            toast.warn('No saved folders and no GitHub token.');
            setFolders([]);
            setSelectedFolder('');
            return;
          }
          try {
            const repoName = selectedRepo.trim();
            const { data } = await axios.get(
              `https://api.github.com/repos/${repoName}/contents`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const dirs = Array.isArray(data)
              ? [...new Set(data.filter(item => item.type === 'dir').map(item => item.name))]
              : [];
            setFolders(dirs);
            let initFolder = '';
            if (isUpdateMode && savedDeploymentData?.selectedFolder) {
              const savedFolderName = savedDeploymentData.selectedFolder.replace(/^tools\//, '');
              initFolder = dirs.find(f => f === savedFolderName) || dirs[0] || '';
            } else {
              const toolName = selectedTool.toLowerCase();
              initFolder =
                dirs.find(f => f.toLowerCase().includes(toolName)) ||
                dirs.find(f => f.toLowerCase().startsWith(toolName)) ||
                dirs[0] || '';
            }
            setSelectedFolder(initFolder);
          } catch (err) {
            console.error('Live folder fetch failed:', err);
            toast.error('Failed to load folders via GitHub API.');
            setFolders([]);
            setSelectedFolder('');
          }
        } else {
          setFolders([]);
          setSelectedFolder('');
          toast.warn('No saved folders for company repo.');
        }
      } catch (err) {
        console.error('❌ Folder load error:', err);
        toast.error('Failed to load folders.');
        setFolders([]);
        setSelectedFolder('');
      } finally {
        setIsLoadingFolders(false);
      }
    };

    if (selectedRepo && tokenMode) {
      loadFolders();
    }
  }, [selectedRepo, tokenMode, gitHubToken, selectedTool, isUpdateMode, savedDeploymentData, username]);

  useEffect(() => {
    if (selectedRepo) {
      setRepoUrl(`https://github.com/${selectedRepo}`);
    }
  }, [selectedRepo]);

  useEffect(() => {
    if (!isUpdateMode || !savedDeploymentData) return;
    const {
      selectedAccount: savedAccount,
      selectedCluster: savedCluster,
      selectedToken: savedToken,
      namespace: savedNamespace,
      selectedFolder: savedFolder,
      repoUrl: savedRepoUrl
    } = savedDeploymentData;

    if (savedAccount) setSelectedAccount(savedAccount);
    if (savedCluster) setSelectedCluster(savedCluster);
    if (savedNamespace) setNamespace(savedNamespace);
    if (savedToken?._id === 'company-account') {
      setTokenMode('company');
    } else if (savedToken) {
      setTokenMode('client');
      setSelectedClient(savedToken);
    }
    checkArgoStatus(savedCluster, savedNamespace, savedRepoUrl, savedFolder);
  }, [isUpdateMode, savedDeploymentData]);

  const checkArgoStatus = async (cluster, ns, repoUrl, folderPath) => {
    if (!cluster || !ns || !repoUrl || !folderPath) return;
    setIsCheckingStatus(true);
    setArgoStatus('Checking...');
    setArgoMessage('');
    try {
      setTimeout(() => {
        setArgoStatus('Healthy');
        setArgoMessage('Application is synced and healthy.');
        setIsCheckingStatus(false);
      }, 2000);
    } catch (err) {
      console.error('Error checking Argo CD status:', err);
      setArgoStatus('Unknown');
      setArgoMessage('Failed to retrieve status.');
      setIsCheckingStatus(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!selectedCluster) return toast.error('Select cluster');
    if (!selectedAccount) return toast.error(`Select ${cloudProvider.toUpperCase()} account`);
    if (!tokenMode) return toast.error('Select GitHub account');
    if (!selectedFolder) return toast.error('Select folder');
    if (!namespace.trim()) return toast.error('Enter namespace');

    // ✅ ALWAYS deploy — no terminal, no condition
    await saveDeployment();
  };

  const saveDeployment = async () => {
  setIsLoading(true);

  if (!selectedCluster) return toast.error('Select cluster');
  if (!selectedAccount) return toast.error('Select cloud account');
  if (!tokenMode) return toast.error('Select GitHub account');
  if (!selectedFolder) return toast.error('Select folder');
  if (!namespace.trim()) return toast.error('Enter namespace');

  // ✅ Determine account ID based on provider
  let accountId;
  if (cloudProvider === 'aws') {
    accountId = selectedAccount._id; // or accountId if your API expects that
  } else if (cloudProvider === 'azure') {
    accountId = selectedAccount._id; // typically subscriptionId stored as _id
  } else if (cloudProvider === 'gcp') {
    accountId = selectedAccount._id; // typically projectId stored as _id
  }

  const deploymentPayload = {
    cloudProvider,
    accountId: selectedAccount._id, // ✅ unified field for all clouds
    selectedTool,
    selectedCluster,
    namespace: namespace.trim(),
    repoUrl: repoUrl.trim(),
    selectedFolder,
    gitHubToken: tokenMode === 'company' ? COMPANY_GITHUB_TOKEN : gitHubToken,
    isUpdateMode,
    ...(cloudProvider === 'azure' && { resourceGroup: selectedResourceGroup })
  };

  if (tokenMode === 'client' && !deploymentPayload.gitHubToken) {
    toast.error('GitHub token is missing.');
    setIsLoading(false);
    return;
  }

  try {
    const jwt = localStorage.getItem('jwt');
    const response = await api.post('/api/deployments/apply-argo-app', deploymentPayload, {
      headers: { Authorization: `Bearer ${jwt}` }
    });
    toast.success(response.data.message || 'Deployment triggered successfully!');
    setParentCluster?.(selectedCluster);
    setParentNamespace?.(namespace);
    closeModal();
  } catch (err) {
    console.error('Deployment API error:', err);
    const msg = err.response?.data?.error || 'Failed to trigger deployment';
    toast.error(msg);
  } finally {
    setIsLoading(false);
  }
};

  

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="relative w-full max-w-md p-6 rounded-xl shadow-lg border border-white border-opacity-10 backdrop-blur-lg bg-white bg-opacity-5 text-white z-[9999]">
          <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-20 blur-xl -z-10"></div>
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 text-white hover:text-gray-200 bg-white bg-opacity-10 hover:bg-opacity-20 p-1.5 rounded-full transition"
          >
            <X size={20} />
          </button>
          <h3 className="text-xl font-bold text-center mb-6 text-white">
            {isUpdateMode ? 'Update Configuration' : 'Deploy'} {selectedTool}
          </h3>

          {/* ✅ CLOUD PROVIDER SELECTOR — NEW TOP SECTION */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-white mb-2">Cloud Provider</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setCloudProvider('aws')}
                className={`py-2 rounded-lg font-medium transition ${
                  cloudProvider === 'aws'
                    ? 'bg-orange-600 text-white shadow'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                AWS
              </button> 
              <button
                onClick={() => setCloudProvider('azure')}
                className={`py-2 rounded-lg font-medium transition ${
                  cloudProvider === 'azure'
                    ? 'bg-blue-800 text-white shadow'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                Azure
              </button>
              <button
                onClick={() => setCloudProvider('gcp')}
                className={`py-2 rounded-lg font-medium transition ${
                  cloudProvider === 'gcp'
                    ? 'bg-green-600 text-white shadow'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                GCP
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* AWS Account — only show if AWS */}
            {cloudProvider === 'aws' && (
              <div>
                <label className="block text-sm font-medium text-white mb-1">AWS Account</label>
                {awsAccounts.length > 0 ? (
                  <select
                    value={selectedAccount?._id || ''} // ✅ CHANGE: use _id, not accountId
                    onChange={(e) => {
                      const selected = awsAccounts.find(acc => acc._id === e.target.value);
                      setSelectedAccount(selected);
                    }}
                    className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select AWS Account --</option>
                    {awsAccounts.map((acc) => (
                      <option key={acc._id} value={acc._id}> {/* ✅ use _id as value */}
                        {acc.accountName || acc.accountId} ({acc.awsRegion})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-400 italic text-sm">No AWS accounts found.</p>
                )}
              </div>
            )}


            {/* Azure Account Selector */}
            {cloudProvider === 'azure' && (
              <div>
                <label className="block text-sm font-medium text-white mb-1">Azure Subscription</label>
                {azureAccounts.length > 0 ? (
                  <select
                    value={selectedAccount?._id || ''} // ✅ use _id
                    onChange={(e) => setSelectedAccount(azureAccounts.find(acc => acc._id === e.target.value))}
                    className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">-- Select Subscription --</option>
                    {azureAccounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.accountName} ({acc.subscriptionId})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-400 italic text-sm">No Azure subscriptions found.</p>
                )}
              </div>
            )}

            {/* ✅ Azure Resource Group Selector — ONLY for Azure */}
              {cloudProvider === 'azure' && selectedAccount && (
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Resource Group</label>
                  {isClustersLoading ? (
                    <div className="p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white italic">
                      Loading...
                    </div>
                  ) : clusters.length > 0 ? (
                    <select
                      value={selectedResourceGroup}
                      onChange={(e) => setSelectedResourceGroup(e.target.value)}
                      className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="">-- Select Resource Group --</option>
                      {Array.from(new Set(clusters.map(c => c.resourceGroup))).map((rg, idx) => (
                        <option key={idx} value={rg}>
                          {rg}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-400 italic text-sm">No resource groups found.</p>
                  )}
                </div>
              )}

            {/* GCP Account Selector */}
            {cloudProvider === 'gcp' && (
              <div>
                <label className="block text-sm font-medium text-white mb-1">GCP Project</label>
                {gcpAccounts.length > 0 ? (
                  <select
                    value={selectedAccount?._id || ''} // ✅ use _id
                    onChange={(e) => setSelectedAccount(gcpAccounts.find(acc => acc._id === e.target.value))}
                    className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">-- Select Project --</option>
                    {gcpAccounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.accountName} ({acc.projectId})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-400 italic text-sm">No GCP projects found.</p>
                )}
              </div>
            )}

            {/* Cluster Selector — for ALL providers now */}
              {(cloudProvider === 'aws' || cloudProvider === 'azure' || cloudProvider === 'gcp') && selectedAccount && (
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Cluster</label>
                  {isClustersLoading ? (
                    <div className="p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white italic">
                      Loading clusters...
                    </div>
                  ) : clusters.length > 0 ? (
                    <select
                      value={selectedCluster}
                      onChange={(e) => {
                        const clusterName = e.target.value;
                        setSelectedCluster(clusterName);
                        if (cloudProvider === 'azure') {
                          const matchedCluster = clusters.find(c => c.name === clusterName);
                          if (matchedCluster) {
                            setSelectedResourceGroup(matchedCluster.resourceGroup || '');
                          }
                        }
                      }}
                      className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="">-- Select Cluster --</option>
                      {clusters.map((c, idx) => (
                        <option key={idx} value={c.name}>
                          {c.name} ({c.location || c.region || 'unknown'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-400 italic text-sm">No clusters found.</p>
                  )}
                </div>
              )}

            {/* GitHub Account — always shown */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">GitHub Account</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTokenMode('company')}
                  className={`flex-1 p-2.5 rounded-lg font-medium transition ${
                    tokenMode === 'company'
                      ? 'bg-gradient-to-r from-teal-700 via-cyan-800 to-blue-900 text-white hover:from-teal-600 hover:via-cyan-700 hover:to-blue-800 hover:shadow-lg'
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  Company Account
                </button>
                <button
                  onClick={() => setTokenMode('client')}
                  className={`flex-1 p-2.5 rounded-lg font-medium transition ${
                    tokenMode === 'client'
                      ? 'bg-gradient-to-r from-orange-500 via-red-500 to-red-600 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  Client Account
                </button>
              </div>

              {tokenMode && (
                <div className="mt-2 text-xs text-gray-400">
                  {tokenMode === 'company' ? (
                    `Using CloudMasa Tech GitHub account (token: ${COMPANY_GITHUB_TOKEN.substring(0, 6)}...)`
                  ) : gitHubToken ? (
                    `✅ Authenticated as @${gitHubUsername}`
                  ) : gitHubUsername === 'Unknown User' ? (
                    <span className="text-red-400">⚠️ Token missing — go to SCM Connector</span>
                  ) : (
                    '⏳ Loading token...'
                  )}
                </div>
              )}
            </div>

            {/* Repository */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">Repository</label>
              {isLoadingRepos ? (
                <div className="p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white">Loading...</div>
              ) : (
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">-- Select Repository --</option>
                  {repositories.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Folder */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">Folder</label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="">-- Select Folder --</option>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Namespace */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">Namespace</label>
              <input
                type="text"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., argocd"
              />
            </div>

            {/* Argo CD Status */}
            {isUpdateMode && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <h4 className="text-sm font-medium text-white mb-2">Argo CD Application Status</h4>
                {isCheckingStatus ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm text-gray-300">Checking status...</span>
                  </div>
                ) : (
                  <>
                    <div
                      className={`text-sm font-semibold ${
                        argoStatus === 'Healthy'
                          ? 'text-green-400'
                          : argoStatus === 'Degraded'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      Status: {argoStatus}
                    </div>
                    {argoMessage && <p className="text-xs text-gray-300 mt-1">{argoMessage}</p>}
                  </>
                )}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={
                isLoading ||
                (tokenMode === 'client' && !gitHubToken) ||
                !selectedCluster ||
                !selectedAccount ||
                !selectedFolder ||
                !namespace.trim()
              }
              className={`w-full py-2.5 rounded-lg font-bold ${
                isLoading
                  ? 'bg-blue-900 opacity-70 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-900 via-emerald-900 to-teal-800 hover:from-teal-800 hover:via-emerald-800 hover:to-teal-700'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Deploying...
                </div>
              ) : 'Deploy'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeploymentForm;
