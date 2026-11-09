import { useEffect, useState, useCallback, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
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
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Contact from "./pages/Contact";
import ThankYou from "./pages/ThankYou";

import {
  getDashboardSummary,
  getLatestLocation,
  getRecentActivity,
  getDashboardDevices,
  getToken,
} from "./services/api";

import { isValidLocation } from "./utils/coordinates";
import { ToastProvider } from "./context/ToastContext";
import { NavProvider } from "./context/NavContext";
import { initGA, trackPageView } from "./utils/analytics";
import PageMeta from "./components/PageMeta";
import "./App.css";

import DeviceDetailModal from "./components/DeviceDetailModal";
import AddDeviceModal from "./components/AddDeviceModal";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./components/common";

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
}

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [location, setLocation] = useState(null);
  const [devices, setDevices] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const inFlightPromiseRef = useRef(null);

  const performFetch = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;

    if (!inFlightPromiseRef.current) {
      inFlightPromiseRef.current = Promise.all([
        getDashboardSummary(),
        getLatestLocation(),
        getDashboardDevices(),
        getRecentActivity(),
      ]).finally(() => {
        inFlightPromiseRef.current = null;
      });
    }

    try {
      const [
        summaryData,
        locationData,
        devicesData,
        activityData,
      ] = await inFlightPromiseRef.current;

      // Discard if component unmounted or a newer request was dispatched
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return;
      }

      setSummary(summaryData);
      setLocation(isValidLocation(locationData) ? locationData : null);
      setDevices(devicesData);
      setActivity(activityData);
      setError(null);
      setLastSynced(new Date());
    } catch (err) {
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return;
      }
      console.error("Dashboard loading failed:", err);
      setError("Unable to connect to TRACE-X telemetry backend.");
    } finally {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleManualRefresh = useCallback(() => {
    setLoading(true);
    performFetch();
  }, [performFetch]);

  useEffect(() => {
    isMountedRef.current = true;

    // Initial load
    performFetch();

    // Refresh dashboard every 10 seconds without stacking requests
    const refreshInterval = setInterval(() => {
      performFetch();
    }, 10000);

    // Cleanup interval and guard against state updates when dashboard unmounts
    return () => {
      isMountedRef.current = false;
      clearInterval(refreshInterval);
    };
  }, [performFetch]);

  const hasLostDevices = (summary?.lost_devices ?? 0) > 0;
  const isConnecting = loading && !summary && !error;

  const statusLabel = error
    ? "TELEMETRY OFFLINE"
    : isConnecting
      ? "CONNECTING..."
      : hasLostDevices
        ? "SECURITY ALERT"
        : "SYSTEM NOMINAL";

  const statusDotClass = error
    ? "danger"
    : isConnecting
      ? "connecting"
      : hasLostDevices
        ? "danger"
        : "";

  return (
    <div className="app-shell">
      <PageMeta
        title="Device Security Command Center"
        description="Monitor registered devices, geographic telemetry, and security events."
        path="/"
        noIndex={true}
      />
      <Sidebar />

      <main className="main-area">
        <Topbar />

        <section className="dashboard-content" aria-label="Command Center Dashboard">
          <header className="dashboard-hud-header">
            <div className="dashboard-title-group">
              <span className="dashboard-eyebrow">
                SYSTEM TELEMETRY OVERVIEW
              </span>

              <h1>Device Security Command Center</h1>

              <p>
                Monitor registered hardware assets, real-time geographic telemetry fixes, and security audit transitions.
              </p>
            </div>

            <div className="dashboard-header-actions">
              <div
                className="hud-status-chip"
                role="status"
                aria-live="polite"
              >
                <span
                  className={`hud-pulse-dot ${statusDotClass}`}
                  aria-hidden="true"
                />
                <span>{statusLabel}</span>
                {lastSynced && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span className="hud-sync-time">
                      SYNC: {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                loading={loading}
                title="Synchronize dashboard telemetry"
                aria-label="Refresh telemetry data"
                icon={<RefreshCw size={13} className={loading ? "spin" : ""} aria-hidden="true" />}
              >
                Refresh
              </Button>
            </div>
          </header>

          {error && !loading && (
            <div className="dashboard-error-banner" role="alert">
              <div className="dashboard-error-details">
                <AlertTriangle size={18} className="danger-text" aria-hidden="true" />
                <div>
                  <strong>Backend Telemetry Offline</strong>
                  <span>{error}</span>
                </div>
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={handleManualRefresh}
                icon={<RefreshCw size={13} aria-hidden="true" />}
              >
                Retry Connection
              </Button>
            </div>
          )}

          <div className="stats-grid" role="region" aria-label="Summary Statistics">
            <StatCard
              type="total"
              label="TOTAL ASSETS"
              value={summary?.total_devices ?? "--"}
              meta="Registered devices"
              loading={loading}
            />

            <StatCard
              type="active"
              label="ACTIVE & TRACKED"
              value={summary?.active_devices ?? "--"}
              meta="Devices operational"
              loading={loading}
            />

            <StatCard
              type="lost"
              label="LOST / ALERTS"
              value={summary?.lost_devices ?? "--"}
              meta="Requires immediate attention"
              loading={loading}
            />

            <StatCard
              type="disabled"
              label="DISABLED / STANDBY"
              value={summary?.disabled_devices ?? "--"}
              meta="Decommissioned hardware"
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
          isOpen={Boolean(selectedDevice)}
          onClose={() => setSelectedDevice(null)}
          onDeviceUpdated={performFetch}
          onDeviceDeleted={performFetch}
        />
      )}

      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDeviceCreated={performFetch}
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
      <AnalyticsTracker />
      <ToastProvider>
        <NavProvider>
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
            path="/faq"
            element={<FAQ />}
          />

          <Route
            path="/privacy"
            element={<PrivacyPolicy />}
          />

          <Route
            path="/contact"
            element={<Contact />}
          />

          <Route
            path="/contact/thank-you"
            element={<ThankYou />}
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
        </NavProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
