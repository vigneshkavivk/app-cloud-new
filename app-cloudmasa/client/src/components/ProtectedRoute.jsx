// src/components/ProtectedRoute.js
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * 🔒 Fallback Auth Checker (uses localStorage if hook fails)
 * Handles both full user objects and token-only (e.g., Google SSO)
 */
const getAuthFallback = () => {
  try {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    // ✅ Google SSO case: token exists but no full user object yet
    if (token && !userStr) {
      return {
        isAuthenticated: true,
        role: "guest", // temporary until /profile loads
        token
      };
    }

    if (!userStr) {
      return { isAuthenticated: false, role: null, token: null };
    }

    const user = JSON.parse(userStr);
    return {
      isAuthenticated: !!user?.token,
      role: user?.role || null,
      token: user?.token || null
    };
  } catch (err) {
    console.warn("Failed to parse auth from localStorage:", err);
    return { isAuthenticated: false, role: null, token: null };
  }
};

/**
 * 🧠 Route Persistence Hook
 * Saves last visited route for authenticated users (excluding auth pages)
 */
const useRoutePersistence = (locationPath) => {
  React.useEffect(() => {
    // Save current route on every change
    localStorage.setItem('lastVisitedRoute', locationPath);
  }, [locationPath]);

  React.useEffect(() => {
    // On mount, restore route if needed
    const lastRoute = localStorage.getItem('lastVisitedRoute');
    if (
      lastRoute &&
      !['/', '/login', '/register'].includes(locationPath) &&
      !locationPath.startsWith('/dashboard/') &&
      !locationPath.startsWith('/clusters/create')
    ) {
      const currentPathWithoutQuery = locationPath.split('?')[0];
      const lastRouteWithoutQuery = lastRoute.split('?')[0];
      if (currentPathWithoutQuery !== lastRouteWithoutQuery) {
        window.location.href = lastRoute; // Full reload to bypass router cache
      }
    }
  }, [locationPath]);
};

/**
 * 🛡️ Option 1: Basic Authentication Protection (Default Export)
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  let isAuthenticated = false;
  let fallbackUsed = false;

  try {
    const { isAuthenticated: authStatus } = useAuth();
    isAuthenticated = authStatus;
  } catch (err) {
    const fallback = getAuthFallback();
    isAuthenticated = fallback.isAuthenticated;
    fallbackUsed = true;
    if (process.env.NODE_ENV === 'development') {
      console.warn("ProtectedRoute: useAuth() failed. Using localStorage fallback.");
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Enable route persistence for authenticated users
  useRoutePersistence(location.pathname + location.search);

  return <>{children}</>;
};

/**
 * 🔑 Option 2: Permission-Based Protection (Recommended)
 */
const PermissionProtectedRoute = ({ children, permission }) => {
  let isAuthenticated = false;
  let hasAccess = false;
  let fallbackUsed = false;

  try {
    const { isAuthenticated: authStatus, hasPermission } = useAuth();
    isAuthenticated = authStatus;
    if (isAuthenticated && permission) {
      const [resource, action] = permission.split('.');
      hasAccess = hasPermission(resource, action);
    } else if (isAuthenticated) {
      hasAccess = true;
    }
  } catch (err) {
    const fallback = getAuthFallback();
    isAuthenticated = fallback.isAuthenticated;
    fallbackUsed = true;
    if (isAuthenticated) {
      hasAccess = fallback.role === 'super-admin' || !permission;
    }
    if (process.env.NODE_ENV === 'development') {
      console.warn("PermissionProtectedRoute: useAuth() failed. Using fallback (super-admin only).");
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (permission && !hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

/**
 * 👑 Option 3: Role-Based Protection (Exact Match)
 */
const RoleProtectedRoute = ({ children, requiredRole }) => {
  let isAuthenticated = false;
  let userRole = null;
  let fallbackUsed = false;

  try {
    const { isAuthenticated: authStatus, role } = useAuth();
    isAuthenticated = authStatus;
    userRole = role;
  } catch (err) {
    const fallback = getAuthFallback();
    isAuthenticated = fallback.isAuthenticated;
    userRole = fallback.role;
    fallbackUsed = true;
    if (process.env.NODE_ENV === 'development') {
      console.warn("RoleProtectedRoute: useAuth() failed. Using localStorage fallback.");
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

/**
 * 🧩 Option 4: Custom Protection (Dynamic Logic)
 */
const CustomProtectedRoute = ({ children, check }) => {
  let isAuthenticated = false;
  let fallbackUsed = false;

  try {
    const { isAuthenticated: authStatus } = useAuth();
    isAuthenticated = authStatus;
  } catch (err) {
    const fallback = getAuthFallback();
    isAuthenticated = fallback.isAuthenticated;
    fallbackUsed = true;
    if (process.env.NODE_ENV === 'development') {
      console.warn("CustomProtectedRoute: useAuth() failed. Using localStorage fallback.");
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (check && typeof check === 'function' && !check()) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

/**
 * 🚨 Inline Access Denied Component
 */
export const NoAccessComponent = ({ requiredPermission = "N/A" }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center p-6 max-w-md bg-gray-800 rounded-lg border border-gray-700">
        <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
        <p className="text-gray-300">
          You need the <span className="font-mono">{requiredPermission}</span> permission.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

// 📚 Usage Examples (commented out – for reference only)
/*
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
<Route path="/deploy" element={<PermissionProtectedRoute permission="Job.Create"><DeployPage /></PermissionProtectedRoute>} />
<Route path="/policies" element={<RoleProtectedRoute requiredRole="super-admin"><Policies /></RoleProtectedRoute>} />
<Route path="/internal" element={<CustomProtectedRoute check={() => org === 'CloudMasa'}><InternalTools /></CustomProtectedRoute>} />
*/

// 🔥 Export
export default ProtectedRoute;
export {
  PermissionProtectedRoute,
  RoleProtectedRoute,
  CustomProtectedRoute,
};
