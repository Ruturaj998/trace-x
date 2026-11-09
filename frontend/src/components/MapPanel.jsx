import { useState } from "react";
import { Link } from "react-router-dom";
import { Crosshair, ArrowUpRight, Radio } from "lucide-react";
import RealMap from "./RealMap";
import { isValidLocation } from "../utils/coordinates";

/**
 * Command-center MapPanel component for real-time geographic telemetry.
 *
 * @param {Object} [location] - Latest verified device location fix
 */
export default function MapPanel({ location }) {
  const [recenterSignal, setRecenterSignal] = useState(0);
  const hasValidFix = isValidLocation(location);

  const handleCenter = () => {
    if (hasValidFix) {
      setRecenterSignal((value) => value + 1);
    }
  };

  const formattedCoords = hasValidFix
    ? `${Number(location.latitude).toFixed(4)}°, ${Number(location.longitude).toFixed(4)}°`
    : null;

  return (
    <section className="map-panel" aria-label="Device Location Telemetry">
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="panel-eyebrow">LIVE TELEMETRY</span>
          <h2>Device Location</h2>
        </div>

        <div className="panel-header-actions">
          {hasValidFix && (
            <div
              className="map-telemetry-badge"
              title={`Latest fix from ${location.device_name || "device"}${location.accuracy ? ` (accuracy ±${Math.round(location.accuracy)}m)` : ""}`}
            >
              <Radio size={11} aria-hidden="true" />
              <span>{location.device_name || "Active Fix"}</span>
              <span>•</span>
              <span>{formattedCoords}</span>
            </div>
          )}

          <button
            type="button"
            className="map-control"
            onClick={handleCenter}
            disabled={!hasValidFix}
            style={{
              opacity: hasValidFix ? 1 : 0.45,
              cursor: hasValidFix ? "pointer" : "not-allowed",
            }}
            title={
              hasValidFix
                ? "Center on latest telemetry fix"
                : "No verified GPS coordinates available to center"
            }
            aria-label="Center map on latest coordinates"
          >
            <Crosshair size={13} aria-hidden="true" />
            <span>Center</span>
          </button>

          <Link
            to="/locations"
            className="panel-action-link"
            title="Open comprehensive interactive map and historical telemetry"
          >
            <span>Full Map</span>
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="map-area">
        <RealMap location={location} recenterSignal={recenterSignal} />
      </div>
    </section>
  );
}
