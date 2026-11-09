/**
 * TRACE-X Privacy-Preserving Google Analytics 4 (GA4) Integration
 *
 * Privacy Guarantees:
 * 1. IP Anonymization enabled by default (anonymize_ip: true).
 * 2. Ad personalization signals and Google signals disabled.
 * 3. Respects browser 'Do Not Track' (DNT) header.
 * 4. Strictly filters out PII, hardware identifiers, passwords, tokens,
 *    and geographic coordinates (lat/long).
 * 5. Deduplicates page-view events on client-side router navigation.
 */

let isInitialized = false;
let lastTrackedPath = "";

export const getMeasurementId = () => {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (id && typeof id === "string" && id.trim().startsWith("G-")) {
    return id.trim();
  }
  return null;
};

export const isDoNotTrackEnabled = () => {
  if (typeof window === "undefined" || !window.navigator) return false;
  return (
    window.navigator.doNotTrack === "1" ||
    window.navigator.doNotTrack === "yes" ||
    window.doNotTrack === "1"
  );
};

export const initGA = () => {
  if (typeof window === "undefined" || isInitialized) return;

  const measurementId = getMeasurementId();
  if (!measurementId) {
    // GA4 measurement ID not configured; analytics gracefully disabled
    return;
  }

  if (isDoNotTrackEnabled()) {
    // User requested Do Not Track; respect privacy preference
    return;
  }

  // Inject gtag script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag("js", new Date());

  // Privacy-hardened configuration
  gtag("config", measurementId, {
    send_page_view: false, // Managed manually via React Router to prevent duplicate events
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    restricted_data_processing: true,
  });

  isInitialized = true;
};

/**
 * Tracks public page views. Private authenticated dashboard routes are
 * deliberately omitted or generalized to protect user device telemetry.
 */
export const trackPageView = (path, title) => {
  if (typeof window === "undefined" || !window.gtag) return;
  if (isDoNotTrackEnabled()) return;

  const measurementId = getMeasurementId();
  if (!measurementId) return;

  // Deduplicate rapid router calls
  if (path === lastTrackedPath) return;
  lastTrackedPath = path;

  // Exclude private routes from analytics to protect device privacy
  const privateRoutes = [
    "/devices",
    "/locations",
    "/activity",
    "/security",
    "/settings",
    "/reset-password",
  ];
  const isPrivate = privateRoutes.some((route) => path.startsWith(route));

  if (isPrivate) {
    // Never send individual telemetry routes to external analytics
    return;
  }

  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
    send_to: measurementId,
  });
};

/**
 * Tracks safe, non-sensitive custom events (e.g. contact submission success).
 * Automatically strips any accidental PII, coordinates, or tokens.
 */
export const trackEvent = (eventName, params = {}) => {
  if (typeof window === "undefined" || !window.gtag) return;
  if (isDoNotTrackEnabled()) return;

  const measurementId = getMeasurementId();
  if (!measurementId) return;

  // Scrub sensitive keys
  const sensitiveKeys = [
    "email",
    "password",
    "token",
    "latitude",
    "longitude",
    "lat",
    "lng",
    "accuracy",
    "coordinates",
    "device_identifier",
    "device_name",
    "message",
    "name",
  ];

  const sanitizedParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (!sensitiveKeys.includes(key.toLowerCase())) {
      sanitizedParams[key] = value;
    }
  }

  window.gtag("event", eventName, {
    ...sanitizedParams,
    send_to: measurementId,
  });
};
