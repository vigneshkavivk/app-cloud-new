// src/components/GitHubConnector.jsx
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "tailwindcss/tailwind.css";
import {
  FaGithub,
  FaSave,
  FaCloud,
  FaTrash,
} from "react-icons/fa";
import { HiOutlineLockClosed } from "react-icons/hi";
import api from "../../interceptor/api.interceptor";

const CLOUDMASA_GITHUB_TOKEN = "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";

const GitHubConnector = ({ onBack }) => {
  const { username } = useOutletContext();

  if (!username || typeof username !== "string" || username.trim() === "") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2 text-white">⚠️ User Session Missing</h2>
          <p className="mb-4 text-gray-300">Please log in again.</p>
        </div>
      </div>
    );
  }

  const [mode, setMode] = useState(null);
  const [tokenInput, setTokenInput] = useState("");
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [owner, setOwner] = useState("");
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [savedConnections, setSavedConnections] = useState([]);
  const [githubLogin, setGithubLogin] = useState(null);

  const handleBackButton = () => {
    onBack();
  };

  const resetStateForModeSwitch = () => {
    setRepos([]);
    setSelectedRepo("");
    setFolders([]);
    setSelectedFolder("");
    setOwner("");
    setGithubLogin(null);
    // ✅ Do NOT reset tokenInput here — it's only for client mode
  };

  const fetchUserData = async () => {
    try {
      const connRes = await api.get(`/api/connections?userId=${username}`);
      setSavedConnections(connRes.data || []);

      const userRes = await api.get("/api/users/me");
      const userData = userRes.data;

      if (userData.githubToken) {
        setTokenInput(userData.githubToken);
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
      if (err.response?.status !== 404) {
        toast.error("❌ Failed to load your data.");
      }
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [username]);

  // ✅ Helper: get current effective token based on mode
  const getCurrentToken = () => {
    if (mode === "default") {
      return CLOUDMASA_GITHUB_TOKEN;
    }
    return tokenInput.trim();
  };

  // ✅ AUTO-CONNECT ONLY FOR CLIENT MODE
  const autoConnectIfTokenExists = async (token) => {
    if (!token || mode !== "own") return; // 🔒 critical guard

    try {
      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${token}` },
      });
      const userData = await userRes.json();

      if (userRes.ok && userData?.login) {
        setGithubLogin(userData.login);
        localStorage.setItem("scm_github_login", userData.login);
        toast.info(`✅ Reconnected as @${userData.login}`, { autoClose: 2500 });
      } else {
        throw new Error("Invalid token");
      }

      const payload = { githubToken: token };
      const res = await api.post("/api/scm/fetch-repos", payload);
      const repoNames = res.data.map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
      }));
      setRepos(repoNames);
      toast.success(`✅ Repositories loaded automatically!`);
    } catch (err) {
      console.warn("Auto-connect failed:", err);
      setTokenInput("");
      toast.warn("Token expired or invalid. Please re-enter.");
    }
  };

  const handleOwnConnect = async (e) => {
    e.preventDefault();
    const finalToken = tokenInput.trim();
    if (!finalToken) return toast.error(`GitHub token is required!`);

    try {
      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${finalToken}` },
      });
      const userData = await userRes.json();

      let actualUsername = username;
      if (userRes.ok && userData?.login) {
        actualUsername = userData.login;
        setGithubLogin(actualUsername);
        localStorage.setItem("scm_github_token", finalToken);
        localStorage.setItem("scm_github_login", actualUsername);
        toast.info(`Hello, @${actualUsername}!`, { autoClose: 2000 });
      }

      const payload = { githubToken: finalToken };
      const res = await api.post("/api/scm/fetch-repos", payload);
      const repoNames = res.data.map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
      }));
      setRepos(repoNames);
      await api.patch("/api/users/me", { githubToken: finalToken }); // ✅ Only save in client mode
      toast.success(`✅ Connected & token saved.`);
    } catch (err) {
      console.error("Connection error:", err);
      toast.error(`❌ Invalid GitHub token.`);
    }
  };

  // ✅ FIXED: Never touch tokenInput in default mode
  const handleDefaultConnect = async () => {
    if (!CLOUDMASA_GITHUB_TOKEN || CLOUDMASA_GITHUB_TOKEN.includes("YOUR_ACTUAL")) {
      toast.error("❌ CloudMasa token not configured!");
      return;
    }

    try {
      const payload = { githubToken: CLOUDMASA_GITHUB_TOKEN };
      const res = await api.post("/api/scm/fetch-repos", payload);
      const repoNames = res.data.map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
      }));
      setRepos(repoNames);
      // ✅ DO NOT setTokenInput(CLOUDMASA_GITHUB_TOKEN);
      setGithubLogin("CloudMasa-Tech"); // for display only
      setSelectedRepo("");
      setSelectedFolder("");
      setFolders([]);
      toast.success(`✅ Loaded ${repoNames.length} repos from CloudMasa Tech!`);
    } catch (err) {
      console.error("Fetch repos error:", err);
      toast.error("❌ Failed to fetch CloudMasa repos.");
      setRepos([]);
    }
  };

  const fetchFolders = async (repoFullName) => {
    const repo = repos.find((r) => r.fullName === repoFullName);
    if (!repo) return;

    setSelectedRepo(repoFullName);
    setOwner(repo.owner);
    setLoadingFolders(true);

    try {
      const finalToken = getCurrentToken();
      if (!finalToken) {
        toast.error(`Please reconnect with your GitHub token.`);
        return;
      }

      const payload = {
        githubToken: finalToken,
        owner: repo.owner,
        repo: repo.name,
      };
      const res = await api.post("/api/scm/fetch-folders", payload);
      const items = res.data.map((item) => ({ name: item.name, path: item.path }));
      setFolders(items);
      setSelectedFolder("");
    } catch (err) {
      console.error("Fetch folders error:", err);
      toast.error("❌ Failed to fetch folders.");
    } finally {
      setLoadingFolders(false);
    }
  };

  const saveRepoAndAllFolders = async () => {
    if (!selectedRepo) return toast.error("Please select a repository first!");
    const repo = repos.find((r) => r.fullName === selectedRepo);
    if (!repo) return toast.error("Repository not found.");

    try {
      const finalToken = getCurrentToken();
      if (!finalToken) {
        toast.error(`Please reconnect with your GitHub token.`);
        return;
      }

      const payload = { githubToken: finalToken, owner: repo.owner, repo: repo.name };
      const res = await api.post("/api/scm/fetch-folders", payload);
      const allFolders = res.data.map((item) => ({ name: item.name, path: item.path }));

      if (allFolders.length === 0) {
        toast.warn("No folders found in this repository.");
      }

      // ✅ Use MODE to determine account type — NOT token comparison
      const isCloudMasaTech = mode === "default";
      const accountType = isCloudMasaTech ? "CloudMasa Tech" : "Client Account";
      const effectiveName = githubLogin || username;

      const repoPayload = {
        userId: username,
        name: `${effectiveName} (Repo Only)`,
        repo: selectedRepo,
        folder: null,
        status: "Repo Saved",
        lastSync: new Date().toISOString(),
        provider: "github",
        accountType,
      };

      const repoRes = await api.post("/api/connections/save-default", repoPayload);
      let newConnections = [{ ...repoPayload, _id: repoRes.data?._id || Date.now().toString() }];

      const skipFolders = [".github", "docs", "scripts", "tests", "test", "__pycache__"];
      for (const folder of allFolders) {
        if (skipFolders.some((skip) => folder.path.toLowerCase().includes(skip))) continue;

        const folderName = folder.path.split("/").pop() || folder.path;
        const folderUrl = `https://github.com/${selectedRepo}/tree/main/${encodeURIComponent(folder.path)}`;
        const folderPayload = {
          userId: username,
          name: `${effectiveName} - ${folderName}`,
          repo: selectedRepo,
          folder: folderUrl,
          status: "Connected",
          lastSync: new Date().toISOString(),
          provider: "github",
          accountType,
        };

        try {
          const folderRes = await api.post("/api/connections/save-default", folderPayload);
          newConnections.push({ ...folderPayload, _id: folderRes.data?._id || Date.now().toString() });
        } catch (err) {
          console.warn(`Failed to save folder: ${folder.path}`, err);
        }
      }

      setSavedConnections((prev) => [...prev, ...newConnections]);
      toast.success(`✅ Saved repo + ${newConnections.length - 1} folders!`);
    } catch (err) {
      console.error("Save repo + folders error:", err);
      toast.error("❌ Failed to save repository and folders.");
    }
  };

  const saveFolderOnly = async () => {
    if (!selectedRepo || !selectedFolder) {
      return toast.error("Select both repo and folder!");
    }

    try {
      const folderName = selectedFolder.split("/").pop() || selectedFolder;
      const folderUrl = `https://github.com/${selectedRepo}/tree/main/${encodeURIComponent(selectedFolder)}`;
      
      const isCloudMasaTech = mode === "default";
      const accountType = isCloudMasaTech ? "CloudMasa Tech" : "Client Account";
      const effectiveName = githubLogin || username;

      const payload = {
        userId: username,
        name: `${effectiveName} - ${folderName}`,
        repo: selectedRepo,
        folder: folderUrl,
        status: "Connected",
        lastSync: new Date().toISOString(),
        provider: "github",
        accountType,
      };

      const res = await api.post("/api/connections/save-default", payload);
      setSavedConnections((prev) => [
        ...prev,
        { ...payload, _id: res.data?._id || Date.now().toString() },
      ]);
      toast.success(`✅ Folder "${folderName}" saved!`);
    } catch (err) {
      console.error("Save folder error:", err);
      toast.error("❌ Failed to save folder.");
    }
  };

  const clearConnections = async () => {
    try {
      await api.delete(`/api/connections/clear?userId=${username}`);
      setSavedConnections([]);
      toast.success("🗑️ Cleared all saved connections!");
    } catch (err) {
      toast.error("❌ Failed to clear connections.");
    }
  };

  const switchToDefaultMode = () => {
    resetStateForModeSwitch();
    setMode("default");
    // ✅ Clear any client state that might leak
    setTokenInput(""); // optional but safe
    setGithubLogin("CloudMasa-Tech");
  };

  const switchToOwnMode = () => {
    resetStateForModeSwitch();
    setMode("own");
    // ✅ Explicitly clear any leftover company state
    setTokenInput("");
    setGithubLogin(null);

    // Refetch user token and auto-connect if exists
    setTimeout(async () => {
      await fetchUserData(); // reload real token
      if (tokenInput && tokenInput.trim()) {
        autoConnectIfTokenExists(tokenInput.trim());
      }
    }, 100);
  };

  return (
    <div className="min-h-screen px-6 py-10 text-white relative overflow-hidden">
      <div className="animated-gradient-bg"></div>

      <style>{`
        .button {
          display: block;
          position: relative;
          width: 56px;
          height: 56px;
          margin: 0;
          overflow: hidden;
          outline: none;
          background-color: transparent;
          cursor: pointer;
          border: 0;
        }
        .button:before,
        .button:after {
          content: "";
          position: absolute;
          border-radius: 50%;
          inset: 7px;
        }
        .button:before {
          border: 4px solid #cbd5e1;
          transition: opacity 0.4s cubic-bezier(0.77, 0, 0.175, 1) 80ms,
            transform 0.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) 80ms;
        }
        .button:after {
          border: 4px solid #93c5fd;
          transform: scale(1.3);
          transition: opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1),
            transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          opacity: 0;
        }
        .button:hover:before,
        .button:focus:before {
          opacity: 0;
          transform: scale(0.7);
          transition: opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1),
            transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .button:hover:after,
        .button:focus:after {
          opacity: 1;
          transform: scale(1);
          transition: opacity 0.4s cubic-bezier(0.77, 0, 0.175, 1) 80ms,
            transform 0.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) 80ms;
        }
        .button-box {
          display: flex;
          position: absolute;
          top: 0;
          left: 0;
        }
        .button-elem {
          display: block;
          width: 20px;
          height: 20px;
          margin: 17px 18px 0 18px;
          fill: none;
          stroke: #fff;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .button:hover .button-box,
        .button:focus .button-box {
          transition: 0.4s;
          transform: translateX(-56px);
        }
      `}</style>

      <div className="dashboard-bg"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <h1 className="text-2xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-red-500 via-orange-400 to-orange-500 bg-clip-text text-transparent">
            GitHub Connector
          </span>
        </h1>

        <div className="mb-4">
          <button onClick={handleBackButton} className="button" aria-label="Back to Providers">
            <span className="button-box">
              <svg className="button-elem" viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </span>
          </button>
        </div>

       <div className="flex flex-col sm:flex-row justify-center gap-6 mt-6 mb-6">
  {/* CloudMasa-Tech Account Button */}
  <button
    onClick={switchToDefaultMode}
    className={`px-6 py-3 rounded-md flex items-center gap-2 transition-all duration-200 ${
      mode === "default"
        ? "bg-gradient blue-400  text-white  scale-105"
        : "bg-[#1e293b] border border-gray-700 text-gray-200 hover:bg-[#2d3748]"
    }`}
  >
    <FaCloud /> CloudMaSa-Tech Account
  </button>

  {/* Client Account Button */}
  <button
    onClick={switchToOwnMode}
    className={`px-6 py-3 rounded-md flex items-center gap-2 transition-all duration-200 ${
      mode === "own"
        ? "bg-gradient orange-500  text-white  scale-105"
        : "bg-[#1e293b] border border-gray-700 text-gray-200 hover:bg-[#2d3748]"
    }`}
  >
    <HiOutlineLockClosed />
    <span className="text-orange-400 font-medium">Client Account</span>
  </button>
</div>

        {mode && (
          <div className="mt-4 bg-[#1e293b]/80 backdrop-blur border border-blue-900/50 rounded-lg shadow-lg p-6">
            {mode === "default" && (
              <div className="mt-6">
                <button onClick={handleDefaultConnect} className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-md flex items-center gap-2">
                  <FaGithub /> Fetch Repositories
                </button>
              </div>
            )}

            {mode === "own" && (
              <form onSubmit={handleOwnConnect} className="space-y-4 mt-6">
                <div>
                  <label className="block text-gray-200 mb-1">GitHub Personal Access Token</label>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Enter your GitHub token"
                    className="w-full p-2 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-[#0f172a] text-white"
                  />
                </div>
                {githubLogin && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-green-400 text-sm font-medium">✅ Connected as</span>
                    <span className="bg-gradient-to-r from-orange-500 via-red-500 to-red-600 text-white text-sm font-bold px-2 py-1 rounded">
                      @{githubLogin}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-2 rounded-md flex items-center gap-2">
                    <FaGithub /> Connect
                  </button>
                </div>
              </form>
            )}

            {repos.length > 0 && (
              <div className="mt-6">
                <label className="block text-gray-200 mb-2">Select Repository</label>
                <select onChange={(e) => fetchFolders(e.target.value)} value={selectedRepo} className="w-full p-2 border border-gray-600 bg-[#0f172a] text-white rounded-md">
                  <option value="">-- Select Repository --</option>
                  {repos.map((repo, idx) => (
                    <option key={idx} value={repo.fullName}>{repo.fullName}</option>
                  ))}
                </select>

                {selectedRepo && !selectedFolder && (
                  <div className="mt-3">
                    <button onClick={saveRepoAndAllFolders} className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
                      <FaSave /> Save Repository Only
                    </button>
                  </div>
                )}

                {folders.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-gray-200 mb-2">Select Folder</label>
                    <select onChange={(e) => setSelectedFolder(e.target.value)} value={selectedFolder} className="w-full p-2 border border-gray-600 bg-[#0f172a] text-white rounded-md">
                      <option value="">-- Select Folder --</option>
                      {folders.map((f, idx) => (
                        <option key={idx} value={f.path}>{f.name}</option>
                      ))}
                    </select>

                    {loadingFolders && <div className="mt-4 text-orange-400">🔍 Loading folders...</div>}

                    {selectedRepo && selectedFolder && (
                      <div className="mt-4">
                        <button onClick={saveFolderOnly} className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-6 py-3 rounded-md flex items-center gap-2 w-full">
                          <FaSave /> Save Folder
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Live Repository Preview */}
        <div className="bg-[#1e293b]/80 backdrop-blur border border-gray-700 rounded-lg shadow mt-8">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold"><span className="red-orange-gradient-text">Live Repository Preview</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                <tr>
                  <th className="p-3">Repository</th>
                  <th className="p-3">Folder Path</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Sync</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedRepo && selectedFolder ? (
                  <tr className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="p-3">{selectedRepo}</td>
                    <td className="p-3 text-green-400">{selectedFolder}</td>
                    <td className="p-3">
                      <span className="bg-green-900/50 text-green-300 px-2 py-1 rounded text-xs">Connected</span>
                    </td>
                    <td className="p-3">{new Date().toLocaleString()}</td>
                    <td className="p-3">
                      <a
                        href={`https://github.com/${selectedRepo}/tree/main/${encodeURIComponent(selectedFolder)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-500 italic">
                      Select a repository and folder to see live preview.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Saved Connections */}
        <div className="bg-[#1e293b]/80 backdrop-blur border border-gray-700 rounded-lg shadow mt-8">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-2xl font-bold"><span className="red-orange-gradient-text">Saved Connections</span></h2>
            {savedConnections.length > 0 && (
              <button onClick={clearConnections} className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-2">
                <FaTrash /> Clear
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                <tr>
                  <th className="p-3">Connection Name</th>
                  <th className="p-3">Repository</th>
                  <th className="p-3">Account Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Sync</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedConnections.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-gray-500 italic">
                      No saved connections yet.
                    </td>
                  </tr>
                ) : (
                  savedConnections.map((conn) => (
                    <tr key={`${conn._id}-${conn.name}`} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="p-3">{conn.name}</td>
                      <td className="p-3">{conn.repo}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          conn.accountType === "CloudMasa Tech"
                            ? "bg-blue-900/50 text-blue-300"
                            : "bg-orange-900/50 text-orange-300 red-orange-gradient-text"
                        }`}>
                          {conn.accountType}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="bg-green-900/50 text-green-300 px-2 py-1 rounded text-xs">
                          {conn.status}
                        </span>
                      </td>
                      <td className="p-3">{new Date(conn.lastSync).toLocaleString()}</td>
                      <td className="p-3">
                        {conn.folder ? (
                          <a href={conn.folder} target="_blank" rel="noopener noreferrer" className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                            Open
                          </a>
                        ) : (
                          <span className="text-gray-500 italic">No folder</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default GitHubConnector;
