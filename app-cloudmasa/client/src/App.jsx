// src/App.jsx
import React from "react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/Login";
import AuthCallback from "./components/AuthCallback";
import Register from "./components/Regsiteration"; // Note: typo in filename ("Regsiteration") — consider renaming to "Registration"

// Cluster Creation Pages (under sidebar)
import AddAwsCluster from "./components/addClusters/AddAwsCluster";
import AddAzureCluster from "./components/addClusters/AddAzureCluster";
import AddGcpCluster from "./components/addClusters/AddGcpCluster";

// Cluster List Pages
import ClustersPage from "./components/clusters/ClustersPage";
import AwsClustersPage from "./components/clusters/AwsClustersPage";
import AzureClustersPage from "./components/clusters/AzureClustersPage";
import GcpClustersPage from "./components/clusters/GcpClustersPage";


// Other Pages
import NotificationsPage from "./components/NotificationsPage";
import ClusterConfigPage from "./components/ClusterConfigPage";

// Sidebar Layout
import Sidebar from "./components/Sidebar";
import ActiveClusterPage from "./components/activecluster";
import Executer from "./components/Executer";
import CloudConnector from "./components/CloudConnect/CloudConnector";
import AccountDetailsPage from "./components/AccountDetails/AccountDetailsPage";
import SCMConnector from "./components/SCMconnect/SCMConnector";
import ControlCenter from "./components/ControlCenter";
import Dashboard from "./components/dashboard/Dashboard"; // ✅ Updated path to match new structure
import Workspace from "./components/WorkSpace";
import ToolsUI from "./components/ToolsUI";
import GitLabInfo from "./components/GittLAbInfo"; // Note: typo in "GittLAbInfo"
import DatabaseCards from "./components/Database";
import MCPBot from "./components/MCPBot";
import Workflow from "./components/workflow/CloudWorkflow";
import Policies from "./components/Policies";
import SecurityManagement from "./components/SecurityManagement";
import SupportPage from './components/support/SupportPage';
import TicketDetail from './components/support/TicketDetail'; 
import SupportDashboard from './components/support/SupportDashboard';

// Standalone Dashboards
import GrafanaDashboard from "./Tools/GrafanaDashboard";
import PrometheusDashboard from "./Tools/PrometheusDashboard";

// Floating Help Robot
import HelpdeskRobot from "./components/HelpdeskRobot";

function App() {
  return (
    <>
      <HelpdeskRobot />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
	<Route path="/auth/callback" element={<AuthCallback />} />

        {/* Standalone Tool Dashboards (no sidebar) */}
        <Route path="/dashboard/grafana" element={<GrafanaDashboard />} />
        <Route path="/dashboard/prometheus" element={<PrometheusDashboard />} />

        {/* Protected Routes with Sidebar Layout */}
        <Route
          path="/sidebar/*"
          element={
            <ProtectedRoute>
              <Sidebar />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Dashboard />} />
          <Route path="dash-board" element={<Dashboard />} />

          {/* Core Pages */}
          <Route path="activecluster" element={<ActiveClusterPage />} />
          <Route path="executer" element={<Executer />} />
          <Route path="work-space" element={<Workspace />} />
          <Route path="control-center" element={<ControlCenter />} />
          <Route path="scm-connector" element={<SCMConnector />} />
          <Route path="toolsUI" element={<ToolsUI />} />
          <Route path="toolsUI/gitlab" element={<GitLabInfo />} />
          <Route path="database" element={<DatabaseCards />} />
          <Route path="mcp-bot" element={<MCPBot />} />
          <Route path="policies" element={<Policies />} />
          <Route path="security-management" element={<SecurityManagement />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="support/ticket/:ticketId" element={<TicketDetail />} />
          <Route path="support/dashboard" element={<SupportDashboard />} />

          {/* Cloud & Account Management */}
          <Route path="cloud-connector" element={<CloudConnector />} />
          <Route path="cloud-connector/account/:id" element={<AccountDetailsPage />} />

          {/* Workflow */}
          <Route path="work-flow/*" element={<Workflow />} />

          {/* Clusters - LISTING */}
          <Route path="clusters" element={<ClustersPage />} />
          <Route path="clusters/aws" element={<AwsClustersPage />} />
          <Route path="clusters/azure" element={<AzureClustersPage />} />
          <Route path="clusters/gcp" element={<GcpClustersPage />} />

          {/* Clusters - CREATION (✅ Now correctly nested under /sidebar/) */}
          <Route path="clusters/create/aws" element={<AddAwsCluster />} />
          <Route path="clusters/create/azure" element={<AddAzureCluster />} />
          <Route path="clusters/create/gcp" element={<AddGcpCluster />} />

          {/* Cluster Config */}
          <Route path="clusters/:id/config" element={<ClusterConfigPage />} />
        </Route>

        {/* Notifications (standalone, no sidebar) */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all 404 */}
        <Route
          path="*"
          element={
            <div className="p-8 text-center text-white bg-red-900 min-h-screen">
              <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
              <p>The page you're looking for doesn't exist.</p>
            </div>
          }
        />
      </Routes>
    </>
  );
}

export default App;
