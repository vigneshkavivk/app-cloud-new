// src/App.jsx
import React from "react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/Login";
import Register from "./components/Regsiteration"; 

// 👇 NEW: Import the three new cluster creation pages
import AddAwsCluster from "./components/addClusters/AddAwsCluster";
import AddAzureCluster from "./components/addClusters/AddAzureCluster";
import AddGcpCluster from "./components/addClusters/AddGcpCluster";

// Existing cluster list pages (for viewing)
import ClustersPage from "./components/clusters/ClustersPage";
import AwsClustersPage from "./components/clusters/AwsClustersPage";      
import AzureClustersPage from "./components/clusters/AzureClustersPage"; 
import GcpClustersPage from "./components/clusters/GcpClustersPage";     

// Other pages...
import NotificationsPage from "./components/NotificationsPage";
import ClusterConfigPage from "./components/ClusterConfigPage";
import AuthCallback from "./components/AuthCallback";

// Sidebar Layout Pages
import Sidebar from "./components/Sidebar";
import ActiveClusterPage from "./components/activecluster";
import Executer from "./components/Executer";
import CloudConnector from "./components/CloudConnect/CloudConnector";
import AccountDetailsPage from './components/AccountDetails/AccountDetailsPage';
import SCMConnector from "./components/SCMconnect/SCMConnector"; 
import ControlCenter from "./components/ControlCenter";
import Dashboard from "./components/DashBoard";
import Workspace from "./components/WorkSpace";
import ToolsUI from "./components/ToolsUI";
import GitLabInfo from "./components/GittLAbInfo";
import DatabaseCards from "./components/Database";
import MCPBot from './components/MCPBot';
import Workflow from "./components/workflow/CloudWorkflow";
import Policies from './components/Policies';
import SecurityManagement from "./components/SecurityManagement";

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
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/clusters/create/aws"
          element={
            <ProtectedRoute>
              <AddAwsCluster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clusters/create/azure"
          element={
            <ProtectedRoute>
              <AddAzureCluster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clusters/create/gcp"
          element={
            <ProtectedRoute>
              <AddGcpCluster />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sidebar/*"
          element={
            <ProtectedRoute>
              <Sidebar />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="activecluster" element={<ActiveClusterPage />} />
          <Route path="executer" element={<Executer />} />
          <Route path="work-space" element={<Workspace />} />
          <Route path="cloud-connector" element={<CloudConnector />} />
          <Route path="cloud-connector/account/:id" element={<AccountDetailsPage />} />
          <Route path="control-center" element={<ControlCenter />} />
          <Route path="scm-connector" element={<SCMConnector />} />
          <Route path="toolsUI" element={<ToolsUI />} />
          <Route path="toolsUI/gitlab" element={<GitLabInfo />} />
          <Route path="dash-board" element={<Dashboard />} />
          <Route path="database" element={<DatabaseCards />} />
          <Route path="work-flow/*" element={<Workflow />} />
          <Route path="mcp-bot" element={<MCPBot />} />
          <Route path="clusters" element={<ClustersPage />} />
          <Route path="clusters/aws" element={<AwsClustersPage />} />
          <Route path="clusters/azure" element={<AzureClustersPage />} />
          <Route path="clusters/gcp" element={<GcpClustersPage />} />
          <Route path="clusters/create/aws" element={<AddAwsCluster />} />
          <Route path="clusters/create/azure" element={<AddAzureCluster />} />
          <Route path="clusters/create/gcp" element={<AddGcpCluster />} />
          <Route path="clusters/:id/config" element={<ClusterConfigPage />} />
          <Route path="policies" element={<Policies />} />
          <Route path="security-management" element={<SecurityManagement />} />
        </Route>

        <Route path="/dashboard/grafana" element={<GrafanaDashboard />} />
        <Route path="/dashboard/prometheus" element={<PrometheusDashboard />} />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <div className="p-8 text-center text-white bg-red-900">
              <h1>404 - Page Not Found</h1>
              <p>The page you're looking for doesn't exist.</p>
            </div>
          }
        />
      </Routes>
    </>
  );
}

export default App;
