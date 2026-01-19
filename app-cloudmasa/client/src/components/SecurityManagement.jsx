// src/components/SecurityManagement.jsx
import React, { useState } from "react";
import { Plus, Search, EyeOff, RotateCcw, Trash2, MoreVertical } from "lucide-react";

const SecurityManagement = () => {
  const [secrets, setSecrets] = useState([
    {
      id: "db-pwd-01",
      name: "database-password",
      path: "secret/production/db",
      type: "Password",
      lastAccessed: "5 mins ago",
      accessCount: 142,
      status: "Active",
    },
    {
      id: "api-key-02",
      name: "api-key-stripe",
      path: "secret/production/payment",
      type: "Api-Key",
      lastAccessed: "1 hour ago",
      accessCount: 89,
      status: "Active",
    },
    {
      id: "aws-key-03",
      name: "aws-access-key",
      path: "secret/production/aws",
      type: "Access-Key",
      lastAccessed: "3 hours ago",
      accessCount: 234,
      status: "Active",
    },
    {
      id: "jwt-sec-04",
      name: "jwt-secret",
      path: "secret/production/auth",
      type: "Token",
      lastAccessed: "2 days ago",
      accessCount: 567,
      status: "Expiring",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const filteredSecrets = secrets.filter((secret) => {
    const matchesSearch =
      secret.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      secret.path.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || secret.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddSecret = () => {
    alert("🔐 Add Secret Form will open here!");
  };

  const handleRotate = (id) => {
    alert(`🔄 Rotating secret: ${secrets.find(s => s.id === id)?.name}`);
  };

  const handleRevoke = (id) => {
    if (window.confirm("⚠️ Revoke this secret? It cannot be recovered.")) {
      setSecrets(secrets.filter(s => s.id !== id));
    }
  };

  return (
    <>
      {/* Global Styles */}
      <style jsx global>{`
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

        .card-glow {
          box-shadow: 0 4px 20px rgba(56, 189, 248, 0.08), 
                      0 0 15px rgba(56, 189, 248, 0.05);
          transition: box-shadow 0.3s ease;
        }
        .card-glow:hover {
          box-shadow: 0 6px 25px rgba(56, 189, 248, 0.12), 
                      0 0 20px rgba(56, 189, 248, 0.08);
        }

        .text-peacock-400 { color: #38bdf8; }
        .text-peacock-500 { color: #60a5fa; }
        .text-peacock-300 { color: #7dd3fc; }
        .text-gray-300 { color: #d1d5db; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>

      <div className="dashboard-root">
        <div className="grid-overlay" />
        <div className="animated-gradient" />

        {/* Floating Particles */}
        {[
          { top: "10%", left: "5%", delay: "0s" },
          { top: "25%", left: "85%", delay: "4s" },
          { top: "65%", left: "18%", delay: "8s" },
          { top: "82%", left: "75%", delay: "12s" },
        ].map((p, i) => (
          <div
            key={i}
            className="floating-particle"
            style={{
              top: p.top,
              left: p.left,
              width: "3px",
              height: "3px",
              background: "rgba(56, 189, 248, 0.5)",
              boxShadow: "0 0 10px rgba(56, 189, 248, 0.5)",
              animation: `float 40s infinite ease-in-out`,
              animationDelay: p.delay,
            }}
          />
        ))}

        <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            {/* Glass Header Card */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 mb-8 card-glow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-peacock-400"
                    >
                      <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.78 0l-8-4a2 2 0 0 1-1.11-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z" />
                      <polyline points="2.32 6.16 12 11 21.68 6.16" />
                      <line x1="12" y1="23" x2="12" y2="11" />
                    </svg>
                    Vault Secrets
                  </h1>
                  <p className="text-gray-400 mt-1">
                    Securely store and manage secrets, keys, and credentials.
                  </p>
                </div>
                <button
                  onClick={handleAddSecret}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/30"
                >
                  <Plus size={16} />
                  Add Secret
                </button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search secrets by name or path..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Expiring">Expiring</option>
                </select>
              </div>
            </div>

            {/* Secrets Table — Glass Card */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-xl card-glow animate-fadeIn">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="p-4 font-medium text-gray-300">Name</th>
                      <th className="p-4 font-medium text-gray-300">Path</th>
                      <th className="p-4 font-medium text-gray-300">Type</th>
                      <th className="p-4 font-medium text-gray-300">Last Accessed</th>
                      <th className="p-4 font-medium text-gray-300">Status</th>
                      <th className="p-4 font-medium text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSecrets.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-400">
                          🔍 No secrets match your search or filter.
                        </td>
                      </tr>
                    ) : (
                      filteredSecrets.map((secret) => (
                        <tr
                          key={secret.id}
                          className="border-t border-white/5 hover:bg-white/3 transition-colors group"
                        >
                          <td className="p-4 font-medium text-white">{secret.name}</td>
                          <td className="p-4 text-gray-300 text-sm">{secret.path}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-blue-900/40 text-blue-300 text-xs rounded-full border border-blue-800/30">
                              {secret.type}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="text-gray-200">{secret.lastAccessed}</div>
                            <div className="text-xs text-gray-400">{secret.accessCount} accesses</div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium ${
                                secret.status === "Active"
                                  ? "bg-green-900/40 text-green-300 border border-green-800/30"
                                  : "bg-yellow-900/40 text-yellow-300 border border-yellow-800/30"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {secret.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleRotate(secret.id)}
                                title="Rotate Secret"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 transition-colors"
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button
                                onClick={() => handleRevoke(secret.id)}
                                title="Revoke Secret"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors"
                              >
                                <EyeOff size={14} />
                              </button>
                              <button
                                title="More Actions"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 transition-colors"
                              >
                                <MoreVertical size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vault Status — Modern Glass Cards */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-5 card-glow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-900/30 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-white">Vault Status</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Connection</span>
                    <span className="text-green-400 font-medium">Healthy ✅</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Encryption</span>
                    <span className="text-peacock-300">AES-256-GCM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Backup</span>
                    <span className="text-gray-300">2 hours ago</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/5 mt-2">
                    <span className="text-gray-400">Total Secrets</span>
                    <span className="text-white font-medium">{secrets.length}</span>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-5 card-glow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-cyan-900/30 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-cyan-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-white">Security Summary</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Secrets</span>
                    <span className="text-green-400">{secrets.filter(s => s.status === "Active").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expiring Soon</span>
                    <span className="text-yellow-400">{secrets.filter(s => s.status === "Expiring").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg. Access/Day</span>
                    <span className="text-peacock-300">~218</span>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-5 card-glow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-900/30 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-orange-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-white">Quick Actions</h3>
                </div>
                <div className="space-y-3">
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <RotateCcw size={16} />
                    Rotate All Keys
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <EyeOff size={16} />
                    Revoke Unused Secrets
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <Trash2 size={16} />
                    Audit Log Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SecurityManagement;
