// src/components/SCMConnector.jsx
"use client";
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaGithub,
  FaGitlab,
  FaBitbucket,
} from "react-icons/fa";

// Import dedicated connectors — no change needed
import GitHubConnector from "./GitHubConnector";
import GitLabConnector from "./GitLabConnector";
import BitbucketConnector from "./BitbucketConnector";

// Providers (unchanged — only used for UI)
const providers = [
  {
    id: "github",
    name: "GitHub",
    icon: <FaGithub size={32} className="text-white" />,
    color: "border-[#24292F]",
    bg: "bg-[#1c2128]",
    hoverBg: "hover:bg-gradient-to-r hover:from-[#161b22] hover:to-[#24292f]",
    textColor: "text-white",
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: <FaGitlab size={32} className="text-[#FC6D26]" />,
    color: "border-[#FC6D26]",
    bg: "bg-[#1c2128]",
    hoverBg: "hover:bg-gradient-to-r hover:from-[#2A1A15] hover:to-[#3A2818]",
    textColor: "text-[#FC6D26]",
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    icon: <FaBitbucket size={32} className="text-[#0052CC]" />,
    color: "border-[#0052CC]",
    bg: "bg-[#1c2128]",
    hoverBg: "hover:bg-gradient-to-r hover:from-[#1A1F2F] hover:to-[#2A3B5F]",
    textColor: "text-[#0052CC]",
  },
];

const SCMConnector = () => {
  const { username } = useOutletContext();
  const [selectedProvider, setSelectedProvider] = useState(null);

  // ✅ Validate user context upfront
  if (!username || typeof username !== "string" || username.trim() === "") {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          .dashboard-root {
            min-height: 100vh;
            background:
              radial-gradient(circle at 10% 20%, rgba(30, 58, 138, 0.08) 0%, transparent 30%),
              radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.05) 0%, transparent 40%),
              linear-gradient(125deg, #0a0d1a 0%, #0b0e1c 35%, #0c1020 65%, #0d1124 100%);
            color: #e5e7eb;
            font-family: 'Inter', sans-serif;
            overflow-x: hidden;
            position: relative;
          }
          .grid-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-image:
              linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
            background-size: 40px 40px;
            pointer-events: none;
            z-index: -2;
          }
          .animated-gradient {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: conic-gradient(from 0deg, #38bdf8, #60a5fa, #7dd3fc, #38bdf8);
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
        `}</style>

        <div className="dashboard-root">
          <div className="grid-overlay" />
          <div className="animated-gradient" />

          <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 lg:ml-64">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white/5 backdrop-blur-lg border border-red-900/30 rounded-xl p-6 text-center">
                <h2 className="text-xl font-bold text-red-400">⚠️ User Session Missing</h2>
                <p className="text-gray-300 mt-2">
                  Please log in again to access SCM connections.
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ✅ Handler to go back to provider selection
  const handleBackToProviders = () => {
    setSelectedProvider(null);
    // Optional: persist state if needed
    localStorage.removeItem('scmSelectedProvider');
  };

  // ✅ Persist/restore selected provider (optional but helpful)
  useEffect(() => {
    const saved = localStorage.getItem('scmSelectedProvider');
    if (saved && providers.some(p => p.id === saved)) {
      setSelectedProvider(saved);
    }
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      localStorage.setItem('scmSelectedProvider', selectedProvider);
    } else {
      localStorage.removeItem('scmSelectedProvider');
    }
  }, [selectedProvider]);

  // ✅ Render selected SCM connector
  const renderProviderComponent = () => {
    switch (selectedProvider) {
      case "github":   return <GitHubConnector onBack={handleBackToProviders} />;
      case "gitlab":   return <GitLabConnector onBack={handleBackToProviders} />;
      case "bitbucket":return <BitbucketConnector onBack={handleBackToProviders} />;
      default: return null;
    }
  };

  return (
    <>
      {/* ✅ Global Dashboard Styles (identical to other pages) */}
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

        /* Optional: Subtle card glow */
        .card-glow {
          box-shadow: 0 4px 20px rgba(56, 189, 248, 0.08), 
                      0 0 15px rgba(56, 189, 248, 0.05);
          transition: box-shadow 0.3s ease;
        }
        .card-glow:hover {
          box-shadow: 0 6px 25px rgba(56, 189, 248, 0.12), 
                      0 0 20px rgba(56, 189, 248, 0.08);
        }

        /* Text colors */
        .text-peacock-400 { color: #38bdf8; }
        .text-peacock-500 { color: #60a5fa; }
        .text-peacock-300 { color: #7dd3fc; }
        .text-gray-300 { color: #d1d5db; }
      `}</style>

      {/* ✅ Dashboard Root Layout */}
      <div className="dashboard-root">
        <div className="grid-overlay" />
        <div className="animated-gradient" />

        {/* Floating Particles — Light Peacock Blue (exact same as others) */}
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

        {/* Main Content */}
        <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              closeOnClick
              pauseOnHover
              theme="colored"
            />

            <h1 className="text-4xl font-bold text-center mb-10">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                SCM Connector
              </span>
            </h1>

            {!selectedProvider ? (
              <div className="mt-6">
                <div className="bg-gradient-to-b from-[#1a1f2b] to-[#151924] backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {providers.map((provider) => (
                      <div
                        key={provider.id}
                        onClick={() => setSelectedProvider(provider.id)}
                        className={`cursor-pointer p-6 ${provider.bg} ${provider.hoverBg} rounded-xl shadow-lg text-center transition-all duration-300 transform hover:-translate-y-1.5 group ${
                          provider.id === "github" ? `border-2 ${provider.color}` : "border border-white/5"
                        } hover:shadow-2xl`}
                      >
                        <div className="flex justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                          {provider.icon}
                        </div>
                        <h2 className={`text-xl font-semibold ${provider.textColor} group-hover:text-white`}>
                          {provider.name}
                        </h2>
                        <p className="mt-2 text-gray-400 text-sm">
                          Connect & manage repositories
                        </p>
                        <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-8 h-0.5 mx-auto bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-b from-[#1a1f2b] to-[#151924] backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl">
                {renderProviderComponent()}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SCMConnector;
