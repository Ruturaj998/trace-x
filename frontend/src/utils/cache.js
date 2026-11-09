/**
 * TRACE-X In-Memory Cache Store
 * Used by Topbar and navigation components to prevent duplicate HTTP requests
 * during rapid route transitions without adding external dependencies.
 */

export const topbarDataCache = {
  devices: null,
  activity: null,
  user: null,
  timestamp: 0,
  inFlight: null,
};

export const CACHE_TTL_MS = 20000; // 20 seconds TTL

/**
 * Invalidate all cached Topbar data, timestamps, and pending in-flight requests.
 * Must be executed upon logout or authentication expiry so cached user/device
 * data cannot leak across distinct sessions.
 */
export const clearTopbarCache = () => {
  topbarDataCache.devices = null;
  topbarDataCache.activity = null;
  topbarDataCache.user = null;
  topbarDataCache.timestamp = 0;
  topbarDataCache.inFlight = null;
};
