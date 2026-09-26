import { useEffect, useState } from "react";
import {
  Bell,
  Wifi,
  Smartphone,
  Activity,
  ShieldCheck,
} from "lucide-react";

import {
  getDashboardDevices,
  getRecentActivity,
  getCurrentUser,
} from "../services/api";
import tracexLogo from "../assets/tracex-logo.png";

export default function Topbar() {
  const [showSystem, setShowSystem] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [devices, setDevices] = useState([]);
  const [activity, setActivity] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadTopbarData = async () => {
      try {
        const [devicesData, activityData, userData] =
          await Promise.all([
            getDashboardDevices(),
            getRecentActivity(),
            getCurrentUser(),
          ]);

        setDevices(devicesData);
        setActivity(activityData);
        setUser(userData);
      } catch (error) {
        console.error("Topbar data loading failed:", error);
      }
    };

    loadTopbarData();
  }, []);

  const closeAll = () => {
    setShowSystem(false);
    setShowNotifications(false);
    setShowProfile(false);
  };

  const toggleSystem = () => {
    setShowNotifications(false);
    setShowProfile(false);
    setShowSystem((value) => !value);
  };

  const toggleNotifications = () => {
    setShowSystem(false);
    setShowProfile(false);
    setShowNotifications((value) => !value);
  };

  const toggleProfile = () => {
    setShowSystem(false);
    setShowNotifications(false);
    setShowProfile((value) => !value);
  };

  const operational =
    devices.length > 0 &&
    devices.some((device) => device.status !== "disabled");

  const userName = user?.name || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <img
          src={tracexLogo}
          alt="TRACE-X"
          className="brand-logo topbar-mobile-logo"
        />
        <div className="page-heading">
          <span className="eyebrow">TRACE-X / SYSTEM</span>
          <h2>Command Center</h2>
        </div>
      </div>

      <div className="topbar-right">

        {/* SYSTEM STATUS */}
        <div className="topbar-popup-wrapper">
          <button
            className="system-status system-status-button"
            onClick={toggleSystem}
          >
            <span
              className={`status-dot ${
                operational ? "online" : "offline"
              }`}
            />

            <Wifi size={15} />

            <span>
              {operational ? "Operational" : "Offline"}
            </span>
          </button>

          {showSystem && (
            <div className="topbar-popup system-popup">
              <div className="popup-header">
                <div>
                  <span className="popup-eyebrow">
                    SYSTEM STATUS
                  </span>

                  <h3>Device Operations</h3>
                </div>

                <button
                  className="popup-close"
                  onClick={closeAll}
                >
                  ×
                </button>
              </div>

              <div className="popup-status-row">
                <span
                  className={`popup-status-dot ${
                    operational ? "online" : "offline"
                  }`}
                />

                <div>
                  <strong>
                    {operational
                      ? "Device operational"
                      : "System offline"}
                  </strong>

                  <span>
                    {operational
                      ? "TRACE-X is receiving device data."
                      : "No operational device detected."}
                  </span>
                </div>
              </div>

              <div className="popup-divider" />

              {devices.length === 0 ? (
                <div className="popup-empty">
                  NO DEVICE DATA
                </div>
              ) : (
                devices.map((device) => (
                  <div
                    className="popup-device"
                    key={device.id}
                  >
                    <div className="popup-device-icon">
                      <Smartphone size={15} />
                    </div>

                    <div>
                      <strong>{device.device_name}</strong>

                      <span>
                        {device.device_identifier}
                      </span>
                    </div>

                    <span
                      className={`popup-device-status ${device.status}`}
                    >
                      {device.status?.toUpperCase()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* NOTIFICATIONS */}
        <div className="topbar-popup-wrapper">
          <button
            className="icon-button notification"
            aria-label="Notifications"
            onClick={toggleNotifications}
          >
            <Bell size={18} />

            {activity.length > 0 && (
              <span className="notification-dot" />
            )}
          </button>

          {showNotifications && (
            <div className="topbar-popup notification-popup">
              <div className="popup-header">
                <div>
                  <span className="popup-eyebrow">
                    SECURITY LOG
                  </span>

                  <h3>Notifications</h3>
                </div>

                <button
                  className="popup-close"
                  onClick={closeAll}
                >
                  ×
                </button>
              </div>

              {activity.length === 0 ? (
                <div className="popup-empty">
                  NO NEW NOTIFICATIONS
                </div>
              ) : (
                <div className="notification-list">
                  {activity.map((item) => (
                    <div
                      className="notification-item"
                      key={item.id}
                    >
                      <div className="notification-icon">
                        <Activity size={14} />
                      </div>

                      <div className="notification-content">
                        <strong>
                          Device status changed
                        </strong>

                        <span>
                          {item.old_status} → {item.new_status}
                        </span>

                        <small>
                          {item.changed_at
                            ? new Date(
                                item.changed_at
                              ).toLocaleString()
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

        {/* PROFILE */}
        <div className="topbar-popup-wrapper">
          <button
            className="profile profile-button"
            onClick={toggleProfile}
          >
            <div className="profile-info">
              <strong>{userName}</strong>
              <span>Administrator</span>
            </div>

            <div className="profile-avatar">
              {userInitial}
            </div>
          </button>

          {showProfile && (
            <div className="topbar-popup profile-popup">
              <div className="popup-header">
                <div>
                  <span className="popup-eyebrow">
                    ACCOUNT
                  </span>

                  <h3>User Profile</h3>
                </div>

                <button
                  className="popup-close"
                  onClick={closeAll}
                >
                  ×
                </button>
              </div>

              <div className="profile-popup-user">
                <div className="profile-popup-avatar">
                  {userInitial}
                </div>

                <div>
                  <strong>{userName}</strong>
                  <span>Administrator</span>
                </div>
              </div>

              <div className="popup-divider" />

              <div className="profile-data-row">
                <div>
                  <ShieldCheck size={14} />
                  <span>User ID</span>
                </div>

                <strong>{user?.id ?? "--"}</strong>
              </div>

              <div className="profile-data-row">
                <div>
                  <span>Email</span>
                </div>

                <strong>{user?.email || "--"}</strong>
              </div>

              <div className="profile-data-row">
                <div>
                  <Smartphone size={14} />
                  <span>Devices</span>
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
