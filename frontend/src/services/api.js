export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.PROD
      ? ""
      : "http://127.0.0.1:8000";

export const getToken = () => {
  return localStorage.getItem("tracex_token");
};

export const setToken = (token) => {
  localStorage.setItem("tracex_token", token);
};

export const removeToken = () => {
  localStorage.removeItem("tracex_token");
};

export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
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

  if (!data.access_token) {
    throw new Error("Authentication token was not returned by server.");
  }

  return data;
};

export const registerUser = async (name, email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
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

export const forgotPassword = async (email) => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
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
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
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