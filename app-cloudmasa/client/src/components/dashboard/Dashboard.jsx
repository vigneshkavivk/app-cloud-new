// src/components/dashboard/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import api from "../../interceptor/api.interceptor";
import AwsData from "./AwsData";
import AzureData from "./AzureData";
import GcpData from "./GcpData";

const Dashboard = () => {
  const [selectedProvider, setSelectedProvider] = useState("aws");
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [awsAccounts, setAwsAccounts] = useState([]);
  const [azureAccounts, setAzureAccounts] = useState([]);
  const [gcpAccounts, setGcpAccounts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("—");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const particlesRef = useRef([]);

  // Generate floating particles on mount
  useEffect(() => {
    const container = document.querySelector('.dashboard-root');
    if (!container) return;

    const particleCount = 10;
    const newParticles = [];

    for (let i = 0; i < particleCount; i++) {
      const size = Math.random() * 40 + 20; // 10px to 50px
      const particle = document.createElement('div');
      particle.className = 'floating-particle';
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDuration = `${12 + Math.random() * 10}s`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      particle.style.opacity = String(0.08 + Math.random() * 0.25);

      container.appendChild(particle);
      newParticles.push(particle);
    }

    particlesRef.current = newParticles;

    return () => {
      // Clean up particles on unmount
      newParticles.forEach(p => p.remove());
    };
  }, []);

  // Fetch accounts once on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const [aws, azure, gcp] = await Promise.all([
          api.get("/api/aws/get-aws-accounts").catch(() => ({ data: [] })),
          api.get("/api/azure/accounts").catch(() => ({ data: [] })),
          api.get("/api/gcp/accounts").catch(() => ({ data: [] })),
        ]);
        setAwsAccounts(aws.data || []);
        setAzureAccounts(azure.data || []);
        setGcpAccounts(gcp.data || []);

        if (aws.data?.length > 0) {
          setSelectedAccountId(aws.data[0]._id);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error("Failed to load accounts:", err);
      }
    };
    loadAccounts();
  }, []);

  const fetchAccounts = async () => {
    const [aws, azure, gcp] = await Promise.all([
      api.get("/api/aws/get-aws-accounts").catch(() => ({ data: [] })),
      api.get("/api/azure/accounts").catch(() => ({ data: [] })),
      api.get("/api/gcp/accounts").catch(() => ({ data: [] })),
    ]);
    setAwsAccounts(aws.data || []);
    setAzureAccounts(azure.data || []);
    setGcpAccounts(gcp.data || []);
  };

  const refreshData = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setLastUpdated("Refreshing...");

    try {
      await fetchAccounts();

      if (selectedProvider === "aws" && selectedAccountId) {
        setSelectedAccountId(prev => prev);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Refresh failed:", err);
      setLastUpdated("Refresh failed");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const getAccountInfoString = () => {
    if (selectedProvider === "aws") {
      const acc = awsAccounts.find(a => a._id === selectedAccountId);
      return acc ? `Amazon Web Services • ${acc.accountName} • ${acc.awsRegion}` : "";
    }
    return "";
  };

  const getProviderDisplayName = (p) => ({ aws: "AWS Cloud", azure: "Azure Cloud", gcp: "GCP Cloud" }[p] || "Unknown");

  return (
    <>
      {/* ✅ Your Custom Global Styles */}
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
          z-index: -1;
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

      {/* Background layers */}
      <div className="grid-overlay"></div>
      <div className="animated-gradient"></div>

      {/* Main content wrapped in styled root */}
      <div className="dashboard-root">
        <div className="p-6 lg:ml-64">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">                
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{getProviderDisplayName(selectedProvider)}</h1>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    Connected
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-2">{getAccountInfoString()}</p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    setSelectedAccountId(null);
                  }}
                  className="bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-sm text-white min-w-[100px]"
                >
                  <option value="aws">AWS</option>
                  <option value="azure">Azure</option>
                  <option value="gcp">GCP</option>
                </select>

                <select
                  value={selectedAccountId || ""}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-sm text-white min-w-[180px]"
                  disabled={
                    (selectedProvider === "aws" && !awsAccounts.length) ||
                    (selectedProvider === "azure" && !azureAccounts.length) ||
                    (selectedProvider === "gcp" && !gcpAccounts.length)
                  }
                >
                  <option value="" disabled>Select account...</option>
                  {selectedProvider === "aws" &&
                    awsAccounts.map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.accountName} ({acc.accountId.slice(-6)})
                      </option>
                    ))}
                  {selectedProvider === "azure" &&
                    azureAccounts.map(acc => (
                      <option key={acc.subscriptionId} value={acc.subscriptionId}>
                        {acc.accountName} ({acc.subscriptionId.slice(-6)})
                      </option>
                    ))}
                  {selectedProvider === "gcp" &&
                    gcpAccounts.map(acc => (
                      <option key={acc.projectId} value={acc.projectId}>
                        {acc.projectName} ({acc.projectId})
                      </option>
                    ))}
                </select>

                <button
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-all ${
                    isRefreshing
                      ? "bg-gray-700 cursor-not-allowed"
                      : "bg-gray-800 hover:bg-orange-800 hover:text-white"
                  }`}
                >
                  {isRefreshing ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Refresh
                    </>
                  )}
                </button>
              </div>

              <p className="text-sm text-gray-400 text-right mt-1">
                Last synced: {lastUpdated}
              </p>
            </div>
          </div>

          <hr className="border-t border-gray-700 my-4" />

{selectedProvider === "aws" && (
  <AwsData
    selectedAccountId={selectedAccountId}
    accounts={awsAccounts}
    onRefresh={refreshData}
  />
)}
{selectedProvider === "azure" && (
  <AzureData
    selectedAccountId={selectedAccountId}
    accounts={azureAccounts}
    onRefresh={refreshData}
  />
)}
{selectedProvider === "gcp" && (
  <GcpData
    selectedAccountId={selectedAccountId}
    accounts={gcpAccounts}
    onRefresh={refreshData}
  />
)}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
