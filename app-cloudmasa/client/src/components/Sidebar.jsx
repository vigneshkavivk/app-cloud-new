// src/components/Sidebar.jsx
import React, { useState, useEffect } from "react";
// Icons
import {
  FaBars,
  FaServer
} from "react-icons/fa";
import { GiNetworkBars } from "react-icons/gi";
import {
  MdDashboard,
  MdBusiness,
  MdLogout,
  MdPolicy,
  MdAutoGraph,
  MdSecurity,
  MdSupportAgent
} from "react-icons/md";
import {
  TbRobot,
  TbCloud,
  TbTool,
  TbDatabase
} from "react-icons/tb";

// Other imports
import { Link, Outlet, useLocation } from "react-router-dom";
import CloudMasaLogo from '../assets/roundmasa.webp';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const location = useLocation();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name || '');
        setUserRole(user.role || 'User');
      } catch (err) {
        console.error("Error parsing user from localStorage", err);
      }
    }
  }, []);

  return (
    <div className="flex h-screen font-sans text-gray-800 dark:text-white relative">
      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden absolute top-4 left-4 z-50 bg-white dark:bg-slate-800 p-2 rounded-md shadow-md"
      >
        <FaBars className="text-black dark:text-white" />
      </button>

      {/* Sidebar — Always dark */}
      <div className={`${isOpen ? "block" : "hidden"} lg:block fixed left-0 top-0 z-40 w-64 h-screen bg-gray-900`}>
        <div className="flex flex-col h-screen w-64 bg-[#0f172a] text-white p-5 shadow-lg overflow-y-auto transition-all duration-300">
          {/* Logo + Title */}
          <div className="flex items-center mb-8">
            <img 
              src={CloudMasaLogo} 
              alt="CloudMaSa Logo"
              className="w-10 h-10 rounded-full mr-3 shadow-md"
            />
            <span className="text-3xl font-bold tracking-tight">
              <span className="text-blue-400">Cloud</span>
              <span className="text-orange-500">MaSa</span>
            </span>
          </div>

          {/* Welcome + Name + Role */}
          {userName && (
            <div className="mb-6 text-center">
              <div className="text-lg font-medium">
                <span className="blue-gradient-text font-semibold">Welcome</span>,{' '}
                <span className="red-orange-gradient-text">{userName}</span>
              </div>
              {userRole && (
                <div className="mt-2">
                  <span className="role-neutral-gradient-text">[{userRole}]</span>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex flex-col gap-3 flex-grow">
            <GradientButtonLink
              to="/sidebar"
              icon={<MdDashboard className="text-sm" />}
              title="Dashboard"
              isActive={location.pathname === '/sidebar'}
            />
            <GradientButtonLink
              to="/sidebar/work-space"
              icon={<MdBusiness className="text-sm" />}
              title="Workspace"
              isActive={location.pathname === '/sidebar/work-space'}
            />
            <GradientButtonLink
              to="/sidebar/cloud-connector"
              icon={<TbCloud className="text-sm" />}
              title="Cloud Connector"
              isActive={location.pathname === '/sidebar/cloud-connector'}
            />
            <GradientButtonLink
              to="/sidebar/clusters"
              icon={<FaServer className="text-base" />}
              title="Clusters"
              isActive={location.pathname === '/sidebar/clusters'}
            />
            {/* ✅ FIXED: Work Flow - Now works properly */}
            <GradientButtonLink
              to="/sidebar/work-flow"
              icon={<MdAutoGraph className="text-base" />}
              title="Work Flow"
              isActive={location.pathname.startsWith('/sidebar/work-flow')}
            />
            <GradientButtonLink
              to="/sidebar/scm-connector"
              icon={<GiNetworkBars className="text-base" />}
              title="SCM Connector"
              isActive={location.pathname === '/sidebar/scm-connector'}
            />
            <GradientButtonLink
              to="/sidebar/toolsUI"
              icon={<TbTool className="text-base" />}
              title="Tools"
              isActive={location.pathname === '/sidebar/toolsUI'}
            />
            <GradientButtonLink
              to="/sidebar/database"
              icon={<TbDatabase className="text-base" />}
              title="Database"
              isActive={location.pathname === '/sidebar/database'}
            />
             {userRole === 'super-admin'  && (
            <GradientButtonLink
                to="/sidebar/policies"
                icon={<MdPolicy className="text-base" />}
                title="Policies"
                isActive={location.pathname === '/sidebar/policies'}
              />
                          )}

            <GradientButtonLink
              to="/sidebar/MaSa-bot"
              icon={<TbRobot className="text-base" />}
              title="MaSa Bot"
              isActive={location.pathname === '/sidebar/MaSa-bot'}
            />
            <GradientButtonLink
              to="/sidebar/security-management"
              icon={<MdSecurity className="text-base" />}
              title="Security Management"
              isActive={location.pathname === '/sidebar/security-management'}
            />

            {userName && (
              <GradientButtonLink
                to="/sidebar/support"
                icon={<MdSupportAgent className="text-base" />}
                title="Support"
                isActive={location.pathname === '/sidebar/support'}
              />
            )}

            {/* ✅ Support Dashboard - Only for 'support' role */}
            {userRole === 'support' && (
              <GradientButtonLink
                to="/sidebar/support/dashboard"
                icon={<MdSupportAgent className="text-base" />}
                title="Support Dashboard"
                isActive={location.pathname === '/sidebar/support/dashboard'}
              />
            )}
          </nav>

          {/* Logout */}
          <div>
            <button
              onClick={handleLogout}
              className="gradient-logout-button w-full py-3 text-sm font-bold"
            >
              <span className="flex items-center justify-center gap-2">
                <MdLogout size={18} />
                <span className="gradient-text">Logout</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 h-screen overflow-y-auto p-4 sm:p-6 bg-gray-900">
        <Outlet context={{ username: userName }} />
      </div>

      {/* Global Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* --- NAV BUTTONS (Blue → Cyan → Blue) --- */
        .gradient-button {
          position: relative;
          padding: 12px 16px;
          font-size: 15px;
          font-weight: 600;
          color: white;
          background: transparent;
          border: none;
          cursor: pointer;
          border-radius: 50px;
          overflow: hidden;
          transition: transform 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          width: 100%;
          text-decoration: none;
          box-sizing: border-box;
          text-align: left;
          gap: 12px;
        }

        .gradient-button:hover {
          transform: scale(1.02);
        }

        .gradient-button::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to right, #60a5fa, #2dd4bf, #3b82f6);
          z-index: -2;
          filter: blur(8px);
          transition: transform 1.5s ease-in-out;
        }

        .gradient-button:hover::before {
          transform: scale(1.05);
        }

        .gradient-button::after {
          content: "";
          position: absolute;
          inset: 2px;
          background: #0f172a;
          border-radius: 48px;
          z-index: -1;
        }

        .gradient-button .gradient-text {
          color: transparent;
          background: linear-gradient(to right, #60a5fa, #2dd4bf, #3b82f6);
          background-clip: text;
          -webkit-background-clip: text;
        }

        .gradient-button:hover .gradient-text {
          animation: hue-rotating 2s linear infinite;
        }

        .gradient-button:active {
          transform: scale(0.99);
        }

        .gradient-button.active {
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
          transform: scale(1.03);
          border: 2px solid rgba(59, 130, 246, 0.4);
        }

        /* --- LOGOUT BUTTON (Red → Orange) --- */
        .gradient-logout-button {
          position: relative;
          padding: 14px 20px;
          font-size: 17px;
          font-weight: 600;
          color: white;
          background: transparent;
          border: none;
          cursor: pointer;
          border-radius: 50px;
          overflow: hidden;
          transition: transform 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          text-decoration: none;
          box-sizing: border-box;
        }

        .gradient-logout-button::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to right, #ef4444, #f59e0b);
          z-index: -2;
          filter: blur(8px);
        }

        .gradient-logout-button .gradient-text {
          color: transparent;
          background: linear-gradient(to right, #ef4444, #f59e0b);
          background-clip: text;
          -webkit-background-clip: text;
        }

        /* --- LOGO & TITLE (Red → Orange) --- */
        .gradient-logo-title {
          color: transparent;
          background: linear-gradient(to right, #ef4444, #f59e0b);
          background-clip: text;
          -webkit-background-clip: text;
          font-weight: bold;
          font-size: 1.875rem;
        }

        /* 🔵 BLUE GRADIENT FOR 'Welcome' */
        .blue-gradient-text {
          background: linear-gradient(to right, #60a5fa, #2dd4bf, #3b82f6);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: bold;
          font-size: 1.125rem;
        }

        /* 🟠 RED–ORANGE GRADIENT FOR USERNAME */
        .red-orange-gradient-text {
          background: linear-gradient(to right, #ef4444, #f59e0b);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: bold;
          font-size: 1.125rem;
        }

        /* ⚪⚪⚪ Grey → White Neutral Gradient for Role — Refined & Subtle */
        .role-neutral-gradient-text {
          background: linear-gradient(
            to right,
            #94a3b8,        /* slate-400 — soft readable grey */
            #cbd5e1,        /* slate-300 — lighter mid-tone */
            #ffffff         /* pure white — clean finish */
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: 600;
          font-size: 0.875rem;
        }

        @keyframes hue-rotating {
          to {
            filter: hue-rotate(360deg);
          }
        }
      `}} />
    </div>
  );
};

const GradientButtonLink = ({ to, icon, title, isActive }) => {
  return (
    <Link to={to} className={`gradient-button ${isActive ? 'active' : ''}`}>
      {React.cloneElement(icon, { size: 20, className: "text-white" })}
      <span className="gradient-text">{title}</span>
    </Link>
  );
};

export default Sidebar;
