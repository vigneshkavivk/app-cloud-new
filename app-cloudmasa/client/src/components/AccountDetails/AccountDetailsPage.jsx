// src/components/accountdetails/AccountDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../interceptor/api.interceptor';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ChevronLeft } from 'lucide-react';

// Lazy-load provider-specific components
// ✅ CORRECT
const AWSAccountDetails = React.lazy(() => import('../AccountDetails/AWSAccountDetails'));
const GCPAccountDetails = React.lazy(() => import('../AccountDetails/GCPAccountDetails'));
const AzureAccountDetails = React.lazy(() => import('../AccountDetails/AzureAccountDetails'));

const AccountDetailsPage = () => {
  const { id } = useParams();
  console.log('Account ID from URL:', id);
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useAuth();
  const canView = hasPermission('Credentials', 'View');

  useEffect(() => {
    if (!canView) {
      toast.error("You don't have permission to view this account.");
      navigate('/sidebar/cloud-connector');
      return;
    }

    const fetchAccount = async () => {
      try {
        const res = await api.get(`/api/account/${id}`);
        if (!res.data?.cloudProvider) throw new Error('Invalid account');
        setAccount(res.data);
      } catch (err) {
        console.error('Failed to fetch account:', err);
        toast.error('Account not found or access denied.');
        navigate('/sidebar/cloud-connector');
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [id, navigate, canView]);

  // Floating particles config (light peacock blue tones)
  const particles = [
    { top: '10%', left: '5%', color: 'rgba(56, 189, 248, 0.5)', delay: '0s' },
    { top: '25%', left: '85%', color: 'rgba(96, 165, 250, 0.5)', delay: '4s' },
    { top: '65%', left: '18%', color: 'rgba(125, 211, 252, 0.5)', delay: '8s' },
    { top: '82%', left: '75%', color: 'rgba(56, 189, 248, 0.55)', delay: '12s' },
  ];

  if (loading) {
    return (
      <div className="dashboard-root relative min-h-screen flex items-center justify-center">
        <div className="grid-overlay" />
        <div className="animated-gradient" />
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div>
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
      </div>
    );
  }

  const renderDetails = () => {
    switch (account.cloudProvider) {
      case 'AWS':
        return <AWSAccountDetails accountId={id} account={account} />;
      case 'GCP':
        return <GCPAccountDetails accountId={id} account={account} />;
      case 'Azure':
        return <AzureAccountDetails accountId={id} account={account} />;
      default:
        return (
          <div className="p-6 text-center text-gray-400">
            Unsupported cloud provider: {account.cloudProvider}
          </div>
        );
    }
  };

  return (
    <div className="dashboard-root relative min-h-screen">
      {/* Background Elements */}
      <div className="grid-overlay" />
      <div className="animated-gradient" />

      {/* Floating Particles */}
      {particles.map((p, i) => (
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
            animation: 'float 40s infinite ease-in-out',
            animationDelay: p.delay,
          }}
        />
      ))}

      <ToastContainer position="top-right" autoClose={4000} theme="colored" />

      {/* Main Content Container — matches your Workspace layout */}
      <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:ml-64">
        <div className="max-w-7xl mx-auto">
          {/* Provider-Specific Details */}
          <React.Suspense fallback={
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500 mx-auto"></div>
            </div>
          }>
            {renderDetails()}
          </React.Suspense>
        </div>
      </div>

      {/* Embedded Styles */}
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

        .text-peacock-400 { color: #38bdf8; }
        .text-peacock-500 { color: #60a5fa; }
        .text-peacock-300 { color: #7dd3fc; }
        .text-gray-300 { color: #d1d5db; }
      `}</style>
    </div>
  );
};

export default AccountDetailsPage;
