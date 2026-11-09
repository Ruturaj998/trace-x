"""HTTP Client for transmitting authenticated telemetry to TRACE-X API.
Uses Python standard library (urllib.request) for zero external dependencies.
Supports both user JWT bearer authentication and dedicated device token authentication (X-Device-Token).
"""

import json
from typing import Any, Dict, List, Optional
import urllib.error
import urllib.request


class TraceXClient:
    def __init__(
        self,
        base_url: str,
        token: Optional[str] = None,
        device_token: Optional[str] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.device_token = device_token

    def _get_auth_headers(self) -> Dict[str, str]:
        headers = {}
        if self.device_token:
            headers["X-Device-Token"] = self.device_token
        elif self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        else:
            raise PermissionError("Authentication token or device credential is required to send telemetry (HTTP 401).")
        return headers

    def authenticate(self, email: str, password: str) -> str:
        """Authenticate using user email and password against /auth/login."""
        url = f"{self.base_url}/auth/login"
        payload = json.dumps({"email": email, "password": password}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                token = data.get("access_token")
                if not token:
                    raise ValueError("No access_token returned by login endpoint.")
                self.token = token
                return token
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Authentication failed (HTTP {e.code}): {error_body}") from e
        except urllib.error.URLError as e:
            raise ConnectionError(f"Network error connecting to {url}: {e.reason}") from e
        except TimeoutError as e:
            raise TimeoutError(f"Authentication timed out connecting to {url}: {e}") from e
        except Exception as e:
            raise RuntimeError(f"Could not connect to TRACE-X API at {url}: {e}") from e

    def send_location(
        self,
        device_id: int,
        latitude: float,
        longitude: float,
        accuracy: Optional[float] = None,
        recorded_at: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send a real GPS fix to POST /locations."""
        headers = self._get_auth_headers()
        headers["Content-Type"] = "application/json"

        url = f"{self.base_url}/locations"
        body: Dict[str, Any] = {
            "device_id": device_id,
            "latitude": latitude,
            "longitude": longitude,
        }
        if accuracy is not None:
            body["accuracy"] = accuracy
        if recorded_at is not None:
            body["recorded_at"] = recorded_at
        if idempotency_key is not None:
            body["idempotency_key"] = idempotency_key

        payload = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace")
            if e.code == 401:
                raise PermissionError(f"Unauthorized (HTTP 401). Invalid or expired credentials: {error_body}") from e
            elif e.code == 403:
                raise PermissionError(f"Forbidden (HTTP 403). Device access denied or cross-device impersonation: {error_body}") from e
            elif e.code == 404:
                raise LookupError(f"Device not found or not owned by user (HTTP 404): {error_body}") from e
            elif e.code == 422:
                raise ValueError(f"Validation error (HTTP 422). Invalid coordinates or schema: {error_body}") from e
            else:
                raise RuntimeError(f"Location ingestion failed (HTTP {e.code}): {error_body}") from e
        except urllib.error.URLError as e:
            raise ConnectionError(f"Network error connecting to TRACE-X API at {url}: {e.reason}") from e
        except TimeoutError as e:
            raise TimeoutError(f"Request timed out connecting to TRACE-X API at {url}: {e}") from e
        except Exception as e:
            raise RuntimeError(f"Error sending telemetry to {url}: {e}") from e

    def send_sync_batch(
        self,
        device_id: int,
        fixes: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Synchronize a batch of offline-buffered GPS fixes to POST /locations/sync."""
        if not fixes:
            return {"synced_count": 0, "duplicates_skipped": 0, "message": "No fixes in batch"}

        headers = self._get_auth_headers()
        headers["Content-Type"] = "application/json"

        url = f"{self.base_url}/locations/sync"
        body = {
            "device_id": device_id,
            "fixes": fixes,
        }

        payload = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace")
            if e.code == 401:
                raise PermissionError(f"Unauthorized (HTTP 401): {error_body}") from e
            elif e.code == 403:
                raise PermissionError(f"Forbidden (HTTP 403): {error_body}") from e
            elif e.code == 404:
                raise LookupError(f"Device not found (HTTP 404): {error_body}") from e
            elif e.code == 422:
                raise ValueError(f"Validation error (HTTP 422): {error_body}") from e
            else:
                raise RuntimeError(f"Sync batch failed (HTTP {e.code}): {error_body}") from e
        except urllib.error.URLError as e:
            raise ConnectionError(f"Network error connecting to {url}: {e.reason}") from e
        except TimeoutError as e:
            raise TimeoutError(f"Request timed out connecting to {url}: {e}") from e
        except Exception as e:
            raise RuntimeError(f"Error syncing telemetry to {url}: {e}") from e

    def get_latest_location(self, device_id: int) -> Dict[str, Any]:
        """Fetch latest location fix from GET /devices/{device_id}/latest-location."""
        headers = self._get_auth_headers()
        url = f"{self.base_url}/devices/{device_id}/latest-location"
        req = urllib.request.Request(
            url,
            headers=headers,
            method="GET",
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Error fetching latest location (HTTP {e.code}): {error_body}") from e
        except Exception as e:
            raise RuntimeError(f"Error contacting {url}: {e}") from e
