import { useEffect, useState } from "react";
import {
  Navigation,
  Target,
  Clock3,
  RefreshCw,
  Smartphone,
  AlertCircle,
  Crosshair,
} from "lucide-react";
import {
  getDashboardDevices,
  getDeviceLocations,
  getLatestLocation,
} from "../services/api";
import RealMap from "../components/RealMap";
import { isValidLocation, filterValidLocations } from "../utils/coordinates";

export default function Locations() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [recenterSignal, setRecenterSignal] = useState(0);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");

      const devicesList = await getDashboardDevices();
      setDevices(devicesList);

      let targetDeviceId = selectedDeviceId;
      if (!targetDeviceId && devicesList.length > 0) {
        targetDeviceId = devicesList[0].id;
        setSelectedDeviceId(targetDeviceId);
      }

      if (targetDeviceId) {
        const deviceLocs = await getDeviceLocations(targetDeviceId).catch(() => []);
        setLocations(filterValidLocations(deviceLocs));
      } else {
        const latest = await getLatestLocation().catch(() => null);
        setLocations(isValidLocation(latest) ? [latest] : []);
      }
    } catch (err) {
      console.error("Location intelligence loading failed:", err);
      setError("Unable to load location telemetry from TRACE-X server.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    getDashboardDevices()
      .then(async (devicesList) => {
        if (!isMounted) return;
        setDevices(devicesList);

        let targetDeviceId = selectedDeviceId;
        if (!targetDeviceId && devicesList.length > 0) {
          targetDeviceId = devicesList[0].id;
          setSelectedDeviceId(targetDeviceId);
        }

        let locs = [];
        if (targetDeviceId) {
          const deviceLocs = await getDeviceLocations(targetDeviceId).catch(() => []);
          locs = filterValidLocations(deviceLocs);
        } else {
          const latest = await getLatestLocation().catch(() => null);
          locs = isValidLocation(latest) ? [latest] : [];
        }

        if (isMounted) {
          setLocations(locs);
          setError("");
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Location intelligence loading failed:", err);
          setError("Unable to load location telemetry from TRACE-X server.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDeviceId]);

  const handleDeviceSelect = async (deviceId) => {
    setSelectedDeviceId(deviceId);
    try {
      setRefreshing(true);
      const locs = await getDeviceLocations(deviceId).catch(() => []);
      setLocations(filterValidLocations(locs));
      setRecenterSignal((s) => s + 1);
    } catch (err) {
      console.error("Failed to load device locations:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const activeLocation = locations.length > 0 ? locations[0] : null;
  const hasValidFix = isValidLocation(activeLocation);

  const handleCenter = () => {
    if (hasValidFix) {
      setRecenterSignal((s) => s + 1);
    }
  };

  return (
    <section className="page-content">
      <div className="welcome-block location-page-heading">
        <div>
          <span className="section-label">LOCATION INTELLIGENCE</span>
          <h1>Device Locations & Trail</h1>
          <p>
            Monitor real-time coordinates, historical telemetry, and tracking trails.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {hasValidFix && (
            <button
              className="map-control"
              onClick={handleCenter}
              title="Center map on latest coordinates"
            >
              <Crosshair size={15} />
              Center
            </button>
          )}

          <button
            className="location-refresh-button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Refresh location telemetry"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "spin" : ""}
            />
            {refreshing ? "REFRESHING..." : "REFRESH"}
          </button>
        </div>
      </div>

      {/* DEVICE SELECTOR BAR */}
      {devices.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "12px",
            marginBottom: "16px",
          }}
        >
          {devices.map((dev) => (
            <button
              key={dev.id}
              onClick={() => handleDeviceSelect(dev.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "11px",
                fontFamily: "var(--mono)",
                cursor: "pointer",
                background:
                  selectedDeviceId === dev.id
                    ? "var(--accent-soft)"
                    : "rgba(255, 255, 255, 0.03)",
                color:
                  selectedDeviceId === dev.id
                    ? "var(--accent)"
                    : "var(--text-soft)",
                border:
                  selectedDeviceId === dev.id
                    ? "1px solid rgba(216, 255, 62, 0.35)"
                    : "1px solid var(--border)",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Smartphone size={13} />
              <span>{dev.device_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="empty-state-card">
          <div className="empty-state-icon error">
            <AlertCircle size={26} />
          </div>
          <h2 className="empty-state-title">Location Feed Unavailable</h2>
          <p className="empty-state-desc">{error}</p>
          <button className="empty-state-action" onClick={handleRefresh}>
            <RefreshCw size={14} />
            Retry Connection
          </button>
        </div>
      )}

      {/* SKELETON LOADING STATE */}
      {loading ? (
        <div className="location-page-grid">
          <div className="skeleton-box" style={{ minHeight: "420px", borderRadius: "8px" }} />
          <div className="skeleton-card skeleton-box" style={{ minHeight: "420px" }}>
            <div className="skeleton-line short" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line long" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line long" />
          </div>
        </div>
      ) : !error && (!hasValidFix || devices.length === 0) ? (
        /* POLISHED EMPTY STATE */
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Navigation size={28} />
          </div>
          <h2 className="empty-state-title">No Location Telemetry Available</h2>
          <p className="empty-state-desc">
            {devices.length === 0
              ? "No devices are currently registered to transmit location coordinates."
              : `"${selectedDevice?.device_name || "Device"}" has not recorded any coordinate fixes yet. As GPS/network fixes are transmitted, breadcrumb trails will appear automatically.`}
          </p>
          <button className="empty-state-action" onClick={handleRefresh}>
            <RefreshCw size={14} />
            Check Telemetry
          </button>
        </div>
      ) : !error && (
        <div className="location-page-grid">
          {/* MAP CONTAINER */}
          <div className="location-map-card">
            <div className="location-card-header">
              <div>
                <span className="panel-eyebrow">
                  {locations.length > 1
                    ? `TRAIL VIEW (${locations.length} FIXES)`
                    : "LATEST POSITION"}
                </span>
                <h2>
                  {selectedDevice?.device_name || activeLocation.device_name || "Active Device"}
                </h2>
              </div>

              <div className="location-live">
                <span />
                {locations.length > 1 ? "HISTORY ACTIVE" : "TRACKING"}
              </div>
            </div>

            <div className="location-map real-location-map" style={{ height: "420px" }}>
              <RealMap
                location={activeLocation}
                locations={locations}
                recenterSignal={recenterSignal}
              />
            </div>
          </div>

          {/* TELEMETRY & HISTORY DETAILS */}
          <div className="location-info-card">
            <span className="panel-eyebrow">COORDINATE TELEMETRY</span>

            <div className="location-data-list">
              <div className="location-data-row">
                <div>
                  <Navigation size={16} />
                  <span>Latitude</span>
                </div>
                <strong>{Number(activeLocation.latitude).toFixed(6)}° N</strong>
              </div>

              <div className="location-data-row">
                <div>
                  <Navigation size={16} />
                  <span>Longitude</span>
                </div>
                <strong>{Number(activeLocation.longitude).toFixed(6)}° E</strong>
              </div>

              <div className="location-data-row">
                <div>
                  <Target size={16} />
                  <span>Accuracy</span>
                </div>
                <strong>
                  {activeLocation.accuracy !== null && activeLocation.accuracy !== undefined
                    ? `${activeLocation.accuracy} m`
                    : "N/A"}
                </strong>
              </div>

              <div className="location-data-row">
                <div>
                  <Clock3 size={16} />
                  <span>Last recorded</span>
                </div>
                <strong>
                  {activeLocation.timestamp &&
                  !isNaN(new Date(activeLocation.timestamp).getTime())
                    ? new Date(activeLocation.timestamp).toLocaleString()
                    : "N/A"}
                </strong>
              </div>
            </div>

            {/* LOCATION HISTORY BREADCRUMBS SUMMARY */}
            <div style={{ marginTop: "22px", borderTop: "1px solid var(--border-soft)", paddingTop: "16px" }}>
              <span className="panel-eyebrow" style={{ marginBottom: "8px" }}>
                HISTORY LOG ({locations.length})
              </span>

              {locations.length === 1 ? (
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    lineHeight: "1.6",
                    margin: "8px 0 0",
                    fontFamily: "var(--mono)",
                  }}
                >
                  Single location fix recorded. Historical breadcrumb trail will render on the map as additional coordinate updates are captured.
                </p>
              ) : (
                <div
                  style={{
                    maxHeight: "170px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    marginTop: "8px",
                  }}
                >
                  {locations.map((loc, index) => (
                    <div
                      key={loc.id || index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "10px",
                        fontFamily: "var(--mono)",
                        padding: "6px 8px",
                        background:
                          index === 0
                            ? "var(--accent-soft)"
                            : "rgba(255, 255, 255, 0.02)",
                        border:
                          index === 0
                            ? "1px solid rgba(216, 255, 62, 0.25)"
                            : "1px solid transparent",
                        borderRadius: "4px",
                      }}
                    >
                      <span style={{ color: index === 0 ? "var(--accent)" : "var(--text)" }}>
                        {Number(loc.latitude).toFixed(3)}, {Number(loc.longitude).toFixed(3)}
                        {index === 0 ? " (Latest)" : ""}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {loc.timestamp &&
                        !isNaN(new Date(loc.timestamp).getTime())
                          ? new Date(loc.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}