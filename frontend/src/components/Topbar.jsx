import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Bell,
  Wifi,
  Smartphone,
  Activity,
  ShieldCheck,
  Menu,
  X,
  User,
} from "lucide-react";

import {
  getDashboardDevices,
  getRecentActivity,
  getCurrentUser,
} from "../services/api";
import { useNav } from "../context/useNav";
import { StatusBadge } from "./common/StatusBadge";
import { topbarDataCache, CACHE_TTL_MS } from "../utils/cache";

// Route-specific metadata mapping
const routeMeta = {
  "/": {
    eyebrow: "TRACE-X / COMMAND",
    title: "Command Center",
  },
  "/devices": {
    eyebrow: "TRACE-X / HARDWARE",
    title: "Registered Devices",
  },
  "/locations": {
    eyebrow: "TRACE-X / TELEMETRY",
    title: "Geographic Tracking",
  },
  "/activity": {
    eyebrow: "TRACE-X / AUDIT",
    title: "Activity & Audit Log",
  },
  "/security": {
    eyebrow: "TRACE-X / INCIDENTS",
    title: "Security & Threat Mitigation",
  },
  "/settings": {
    eyebrow: "TRACE-X / CONFIGURATION",
    title: "Settings & Preferences",
  },
};

export default function Topbar() {
  const location = useLocation();
  const { isMobileNavOpen, toggleMobileNav } = useNav();

  const [activePopover, setActivePopover] = useState(null); // 'system' | 'notifications' | 'profile' | null
  const [devices, setDevices] = useState(() => {
    return topbarDataCache.devices !== null &&
      Date.now() - topbarDataCache.timestamp < CACHE_TTL_MS
      ? topbarDataCache.devices
      : [];
  });
  const [activity, setActivity] = useState(() => {
    return topbarDataCache.devices !== null &&
      Date.now() - topbarDataCache.timestamp < CACHE_TTL_MS
      ? topbarDataCache.activity
      : [];
  });
  const [user, setUser] = useState(() => {
    return topbarDataCache.devices !== null &&
      Date.now() - topbarDataCache.timestamp < CACHE_TTL_MS
      ? topbarDataCache.user
      : null;
  });
  const [telemetryError, setTelemetryError] = useState(false);

  const popoverContainerRef = useRef(null);

  // Load telemetry & user data with in-flight deduplication and TTL caching
  useEffect(() => {
    let isMounted = true;

    const fetchTopbarData = async () => {
      const now = Date.now();
      const isCacheFresh =
        topbarDataCache.devices !== null &&
        now - topbarDataCache.timestamp < CACHE_TTL_MS;

      if (isCacheFresh) {
        if (isMounted) {
          setDevices(topbarDataCache.devices);
          setActivity(topbarDataCache.activity);
          setUser(topbarDataCache.user);
          setTelemetryError(false);
        }
        return;
      }

      try {
        if (!topbarDataCache.inFlight) {
          topbarDataCache.inFlight = Promise.all([
            getDashboardDevices(),
            getRecentActivity(),
            getCurrentUser(),
          ]);
        }

        const [devicesData, activityData, userData] =
          await topbarDataCache.inFlight;

        topbarDataCache.devices = devicesData;
        topbarDataCache.activity = activityData;
        topbarDataCache.user = userData;
        topbarDataCache.timestamp = Date.now();

        if (isMounted) {
          setDevices(devicesData);
          setActivity(activityData);
          setUser(userData);
          setTelemetryError(false);
        }
      } catch (error) {
        console.error("Topbar data loading failed:", error);
        if (isMounted) {
          setTelemetryError(true);
          // If cache was expired, clear stale data so it cannot be presented as verified telemetry
          if (Date.now() - topbarDataCache.timestamp >= CACHE_TTL_MS) {
            topbarDataCache.devices = null;
            topbarDataCache.activity = null;
            topbarDataCache.user = null;
            setDevices([]);
            setActivity([]);
            setUser(null);
          }
        }
      } finally {
        topbarDataCache.inFlight = null;
      }
    };

    fetchTopbarData();

    return () => {
      isMounted = false;
    };
  }, []);

  const closeAll = useCallback(() => {
    setActivePopover(null);
  }, []);

  const togglePopover = (popoverName) => {
    setActivePopover((current) => (current === popoverName ? null : popoverName));
  };

  // Keyboard navigation and outside-click dismissal for popovers
  useEffect(() => {
    if (!activePopover) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeAll();
      }
    };

    const handleClickOutside = (e) => {
      if (
        popoverContainerRef.current &&
        !popoverContainerRef.current.contains(e.target)
      ) {
        closeAll();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activePopover, closeAll]);

  // Operational device telemetry indicator
  const operational =
    !telemetryError &&
    devices.length > 0 &&
    devices.some((device) => device.status !== "disabled");

  const userName = user?.name || "Administrator";
  const userInitial = userName.charAt(0).toUpperCase();

  const currentMeta = routeMeta[location.pathname] || {
    eyebrow: "TRACE-X / CONSOLE",
    title: "Command Center",
  };

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        {/* Mobile Navigation Drawer Toggle */}
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={toggleMobileNav}
          aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileNavOpen}
          aria-controls="app-sidebar"
        >
          {isMobileNavOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>

        {/* Dynamic Context Breadcrumb */}
        <div className="page-heading">
          <span className="eyebrow">{currentMeta.eyebrow}</span>
          <h2>{currentMeta.title}</h2>
        </div>
      </div>

      <div className="topbar-right" ref={popoverContainerRef}>
        {/* 1. SYSTEM STATUS POPOVER */}
        <div className="topbar-popup-wrapper">
          <button
            type="button"
            className="system-status system-status-button"
            onClick={() => togglePopover("system")}
            aria-label={`System telemetry status: ${telemetryError ? "Offline" : operational ? "Operational" : "Offline"}`}
            aria-haspopup="dialog"
            aria-expanded={activePopover === "system"}
          >
            <span
              className={`status-dot ${telemetryError ? "offline" : operational ? "online" : "offline"}`}
              aria-hidden="true"
            />
            <Wifi size={14} aria-hidden="true" />
            <span>{telemetryError ? "Offline" : operational ? "Operational" : "Offline"}</span>
          </button>

          {activePopover === "system" && (
            <div
              className="topbar-popup system-popup"
              role="dialog"
              aria-label="System Telemetry Status"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="popup-header">
                <div>
                  <span className="popup-eyebrow">TELEMETRY STATUS</span>
                  <h3>Device Operations</h3>
                </div>
                <button
                  type="button"
                  className="popup-close"
                  onClick={closeAll}
                  aria-label="Close telemetry panel"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="popup-status-row">
                <span
                  className={`popup-status-dot ${telemetryError ? "offline" : operational ? "online" : "offline"}`}
                  aria-hidden="true"
                />
                <div>
                  <strong>
                    {telemetryError
                      ? "Telemetry Offline"
                      : operational
                        ? "Hardware Telemetry Active"
                        : "Telemetry Standby"}
                  </strong>
                  <span>
                    {telemetryError
                      ? "Unable to synchronize with TRACE-X telemetry service."
                      : operational
                        ? "TRACE-X is receiving nominal device telemetry packets."
                        : "No active devices transmitting telemetry."}
                  </span>
                </div>
              </div>

              <div className="popup-divider" />

              {devices.length === 0 ? (
                <div className="popup-empty">NO REGISTERED HARDWARE</div>
              ) : (
                devices.map((device) => (
                  <div className="popup-device" key={device.id}>
                    <div className="popup-device-icon" aria-hidden="true">
                      <Smartphone size={14} />
                    </div>
                    <div>
                      <strong>{device.device_name}</strong>
                      <span>{device.device_identifier}</span>
                    </div>
                    <StatusBadge status={device.status} size="sm" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 2. NOTIFICATIONS POPOVER */}
        <div className="topbar-popup-wrapper">
          <button
            type="button"
            className="icon-button notification"
            aria-label="Security notifications"
            onClick={() => togglePopover("notifications")}
            aria-haspopup="dialog"
            aria-expanded={activePopover === "notifications"}
          >
            <Bell size={18} aria-hidden="true" />
            {activity.length > 0 && <span className="notification-dot" aria-hidden="true" />}
          </button>

          {activePopover === "notifications" && (
            <div
              className="topbar-popup notification-popup"
              role="dialog"
              aria-label="Security Incident Notifications"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="popup-header">
                <div>
                  <span className="popup-eyebrow">SECURITY AUDIT LOG</span>
                  <h3>Notifications</h3>
                </div>
                <button
                  type="button"
                  className="popup-close"
                  onClick={closeAll}
                  aria-label="Close notification panel"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              {activity.length === 0 ? (
                <div className="popup-empty">NO RECENT NOTIFICATIONS</div>
              ) : (
                <div className="notification-list">
                  {activity.slice(0, 6).map((item) => (
                    <div className="notification-item" key={item.id}>
                      <div className="notification-icon" aria-hidden="true">
                        <Activity size={13} />
                      </div>
                      <div className="notification-content">
                        <strong>Device status transition</strong>
                        <span>
                          {item.old_status} → {item.new_status}
                        </span>
                        <small>
                          {item.changed_at
                            ? new Date(item.changed_at).toLocaleString()
                            : "--"}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. USER PROFILE POPOVER */}
        <div className="topbar-popup-wrapper">
          <button
            type="button"
            className="profile profile-button"
            onClick={() => togglePopover("profile")}
            aria-label="Toggle user account profile menu"
            aria-haspopup="dialog"
            aria-expanded={activePopover === "profile"}
          >
            <div className="profile-info">
              <strong>{userName}</strong>
              <span>Security Officer</span>
            </div>
            <div className="profile-avatar" aria-hidden="true">
              {userInitial}
            </div>
          </button>

          {activePopover === "profile" && (
            <div
              className="topbar-popup profile-popup"
              role="dialog"
              aria-label="User Account Summary"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="popup-header">
                <div>
                  <span className="popup-eyebrow">OPERATOR PROFILE</span>
                  <h3>Account Credentials</h3>
                </div>
                <button
                  type="button"
                  className="popup-close"
                  onClick={closeAll}
                  aria-label="Close profile panel"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="profile-popup-user">
                <div className="profile-popup-avatar" aria-hidden="true">
                  {userInitial}
                </div>
                <div>
                  <strong>{userName}</strong>
                  <span>Operator #{user?.id ?? "--"}</span>
                </div>
              </div>

              <div className="popup-divider" />

              <div className="profile-data-row">
                <div>
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>Account ID</span>
                </div>
                <strong>User #{user?.id ?? "--"}</strong>
              </div>

              <div className="profile-data-row">
                <div>
                  <User size={14} aria-hidden="true" />
                  <span>Email</span>
                </div>
                <strong>{user?.email || "--"}</strong>
              </div>

              <div className="profile-data-row">
                <div>
                  <Smartphone size={14} aria-hidden="true" />
                  <span>Monitored Assets</span>
                </div>
                <strong>{devices.length}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
