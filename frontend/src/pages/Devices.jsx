import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Smartphone,
  Search,
  X,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Eye,
  RotateCcw,
  Loader2,
  Filter,
} from "lucide-react";

import {
  getDashboardDevices,
  updateDeviceStatus,
} from "../services/api";
import { useToast } from "../context/useToast";
import AddDeviceModal from "../components/AddDeviceModal";
import DeviceDetailModal from "../components/DeviceDetailModal";
import PageMeta from "../components/PageMeta";
import { Button } from "../components/common/Button";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/EmptyState";

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const toast = useToast();
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const fetchDevicesData = useCallback(async (isManual = false) => {
    const currentRequestId = ++requestIdRef.current;

    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await getDashboardDevices();
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return;
      }
      setDevices(Array.isArray(data) ? data : []);
      setError("");
      if (isManual) {
        toast.success("Device inventory synchronized.");
      }
    } catch (err) {
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return;
      }
      console.error("Device inventory fetch failed:", err);
      const msg = err.message || "Unable to communicate with TRACE-X device service.";
      setError(msg);
      if (isManual) {
        toast.error("Failed to synchronize device inventory.");
      }
    } finally {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [toast]);

  const handleManualRefresh = () => {
    fetchDevicesData(true);
  };

  const handleRetry = () => {
    fetchDevicesData(false);
  };

  useEffect(() => {
    isMountedRef.current = true;
    let active = true;
    const currentRequestId = ++requestIdRef.current;

    getDashboardDevices()
      .then((data) => {
        if (!active || !isMountedRef.current || currentRequestId !== requestIdRef.current) {
          return;
        }
        setDevices(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch((err) => {
        if (!active || !isMountedRef.current || currentRequestId !== requestIdRef.current) {
          return;
        }
        console.error("Device inventory fetch failed:", err);
        setError(err.message || "Unable to communicate with TRACE-X device service.");
      })
      .finally(() => {
        if (active && isMountedRef.current && currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      isMountedRef.current = false;
    };
  }, []);

  // Derived metrics from genuine loaded device telemetry
  const totalCount = devices.length;
  const activeCount = useMemo(
    () => devices.filter((d) => d.status === "active").length,
    [devices]
  );
  const lostCount = useMemo(
    () => devices.filter((d) => d.status === "lost").length,
    [devices]
  );
  const disabledCount = useMemo(
    () => devices.filter((d) => d.status === "disabled").length,
    [devices]
  );

  // Search and status filter evaluation
  const filteredDevices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return devices.filter((device) => {
      // 1. Status Filter
      if (statusFilter !== "all" && device.status !== statusFilter) {
        return false;
      }

      // 2. Text Search (device_name or device_identifier)
      if (query) {
        const nameMatch = (device.device_name || "").toLowerCase().includes(query);
        const idMatch = (device.device_identifier || "").toLowerCase().includes(query);
        if (!nameMatch && !idMatch) {
          return false;
        }
      }

      return true;
    });
  }, [devices, searchQuery, statusFilter]);

  const handleStatusChange = async (e, device, newStatus) => {
    e.stopPropagation();
    if (device.status === newStatus || updating === device.id) {
      return;
    }

    try {
      setUpdating(device.id);
      await updateDeviceStatus(device.id, newStatus);

      setDevices((currentDevices) =>
        currentDevices.map((item) =>
          item.id === device.id ? { ...item, status: newStatus } : item
        )
      );

      if (selectedDevice && selectedDevice.id === device.id) {
        setSelectedDevice((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      toast.success(
        `"${device.device_name}" status set to ${newStatus.toUpperCase()}.`
      );
    } catch (err) {
      console.error("Device status update failed:", err);
      toast.error(err.message || "Failed to update device status.");
    } finally {
      if (isMountedRef.current) {
        setUpdating(null);
      }
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const handleDeviceCreated = (newDevice) => {
    setDevices((prev) => [newDevice, ...prev]);
  };

  const handleDeviceUpdated = (updatedDevice) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === updatedDevice.id ? updatedDevice : d))
    );
    setSelectedDevice(updatedDevice);
  };

  const handleDeviceDeleted = (deletedId) => {
    setDevices((prev) => prev.filter((d) => d.id !== deletedId));
    setSelectedDevice(null);
  };

  const isFiltersActive = searchQuery.trim() !== "" || statusFilter !== "all";

  return (
    <section className="devices-content" aria-label="Device Inventory Console">
      <PageMeta
        title="Tracked Devices"
        description="Monitor registered hardware, telemetry status, and security states."
        path="/devices"
        noIndex={true}
      />

      {/* A. PAGE HUD HEADER */}
      <header className="devices-hud-header">
        <div className="devices-title-group">
          <span className="devices-eyebrow">
            HARDWARE ASSET INVENTORY
          </span>
          <h1>Tracked Devices</h1>
          <p>
            View, configure, and monitor all security devices registered to your TRACE-X account.
          </p>
        </div>

        <div className="devices-header-actions">
          {/* Real live inventory telemetry counter pills */}
          {!loading && !error && (
            <div className="devices-stat-pills" role="status" aria-label="Inventory Metrics">
              <span className="devices-stat-pill" title="Total registered assets">
                <span className="stat-pill-label">TOTAL</span>
                <span className="stat-pill-val">{totalCount}</span>
              </span>
              <span className="devices-stat-pill active" title="Active hardware assets">
                <span className="stat-pill-label">ACTIVE</span>
                <span className="stat-pill-val">{activeCount}</span>
              </span>
              {lostCount > 0 && (
                <span className="devices-stat-pill lost" title="Assets in alert status">
                  <span className="stat-pill-label">LOST</span>
                  <span className="stat-pill-val">{lostCount}</span>
                </span>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading || refreshing}
            title="Synchronize device inventory"
            aria-label="Refresh device list"
            icon={<RefreshCw size={13} className={refreshing ? "spin" : ""} aria-hidden="true" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            title="Register a new device"
            aria-label="Register new hardware device"
            icon={<Plus size={14} aria-hidden="true" />}
          >
            Register Device
          </Button>
        </div>
      </header>

      {/* ERROR BANNER */}
      {error && !loading && (
        <div className="devices-error-banner" role="alert">
          <div className="devices-error-details">
            <AlertTriangle size={18} className="danger-text" aria-hidden="true" />
            <div>
              <strong>Device Telemetry Offline</strong>
              <span>{error}</span>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={handleRetry}
            icon={<RefreshCw size={13} aria-hidden="true" />}
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* B. INVENTORY TOOLBAR (SEARCH & FILTERS) */}
      {!loading && !error && devices.length > 0 && (
        <div className="devices-toolbar" role="search" aria-label="Filter devices">
          <div className="devices-search-box">
            <Search size={14} className="devices-search-icon" aria-hidden="true" />
            <input
              type="text"
              className="devices-search-input"
              placeholder="Filter by name or identifier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search devices by name or identifier"
            />
            {searchQuery && (
              <button
                type="button"
                className="devices-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search text"
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="devices-filter-tabs" role="tablist" aria-label="Filter by security status">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "all"}
              className={`filter-tab ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "active"}
              className={`filter-tab ${statusFilter === "active" ? "active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "lost"}
              className={`filter-tab lost ${statusFilter === "lost" ? "active" : ""}`}
              onClick={() => setStatusFilter("lost")}
            >
              Lost ({lostCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "disabled"}
              className={`filter-tab ${statusFilter === "disabled" ? "active" : ""}`}
              onClick={() => setStatusFilter("disabled")}
            >
              Disabled ({disabledCount})
            </button>
          </div>

          {isFiltersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              icon={<RotateCcw size={12} aria-hidden="true" />}
              className="clear-filters-btn"
              title="Reset search and filters"
            >
              Reset Filters
            </Button>
          )}
        </div>
      )}

      {/* C. INVENTORY CONTENT STATES */}
      {loading ? (
        <div className="devices-grid" aria-label="Loading device inventory">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div className="device-card-skeleton" key={n}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="skeleton-shimmer" style={{ width: "34px", height: "34px", borderRadius: "6px" }} />
                <div className="skeleton-shimmer" style={{ width: "64px", height: "18px", borderRadius: "9999px" }} />
              </div>
              <div className="skeleton-shimmer" style={{ width: "60%", height: "18px", marginTop: "4px" }} />
              <div className="skeleton-shimmer" style={{ width: "40%", height: "14px" }} />
              <div className="skeleton-shimmer" style={{ width: "100%", height: "46px", borderRadius: "6px", margin: "8px 0" }} />
              <div style={{ display: "flex", gap: "6px", marginTop: "auto", paddingTop: "8px" }}>
                <div className="skeleton-shimmer" style={{ flex: 1, height: "28px", borderRadius: "4px" }} />
                <div className="skeleton-shimmer" style={{ flex: 1, height: "28px", borderRadius: "4px" }} />
                <div className="skeleton-shimmer" style={{ flex: 1, height: "28px", borderRadius: "4px" }} />
                <div className="skeleton-shimmer" style={{ width: "60px", height: "28px", borderRadius: "4px" }} />
              </div>
            </div>
          ))}
        </div>
      ) : !error && devices.length === 0 ? (
        /* Empty State: 0 Devices Registered */
        <EmptyState
          icon={<Smartphone size={32} />}
          title="No Devices Registered"
          description="You currently have no hardware devices or assets monitored in TRACE-X. Register your first device to begin real-time tracking and security monitoring."
          action={
            <Button
              variant="primary"
              onClick={() => setIsAddModalOpen(true)}
              icon={<Plus size={14} aria-hidden="true" />}
            >
              Register First Device
            </Button>
          }
        />
      ) : !error && filteredDevices.length === 0 ? (
        /* No Match State: Filters Active but 0 matches */
        <EmptyState
          icon={<Filter size={28} />}
          title="No Matching Assets"
          description={`No registered devices match your filter criteria ${
            searchQuery ? `"${searchQuery}"` : ""
          }${statusFilter !== "all" ? ` [Status: ${statusFilter.toUpperCase()}]` : ""}.`}
          action={
            <Button
              variant="secondary"
              onClick={handleClearFilters}
              icon={<RotateCcw size={13} aria-hidden="true" />}
            >
              Reset Filters
            </Button>
          }
        />
      ) : !error && (
        /* Genuine Device Cards Grid */
        <div className="devices-grid" role="region" aria-label="Registered Hardware Devices">
          {filteredDevices.map((device) => {
            const rawStatus = typeof device.status === "string" ? device.status.trim().toLowerCase() : "";
            const isLost = rawStatus === "lost";
            const isDisabled = rawStatus === "disabled";
            const isKnown = rawStatus === "active" || isLost || isDisabled;

            const cardStatusClass = isLost
              ? "status-lost"
              : isDisabled
                ? "status-disabled"
                : !isKnown
                  ? "status-unknown"
                  : "";

            return (
              <div
                className={`device-card-cyber ${cardStatusClass}`}
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                tabIndex={0}
                role="article"
                aria-label={`Device ${device.device_name}, status: ${device.status}`}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedDevice(device);
                  }
                }}
              >
                {/* 1. Header: Icon, ID, StatusBadge */}
                <div className="device-card-header">
                  <div className="device-card-identity">
                    <div className="device-hardware-icon" aria-hidden="true">
                      <Smartphone size={18} />
                    </div>
                    <span className="device-asset-badge">
                      ASSET #{device.id}
                    </span>
                  </div>
                  <StatusBadge status={device.status} size="sm" />
                </div>

                {/* 2. Body: Name and Hardware Identifier */}
                <div className="device-card-body">
                  <h2 className="device-card-name" title={device.device_name}>
                    {device.device_name}
                  </h2>
                  <div className="device-card-identifier" title={device.device_identifier}>
                    <span className="id-label">ID:</span>
                    <code className="id-mono">{device.device_identifier}</code>
                  </div>
                </div>

                {/* 3. Telemetry Indicators */}
                <div className="device-card-telemetry-row">
                  <div className="telemetry-item">
                    <span className="telemetry-item-label">CONNECTIVITY</span>
                    <span className={`telemetry-item-value ${device.connectivity_status === "ONLINE" ? "active" : device.connectivity_status === "OFFLINE" ? "danger" : "muted"}`}>
                      {device.connectivity_status || "NEVER_CONNECTED"}
                    </span>
                  </div>
                  <div className="telemetry-item">
                    <span className="telemetry-item-label">LAST SEEN</span>
                    <span className="telemetry-item-value muted">
                      {device.last_seen ? new Date(device.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Never"}
                    </span>
                  </div>
                </div>

                {/* 4. Action Controls */}
                <div
                  className="device-card-actions"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={`device-toggle-btn toggle-active ${
                      device.status === "active" ? "current" : ""
                    }`}
                    onClick={(e) => handleStatusChange(e, device, "active")}
                    disabled={updating === device.id || device.status === "active"}
                    title="Mark hardware asset as active"
                    aria-label={`Mark ${device.device_name} as active`}
                  >
                    <CheckCircle2 size={13} aria-hidden="true" />
                    <span>Active</span>
                  </button>

                  <button
                    type="button"
                    className={`device-toggle-btn toggle-lost ${
                      device.status === "lost" ? "current" : ""
                    }`}
                    onClick={(e) => handleStatusChange(e, device, "lost")}
                    disabled={updating === device.id || device.status === "lost"}
                    title="Mark hardware asset as lost / security alert"
                    aria-label={`Mark ${device.device_name} as lost`}
                  >
                    <AlertTriangle size={13} aria-hidden="true" />
                    <span>Lost</span>
                  </button>

                  <button
                    type="button"
                    className={`device-toggle-btn toggle-disabled ${
                      device.status === "disabled" ? "current" : ""
                    }`}
                    onClick={(e) => handleStatusChange(e, device, "disabled")}
                    disabled={updating === device.id || device.status === "disabled"}
                    title="Disable hardware asset monitoring"
                    aria-label={`Mark ${device.device_name} as disabled`}
                  >
                    <Ban size={13} aria-hidden="true" />
                    <span>Disable</span>
                  </button>

                  <button
                    type="button"
                    className="device-inspect-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDevice(device);
                    }}
                    title="Inspect telemetry and location records"
                    aria-label={`Inspect ${device.device_name} details`}
                  >
                    <Eye size={13} aria-hidden="true" />
                    <span>Inspect</span>
                  </button>
                </div>

                {/* Updating Scrim */}
                {updating === device.id && (
                  <div
                    className="device-updating-scrim"
                    role="status"
                    aria-live="assertive"
                  >
                    <Loader2 size={16} className="spin" aria-hidden="true" />
                    <span>UPDATING SECURITY STATE...</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ADD DEVICE MODAL */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDeviceCreated={handleDeviceCreated}
      />

      {/* DEVICE DETAIL MODAL */}
      <DeviceDetailModal
        device={selectedDevice}
        isOpen={Boolean(selectedDevice)}
        onClose={() => setSelectedDevice(null)}
        onDeviceUpdated={handleDeviceUpdated}
        onDeviceDeleted={handleDeviceDeleted}
      />
    </section>
  );
}
