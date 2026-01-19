// src/components/clusters/ClustersPage.jsx
import React from 'react';
import AwsClustersPage from './AwsClustersPage';
import AzureClustersPage from './AzureClustersPage';
import GcpClustersPage from './GcpClustersPage';
import { Tab } from '@headlessui/react';

const ClustersPage = () => {
  const providers = ['AWS Cloud', 'Azure Cloud', 'Google Cloud'];

  return (
    <>
      {/* 🌌 Global Styles — Same as Cloud Connector */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        body {
          margin: 0;
          padding: 0;
          background: linear-gradient(125deg, #0a0d1a 0%, #0b0e1c 35%, #0c1020 65%, #0d1124 100%);
          color: #e5e7eb;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow-x: hidden;
        }

        .clusters-page-root {
          min-height: 100vh;
          background:
            radial-gradient(circle at 10% 20%, rgba(30, 58, 138, 0.08) 0%, transparent 30%),
            radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.05) 0%, transparent 40%),
            linear-gradient(125deg, #0a0d1a 0%, #0b0e1c 35%, #0c1020 65%, #0d1124 100%);
          color: #e5e7eb;
          font-family: 'Inter', system-ui, sans-serif;
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
      `}</style>

      {/* ✅ Full-screen background */}
      <div className="clusters-page-root">
        <div className="grid-overlay" />
        <div className="animated-gradient" />

        {/* 🌠 Floating Particles */}
        {[
          { top: '10%', left: '5%', delay: '0s' },
          { top: '25%', left: '85%', delay: '4s' },
          { top: '65%', left: '18%', delay: '8s' },
          { top: '82%', left: '75%', delay: '12s' },
        ].map((p, i) => (
          <div
            key={i}
            className="floating-particle"
            style={{
              top: p.top,
              left: p.left,
              width: '3px',
              height: '3px',
              background: 'rgba(56, 189, 248, 0.5)',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)',
              animation: `float 40s infinite ease-in-out`,
              animationDelay: p.delay,
            }}
          />
        ))}

        {/* ✅ Content Area — offset for sidebar */}
        <div className="min-h-screen p-6 sm:p-6 md:p-4 lg:ml-64">
          <div className="max-w-7xl mx-auto pt-6">
            <Tab.Group defaultIndex={0}>
              <Tab.List className="flex space-x-2 mb-6 border-b border-gray-700">
                {providers.map((provider) => (
                    <Tab
                    key={provider}
                    className={({ selected }) =>
                        `px-4 py-2.5 font-medium rounded-t-lg text-sm transition-colors ${
                        selected
                            ? 'bg-gradient-to-r from-grey-500 to-black-500 text-white'
                            : 'text-gray-400 hover:text-gray-200'
                        }`
                    }
                    >
                    {({ selected }) => (
                        selected ? (
                        <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent font-semibold">
                            {provider}
                        </span>
                        ) : (
                        provider
                        )
                    )}
                    </Tab>
                ))}
                </Tab.List>

              <Tab.Panels>
                <Tab.Panel><AwsClustersPage /></Tab.Panel>
                <Tab.Panel><AzureClustersPage /></Tab.Panel>
                <Tab.Panel><GcpClustersPage /></Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClustersPage;
