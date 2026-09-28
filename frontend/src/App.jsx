import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import StatCard from "./components/StatCard";
import MapPanel from "./components/MapPanel";
import DevicePanel from "./components/DevicePanel";
import ActivityFeed from "./components/ActivityFeed";
import Security from "./pages/Security";
import Settings from "./pages/Settings";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Devices from "./pages/Devices";
import Locations from "./pages/Locations";
import Activity from "./pages/Activity";
import NotFound from "./pages/NotFound";

import {
  getDashboardSummary,
  getLatestLocation,
  getRecentActivity,
  getDashboardDevices,
  getToken,
} from "./services/api";

import { isValidLocation } from "./utils/coordinates";
import { ToastProvider } from "./context/ToastContext";
import "./App.css";


import DeviceDetailModal from "./components/DeviceDetailModal";
import AddDeviceModal from "./components/AddDeviceModal";
import { AlertTriangle, RefreshCw } from "lucide-react";

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [location, setLocation] = useState(null);
  const [devices, setDevices] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchDashboard = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);

      const [
        summaryData,
        locationData,
        devicesData,
        activityData,
      ] = await Promise.all([
        getDashboardSummary(),
        getLatestLocation(),
        getDashboardDevices(),
        getRecentActivity(),
      ]);

      setSummary(summaryData);
      setLocation(isValidLocation(locationData) ? locationData : null);
      setDevices(devicesData);
      setActivity(activityData);
      setError(null);
    } catch (err) {
      console.error("Dashboard loading failed:", err);
      setError("Unable to connect to TRACE-X telemetry backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const runFetch = () => {
      Promise.all([
        getDashboardSummary(),
        getLatestLocation(),
        getDashboardDevices(),
        getRecentActivity(),
      ])
        .then(([summaryData, locationData, devicesData, activityData]) => {
          if (isMounted) {
            setSummary(summaryData);
            setLocation(isValidLocation(locationData) ? locationData : null);
            setDevices(devicesData);
            setActivity(activityData);
            setError(null);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error("Dashboard loading failed:", err);
            setError("Unable to connect to TRACE-X telemetry backend.");
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    };

    // Initial load
    runFetch();

    // Refresh dashboard every 10 seconds
    const refreshInterval = setInterval(runFetch, 10000);

    // Cleanup interval when dashboard unmounts
    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-area">
        <Topbar />

        <section className="dashboard-content">
          <div className="welcome-block">
            <span className="section-label">
              SYSTEM OVERVIEW
            </span>

            <h1>Device Security Command Center</h1>

            <p>
              Monitor your registered devices, locations, and
              security activity.
            </p>
          </div>

          {error && !loading && (
            <div className="app-error-banner" role="alert" style={{ marginBottom: "16px" }}>
              <AlertTriangle size={18} className="app-error-icon" />
              <div className="app-error-text">
                <strong>Backend Telemetry Offline</strong>
                <span>{error}</span>
              </div>
              <button
                type="button"
                className="app-error-retry"
                onClick={() => fetchDashboard(true)}
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          <div className="stats-grid">
            <StatCard
              type="total"
              label="TOTAL DEVICES"
              value={summary?.total_devices ?? "--"}
              meta="Registered devices"
              loading={loading}
            />

            <StatCard
              type="active"
              label="ACTIVE"
              value={summary?.active_devices ?? "--"}
              meta="Devices operational"
              loading={loading}
            />

            <StatCard
              type="lost"
              label="LOST / ALERT"
              value={summary?.lost_devices ?? "--"}
              meta="Requires attention"
              loading={loading}
            />
          </div>

          <div className="command-grid">
            <MapPanel location={location} />

            <DevicePanel
              devices={devices}
              loading={loading}
              onSelectDevice={(device) => setSelectedDevice(device)}
              onAddDevice={() => setIsAddModalOpen(true)}
            />
          </div>

          <ActivityFeed activity={activity} loading={loading} />
        </section>
      </main>

      {/* MODAL WORKFLOWS */}
      {selectedDevice && (
        <DeviceDetailModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onStatusUpdated={() => fetchDashboard()}
          onDeviceDeleted={() => fetchDashboard()}
        />
      )}

      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDeviceAdded={() => fetchDashboard()}
      />
    </div>
  );
}


function ProtectedRoute({ children }) {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


function PageLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-area">
        <Topbar />
        {children}
      </main>
    </div>
  );
}


function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/devices"
            element={
              <ProtectedRoute>
                <PageLayout>
                  <Devices />
                </PageLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/locations"
            element={
              <ProtectedRoute>
                <PageLayout>
                  <Locations />
                </PageLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/activity"
            element={
              <ProtectedRoute>
                <PageLayout>
                  <Activity />
                </PageLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/security"
            element={
              <ProtectedRoute>
                <PageLayout>
                  <Security />
                </PageLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <PageLayout>
                  <Settings />
                </PageLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={<NotFound />}
          />

        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}


export default App;
