/**
 * TRACE-X Coordinate Validation & Normalization Utility
 *
 * Prevents Leaflet Invalid LatLng (NaN, NaN) runtime crashes by strictly validating
 * all incoming coordinates before they can touch MapContainer, setView, Marker,
 * CircleMarker, or Polyline.
 *
 * A coordinate is valid ONLY when:
 * 1. Latitude and longitude are finite numbers (not NaN, Infinity, -Infinity, null, undefined).
 * 2. Latitude is within [-90.0, 90.0].
 * 3. Longitude is within [-180.0, 180.0].
 */

/**
 * Validates arbitrary latitude and longitude inputs.
 * Safely parses numeric strings and rejects empty/invalid/out-of-range values.
 *
 * @param {any} rawLat
 * @param {any} rawLng
 * @returns {{ valid: boolean, lat: number | null, lng: number | null }}
 */
export function validateCoordinates(rawLat, rawLng) {
  if (rawLat === null || rawLat === undefined || rawLng === null || rawLng === undefined) {
    return { valid: false, lat: null, lng: null };
  }

  // Reject boolean, arrays, objects passed directly as coordinate values
  if (typeof rawLat === "boolean" || typeof rawLng === "boolean") {
    return { valid: false, lat: null, lng: null };
  }

  // Handle strings: reject empty or whitespace-only strings
  if (typeof rawLat === "string" && rawLat.trim() === "") {
    return { valid: false, lat: null, lng: null };
  }
  if (typeof rawLng === "string" && rawLng.trim() === "") {
    return { valid: false, lat: null, lng: null };
  }

  const numLat = typeof rawLat === "number" ? rawLat : Number(rawLat);
  const numLng = typeof rawLng === "number" ? rawLng : Number(rawLng);

  // Reject NaN, Infinity, -Infinity
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
    return { valid: false, lat: null, lng: null };
  }

  // Geographic boundary checks
  if (numLat < -90.0 || numLat > 90.0 || numLng < -180.0 || numLng > 180.0) {
    return { valid: false, lat: null, lng: null };
  }

  return { valid: true, lat: numLat, lng: numLng };
}

/**
 * Checks whether an object contains valid, finite geographic coordinates.
 * Supports both { latitude, longitude } and { lat, lng } property shapes.
 *
 * @param {any} location
 * @returns {boolean}
 */
export function isValidLocation(location) {
  if (!location || typeof location !== "object") {
    return false;
  }

  const rawLat = location.latitude !== undefined ? location.latitude : location.lat;
  const rawLng = location.longitude !== undefined ? location.longitude : location.lng;

  return validateCoordinates(rawLat, rawLng).valid;
}

/**
 * Extracts a validated [lat, lng] tuple from an object, or null if coordinates are invalid.
 *
 * @param {any} location
 * @returns {[number, number] | null}
 */
export function extractLatLng(location) {
  if (!location || typeof location !== "object") {
    return null;
  }

  const rawLat = location.latitude !== undefined ? location.latitude : location.lat;
  const rawLng = location.longitude !== undefined ? location.longitude : location.lng;

  const result = validateCoordinates(rawLat, rawLng);
  if (!result.valid) {
    return null;
  }

  return [result.lat, result.lng];
}

/**
 * Filters an array of location objects, returning only items with valid coordinates
 * and normalized finite numeric latitude and longitude properties.
 *
 * @param {any[]} locations
 * @returns {Array<object & { lat: number, lng: number, latitude: number, longitude: number }>}
 */
export function filterValidLocations(locations) {
  if (!Array.isArray(locations)) {
    return [];
  }

  return locations
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const coords = extractLatLng(item);
      if (!coords) return null;

      return {
        ...item,
        lat: coords[0],
        lng: coords[1],
        latitude: coords[0],
        longitude: coords[1],
      };
    })
    .filter(Boolean);
}
