import { useState } from "react";
import { Crosshair } from "lucide-react";
import RealMap from "./RealMap";
import { isValidLocation } from "../utils/coordinates";

export default function MapPanel({ location }) {
  const [recenterSignal, setRecenterSignal] = useState(0);
  const hasValidFix = isValidLocation(location);

  const handleCenter = () => {
    if (hasValidFix) {
      setRecenterSignal((value) => value + 1);
    }
  };

  return (
    <section className="map-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">LIVE TRACKING</span>
          <h2>Device Location</h2>
        </div>

        <button
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
        >
          <Crosshair size={16} />
          Center
        </button>
      </div>

      <div className="map-area">
        <RealMap
          location={location}
          recenterSignal={recenterSignal}
        />
      </div>
    </section>
  );
}