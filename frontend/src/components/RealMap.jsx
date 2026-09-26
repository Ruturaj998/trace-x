import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  LayersControl,
  Polyline,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  validateCoordinates,
  isValidLocation,
  extractLatLng,
  filterValidLocations,
} from "../utils/coordinates";
import MapErrorBoundary from "./MapErrorBoundary";

const markerIcon = L.divIcon({
  className: "tracex-marker",
  html: `
    <div class="tracex-marker-pulse"></div>
    <div class="tracex-marker-dot"></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function RecenterMap({ position, recenterSignal }) {
  const map = useMap();

  useEffect(() => {
    if (!position || !Array.isArray(position) || position.length < 2) return;
    const result = validateCoordinates(position[0], position[1]);
    if (!result.valid) return;

    try {
      map.setView([result.lat, result.lng], 14, {
        animate: true,
      });
    } catch (err) {
      console.error("Leaflet setView error avoided:", err);
    }
  }, [map, position, recenterSignal]);

  return null;
}

function RealMapInner({ location, locations = [], recenterSignal }) {
  // Determine if a valid telemetry fix is available
  let activeLocation = null;
  if (isValidLocation(location)) {
    activeLocation = location;
  } else if (Array.isArray(locations)) {
    const found = locations.find(isValidLocation);
    if (found) {
      activeLocation = found;
    }
  }

  // If no genuine coordinates exist, render the honest awaiting telemetry state.
  // Never initialize Leaflet MapContainer with (NaN, NaN) or fabricated coordinates.
  if (!activeLocation) {
    return (
      <div className="real-map-empty">
        <div className="real-map-empty-inner">
          <span className="radar-sweep-icon" />
          <strong>NO LOCATION TELEMETRY AVAILABLE</strong>
          <p>
            Awaiting live coordinates from registered devices. No simulated positions are displayed.
          </p>
        </div>
      </div>
    );
  }

  const primaryPosition = extractLatLng(activeLocation);
  if (!primaryPosition) {
    return (
      <div className="real-map-empty">
        <div className="real-map-empty-inner">
          <span className="radar-sweep-icon" />
          <strong>NO LOCATION TELEMETRY AVAILABLE</strong>
          <p>
            Awaiting live coordinates from registered devices. No simulated positions are displayed.
          </p>
        </div>
      </div>
    );
  }

  // Safely extract valid historical breadcrumbs
  const validHistory = filterValidLocations(locations);
  const polylineCoords = validHistory.map((loc) => [loc.lat, loc.lng]);

  const displayAccuracy =
    activeLocation.accuracy !== null &&
    activeLocation.accuracy !== undefined &&
    Number.isFinite(Number(activeLocation.accuracy))
      ? `${Number(activeLocation.accuracy).toFixed(1)}m`
      : "N/A";

  return (
    <MapContainer
      center={primaryPosition}
      zoom={14}
      scrollWheelZoom={true}
      className="real-map"
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Satellite">
          <TileLayer
            attribution="&copy; Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Street Map">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <RecenterMap
        position={primaryPosition}
        recenterSignal={recenterSignal}
      />

      {/* Historical Breadcrumb Trail */}
      {polylineCoords.length > 1 && (
        <Polyline
          positions={polylineCoords}
          pathOptions={{
            color: "#38bdf8",
            weight: 3,
            opacity: 0.75,
            dashArray: "6, 8",
          }}
        />
      )}

      {/* Historical Fix Points */}
      {validHistory.slice(1).map((hist, idx) => (
        <CircleMarker
          key={hist.id || `hist-${idx}`}
          center={[hist.lat, hist.lng]}
          radius={5}
          pathOptions={{
            color: "#38bdf8",
            fillColor: "#0284c7",
            fillOpacity: 0.85,
            weight: 2,
          }}
        >
          <Popup>
            <strong>Location History #{validHistory.length - idx - 1}</strong>
            <br />
            {hist.timestamp ? new Date(hist.timestamp).toLocaleString() : ""}
            <br />
            Accuracy:{" "}
            {hist.accuracy !== null && hist.accuracy !== undefined
              ? `${hist.accuracy}m`
              : "N/A"}
            <br />
            {hist.lat.toFixed(4)}° N, {hist.lng.toFixed(4)}° E
          </Popup>
        </CircleMarker>
      ))}

      {/* Latest Active Position */}
      <Marker position={primaryPosition} icon={markerIcon}>
        <Popup>
          <strong>{activeLocation.device_name || "Active Device"}</strong>
          <br />
          Accuracy: {displayAccuracy}
          <br />
          {primaryPosition[0].toFixed(4)}° N, {primaryPosition[1].toFixed(4)}° E
          {activeLocation.timestamp && (
            <>
              <br />
              <small>{new Date(activeLocation.timestamp).toLocaleString()}</small>
            </>
          )}
        </Popup>
      </Marker>
    </MapContainer>
  );
}

export default function RealMap(props) {
  return (
    <MapErrorBoundary>
      <RealMapInner {...props} />
    </MapErrorBoundary>
  );
}