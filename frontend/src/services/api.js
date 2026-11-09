import { clearTopbarCache } from "../utils/cache";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.PROD
      ? ""
      : "http://127.0.0.1:8000";

let cachedCsrfToken = null;

export const getCsrfTokenFromCookie = () => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const getCsrfToken = async () => {
  const cookieToken = getCsrfTokenFromCookie();
  if (cookieToken) {
    cachedCsrfToken = cookieToken;
    return cookieToken;
  }
  if (cachedCsrfToken) return cachedCsrfToken;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
      credentials: "include",
    });
    const data = await res.json();
    cachedCsrfToken = data.csrf_token;
    return cachedCsrfToken;
  } catch {
    return null;
  }
};

export const getToken = () => {
  return localStorage.getItem("tracex_token");
};

export const setToken = (token) => {
  localStorage.setItem("tracex_token", token);
};

export const removeToken = () => {
  localStorage.removeItem("tracex_token");
  cachedCsrfToken = null;
  clearTopbarCache();
};

export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail);
    throw new Error(message || "Authentication failed. Check your credentials.");
  }

  if (data.csrf_token) {
    cachedCsrfToken = data.csrf_token;
  }
  setToken(data.access_token || "authenticated");

  return data;
};

export const registerUser = async (name, email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail);
    throw new Error(message || "Registration failed.");
  }

  return data;
};

export const logoutUser = async () => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore network failures on logout
  } finally {
    removeToken();
    clearTopbarCache();
  }
};

export const forgotPassword = async (email) => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail);
    throw new Error(message || "Request failed.");
  }

  return data;
};

export const resetPassword = async (token, new_password) => {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, new_password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail);
    throw new Error(message || "Password reset failed.");
  }

  return data;
};

export const changePassword = async (current_password, new_password) => {
  return apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
};

export const apiRequest = async (endpoint, options = {}) => {
  const method = (options.method || "GET").toUpperCase();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Attach CSRF protection token for state-changing requests
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrf = getCsrfTokenFromCookie() || cachedCsrfToken;
    if (csrf) {
      headers["X-CSRF-Token"] = csrf;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "API request failed");
  }

  return response.json();
};

export const getDashboardSummary = () => {
  return apiRequest("/dashboard/summary");
};

export const getLatestLocation = () => {
  return apiRequest("/dashboard/latest-location");
};

export const getRecentActivity = () => {
  return apiRequest("/dashboard/recent-activity");
};

export const getDashboardDevices = () => {
  return apiRequest("/dashboard/devices");
};

export const getCurrentUser = () => {
  return apiRequest("/users/me");
};

export const updateDeviceStatus = (deviceId, status) => {
  return apiRequest(`/devices/${deviceId}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
    }),
  });
};

export const generateDeviceToken = (deviceId) => {
  return apiRequest(`/devices/${deviceId}/token`, {
    method: "POST",
  });
};

export const revokeDeviceToken = (deviceId) => {
  return apiRequest(`/devices/${deviceId}/token`, {
    method: "DELETE",
  });
};

export const syncOfflineLocations = (deviceId, fixes) => {
  return apiRequest("/locations/sync", {
    method: "POST",
    body: JSON.stringify({
      device_id: deviceId,
      fixes,
    }),
  });
};

export const getSystemHealth = () => {
  return apiRequest("/health");
};

export const createDevice = async (deviceData) => {
  let userId = deviceData.user_id;
  if (!userId) {
    const user = await getCurrentUser();
    userId = user.id;
  }
  return apiRequest("/devices", {
    method: "POST",
    body: JSON.stringify({
      device_name: deviceData.device_name,
      device_identifier: deviceData.device_identifier,
      user_id: userId,
    }),
  });
};

export const deleteDevice = (deviceId) => {
  return apiRequest(`/devices/${deviceId}`, {
    method: "DELETE",
  });
};

export const getDevice = (deviceId) => {
  return apiRequest(`/devices/${deviceId}`);
};

export const getDeviceLocations = (deviceId) => {
  return apiRequest(`/devices/${deviceId}/locations`);
};

export const getDeviceStatusHistory = (deviceId) => {
  return apiRequest(`/devices/${deviceId}/status-history`);
};

export const getDeviceLatestLocation = (deviceId) => {
  return apiRequest(`/devices/${deviceId}/latest-location`);
};

export const submitContactForm = async (contactData) => {
  const response = await fetch(`${API_BASE_URL}/contact`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(contactData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let message = "Submission failed. Please check your entries.";
    if (typeof data.detail === "string") {
      message = data.detail;
    } else if (Array.isArray(data.detail)) {
      message = data.detail.map((err) => `${err.loc?.slice(-1)[0] || "field"}: ${err.msg}`).join("; ");
    }
    throw new Error(message);
  }

  return data;
};
