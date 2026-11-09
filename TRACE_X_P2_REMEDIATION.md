# TRACE-X — P2 Advanced Security & Real-Time Tracking Remediation Report

**Date:** November 9, 2026
**Project:** TRACE-X Telemetry & Device Recovery Platform
**Target Architecture:** FastAPI / PostgreSQL 18.6 / React 19 + Vite / Edge Telemetry Agent
**Auditor & Implementation Engineer:** Senior Backend Architect, Application Security Engineer & IoT Telemetry Engineer

---

## Executive Summary

Following the completion of P0 production blockers and P1 production readiness remediations, the **P2 Advanced Security & Real-Time Tracking** phase has been implemented, validated, and verified.

All 5 core P2 capabilities are **VERIFIED COMPLETE** across both SQLite in-memory unit tests and real PostgreSQL 18.6 integration test suites.

### Remediation Status Matrix

| Capability | Component Areas | Security & Architectural Objective | Status |
|:---|:---|:---|:---:|
| **1. Device-Specific Authentication** | `app/services/device_auth.py`, `app/routes/devices.py`, `app/database/auth_dependencies.py` | Dedicated cryptographically secure edge credentials; only SHA-256 hashes stored in DB; rotation & revocation; cross-device impersonation prevention | **VERIFIED COMPLETE** |
| **2. Real Online/Offline Detection** | `app/models/device.py`, `app/routes/dashboard.py`, `app/routes/location.py` | Genuine telemetry-based `last_seen` timestamp; 5-min heartbeat threshold; `ONLINE`, `OFFLINE`, `NEVER_CONNECTED` separation from operational state | **VERIFIED COMPLETE** |
| **3. Offline Buffering & Sync** | `telemetry_agent/offline_queue.py`, `telemetry_agent/`, `app/routes/location.py` | Local disk queue with `0600` permissions; batch sync (`POST /locations/sync`); deduplication via idempotency keys; capture timestamp preservation | **VERIFIED COMPLETE** |
| **4. HttpOnly Cookies & CSRF Defense** | `app/routes/auth.py`, `app/services/csrf.py`, `app/main.py`, `app/database/auth_dependencies.py` | XSS-immune HttpOnly cookie session auth; double-submit CSRF protection on state-changing requests; safe API & device token exemption | **VERIFIED COMPLETE** |
| **5. Frontend Integration** | `frontend/src/services/api.js`, `DeviceDetailModal.jsx`, `Devices.jsx`, `StatusBadge.jsx` | Credentialed requests (`credentials: 'include'`); automated CSRF header injection; live connectivity indicators; token management UI | **VERIFIED COMPLETE** |
| **6. Database Migration 003** | `app/database/migrations/003_*.sql`, `run_migrations.py` | Versioned migration adding `device_token_hash`, `device_token_prefix`, `last_seen`, `recorded_at`, `idempotency_key` and indexes | **VERIFIED COMPLETE** |

---

## 1. Architecture Changes & Design

```
+---------------------------------------------------------------------------------------------------+
|                                        TRACE-X ARCHITECTURE                                        |
+---------------------------------------------------------------------------------------------------+

       [ Browser User ]                                             [ Edge Telemetry Agent ]
              |                                                                 |
              | 1. POST /auth/login                                             | 1. POST /locations
              |    (Sets HttpOnly 'access_token'                                |    (Header: X-Device-Token: txd_...)
              |     & readable 'csrf_token' cookies)                            |
              v                                                                 v
+-------------------------------+                            +-------------------------------------+
|        FastAPI Gate           |                            |       FastAPI Telemetry Gate        |
|  - Validates session cookie   |                            |  - Hashes raw token with SHA-256    |
|  - Compares X-CSRF-Token      |                            |  - Looks up Device by hash in DB    |
|    against csrf_token cookie  |                            |  - Enforces Device.id == payload.id |
+---------------+---------------+                            +------------------+------------------+
                |                                                               |
                v                                                               v
+---------------------------------------------------------------------------------------------------+
|                                      POSTGRESQL DATABASE                                          |
|                                                                                                   |
|  devices:                                                                                         |
|    - id, user_id, device_identifier, status ('active', 'lost', 'disabled')                       |
|    - device_token_hash (VARCHAR(128)) [INDEXED]                                                   |
|    - device_token_prefix (VARCHAR(16)) (e.g. 'txd_abc123')                                        |
|    - last_seen (TIMESTAMP WITH TIME ZONE) [INDEXED]                                               |
|                                                                                                   |
|  locations:                                                                                       |
|    - id, device_id [ON DELETE CASCADE]                                                            |
|    - latitude, longitude, accuracy                                                                |
|    - timestamp (Server reception time, UTC) [INDEXED]                                             |
|    - recorded_at (Client/hardware capture time, UTC) [INDEXED]                                    |
|    - idempotency_key (UUID / client deduplication key) [INDEXED]                                  |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Phase 1 — Device-Specific Authentication

### Implementation Details
* **Cryptographic Token Generator:**
  * Located in [`app/services/device_auth.py`](file:///home/ruturaj998/trace-x/app/services/device_auth.py).
  * Generates 256-bit cryptographically secure URL-safe tokens with prefix `txd_` (`secrets.token_urlsafe(32)`).
  * Computes SHA-256 digest (`hashlib.sha256(raw_token.encode('utf-8')).hexdigest()`).
  * Plaintext is returned **only once** to the device owner during generation/rotation and is **never logged or stored**.
* **Credential Rotation and Revocation:**
  * `POST /devices/{device_id}/token`: Generates or rotates credentials. Requires device ownership (`current_user.id == device.user_id`).
  * `DELETE /devices/{device_id}/token`: Sets `device_token_hash = None` and `device_token_prefix = None`. Immediately revokes edge device access.
  * Ordinary device endpoints (`GET /devices`, `GET /devices/{id}`) return only `has_token: bool` and `token_prefix: str | None`, preventing credential exposure.
* **Telemetry Authorization & Impersonation Prevention:**
  * Located in [`app/database/auth_dependencies.py`](file:///home/ruturaj998/trace-x/app/database/auth_dependencies.py) (`get_telemetry_caller`, `TelemetryCaller`).
  * Edge agents authenticate via `X-Device-Token` header.
  * Resolves device via indexed SHA-256 hash lookup.
  * Strictly enforces `target_device_id == authenticated_device.id`. If a token provisioned for Device 1 attempts to submit fixes for Device 2, the server halts with **HTTP 403 Forbidden** (`Cross-device impersonation forbidden`).

---

## 3. Phase 2 — Real Online/Offline Detection

### Implementation Details
* **Telemetry Timestamp:**
  * Added `last_seen = Column(UTCDateTime, nullable=True, index=True)` to `devices`.
  * Updated automatically on every verified telemetry ingestion in `POST /locations` and batch `POST /locations/sync`.
* **State Calculation:**
  * Implemented in [`app/models/device.py`](file:///home/ruturaj998/trace-x/app/models/device.py#L70-L85):
    * If `last_seen is None`: `NEVER_CONNECTED` (newly registered devices are never falsely marked online).
    * If `now - last_seen <= 5 minutes` (configurable via `DEVICE_ONLINE_HEARTBEAT_MINUTES`): `ONLINE`.
    * If `now - last_seen > 5 minutes`: `OFFLINE`.
* **Decoupled States:**
  * Operational status (`status`: "active", "lost", "disabled") remains strictly independent from connectivity status (`connectivity_status`: "ONLINE", "OFFLINE", "NEVER_CONNECTED"). Lost hardware actively transmitting GPS fixes is correctly displayed as `LOST (ONLINE)`.
* **Dashboard Aggregations:**
  * [`app/routes/dashboard.py`](file:///home/ruturaj998/trace-x/app/routes/dashboard.py) computes aggregate counts:
    * `online_devices`, `offline_devices`, `never_connected_devices`.

---

## 4. Phase 3 — Offline Location Buffering & Synchronization

### Implementation Details
* **Local Offline Queue:**
  * Implemented in [`telemetry_agent/offline_queue.py`](file:///home/ruturaj998/trace-x/telemetry_agent/offline_queue.py) (`OfflineTelemetryQueue`).
  * Stored on local disk at `~/.tracex_telemetry_queue.json` (configurable via `TRACEX_QUEUE_PATH`).
  * Filesystem permissions strictly set to **`0o600`** (`stat.S_IRUSR | stat.S_IWUSR`), preventing local multi-user snooping.
  * Never stores passwords or user JWTs. Stores only telemetry records with UUID4 `idempotency_key` and UTC ISO `recorded_at`.
* **Batch Sync API:**
  * `POST /locations/sync` accepting up to 100 fixes per request.
  * Deduplicates against existing database records via `(device_id, idempotency_key)` index. If an offline queue replays fixes already received, duplicates are skipped without error.
  * Preserves original client capture timestamp (`recorded_at`) alongside server reception timestamp (`timestamp`).
* **Agent Store-and-Forward Loop:**
  * [`telemetry_agent/agent.py`](file:///home/ruturaj998/trace-x/telemetry_agent/agent.py) monitors network connectivity.
  * When network times out or drops, acquired GPS fixes are queued to disk.
  * Upon reconnection, the agent flushes the queue in batches of 100 before transmitting live telemetry.

---

## 5. Phase 4 — HttpOnly Cookie Authentication & CSRF Protection

### Implementation Details
* **HttpOnly Cookies:**
  * `POST /auth/login` sets `access_token` cookie:
    * `HttpOnly = True` (inaccessible to JavaScript / XSS payloads)
    * `Secure = True` in production (`ENVIRONMENT=production`), `False` in local development
    * `SameSite = "lax"`
    * `Path = "/"`
    * `max_age = 7 days`
  * `POST /auth/logout` explicitly deletes `access_token` and `csrf_token` cookies.
* **Double-Submit CSRF Defense:**
  * Implemented in [`app/services/csrf.py`](file:///home/ruturaj998/trace-x/app/services/csrf.py) and [`app/main.py`](file:///home/ruturaj998/trace-x/app/main.py#L38-L62).
  * Server sets `csrf_token` cookie (non-HttpOnly so client JS can read it).
  * Frontend sends `X-CSRF-Token` header on all state-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`).
  * Middleware validates `hmac.compare_digest(cookie_csrf, header_csrf)`.
  * **Safe Exemption:** Programmatic API clients sending `Authorization: Bearer <token>` or `X-Device-Token` are not vulnerable to ambient browser CSRF and are exempted.
  * Public endpoints (`/auth/login`, `/auth/register`, `/contact`, `/health`) are exempted.

---

## 6. Phase 5 — Frontend Integration

### Implementation Details
* **API Service:**
  * Updated [`frontend/src/services/api.js`](file:///home/ruturaj998/trace-x/frontend/src/services/api.js):
    * Configured `fetch()` with `credentials: "include"`.
    * Automatically extracts `csrf_token` from cookie and attaches `X-CSRF-Token` header.
    * Added `generateDeviceToken(deviceId)`, `revokeDeviceToken(deviceId)`, `syncOfflineLocations(deviceId, fixes)`, `logoutUser()`.
* **Device Detail Modal:**
  * Updated [`frontend/src/components/DeviceDetailModal.jsx`](file:///home/ruturaj998/trace-x/frontend/src/components/DeviceDetailModal.jsx):
    * Displays `CONNECTIVITY` badge (`ONLINE`, `OFFLINE`, `NEVER_CONNECTED`) and `LAST SEEN` timestamp.
    * Adds **Edge Telemetry Credentials** management card:
      * View credential state (prefix `txd_...`).
      * "Generate Key" / "Rotate Key" button with one-time secret reveal and copy button.
      * "Revoke Key" button with immediate cancellation.
* **Inventory Overview:**
  * Updated [`frontend/src/pages/Devices.jsx`](file:///home/ruturaj998/trace-x/frontend/src/pages/Devices.jsx) and [`frontend/src/components/common/StatusBadge.jsx`](file:///home/ruturaj998/trace-x/frontend/src/components/common/StatusBadge.jsx) to display real-time connectivity state.

---

## 7. Phase 6 — Database Migrations

### Migration `003_p2_device_auth_and_offline_buffering.sql`
```sql
-- 1. Device credentials & last_seen
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_token_hash VARCHAR(128);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_token_prefix VARCHAR(16);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- 2. Location offline capture timestamp and idempotency
ALTER TABLE locations ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

-- 3. Performance & lookup indexes
CREATE INDEX IF NOT EXISTS idx_devices_token_hash ON devices (device_token_hash);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices (last_seen);
CREATE INDEX IF NOT EXISTS idx_locations_idempotency ON locations (device_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_locations_recorded_at ON locations (device_id, recorded_at DESC);
```

---

## 8. Consolidated Verification Results

### 1. Backend Test Suite — SQLite Mode (44/44 Passed)
```bash
.venv/bin/pytest -v
```
```text
============================== 44 passed in 6.12s ==============================
tests/test_auth.py (6 passed)
tests/test_contact.py (4 passed)
tests/test_device_and_lost_flow.py (2 passed)
tests/test_existing_device_15.py (1 passed)
tests/test_location_and_telemetry.py (5 passed)
tests/test_p0_regression.py (8 passed)
tests/test_p1_remediation.py (8 passed)
tests/test_p2_remediation.py (7 passed)
tests/test_telemetry_agent.py (2 passed)
tests/test_user_journey.py (1 passed)
```

### 2. Backend Test Suite — PostgreSQL 18.6 Engine Mode (44/44 Passed)
```bash
TEST_DATABASE_URL="postgresql+psycopg:///?host=/tmp&port=5433&dbname=trace_x_test" .venv/bin/pytest -v
```
```text
============================== 44 passed in 6.64s ==============================
```

### 3. Migration Runner Verification on PostgreSQL
```bash
DATABASE_URL="postgresql+psycopg:///?host=/tmp&port=5433&dbname=trace_x_test" .venv/bin/python -m app.database.migrations.run_migrations status
```
```text
======================================================================
Migration Version                        Status       Applied At
======================================================================
001_add_indexes                          APPLIED      2026-11-09 05:14:15.517375+05:30
002_foreign_key_cascades_and_timezones   APPLIED      2026-11-09 05:14:40.576038+05:30
003_p2_device_auth_and_offline_buffering APPLIED      2026-11-09 05:28:17.935756+05:30
======================================================================
```

### 4. Frontend Test Suite, Lint & Build
```bash
npm --prefix frontend test
# 8 passed across 2 suites in 114ms

npm --prefix frontend run lint
# 0 warnings and 0 errors across 50 files

npm --prefix frontend run build
# built in 544ms (zero errors)
```

---

## 9. Deployment Environment Variables

Configure the following environment variables in production (e.g. Render, Railway, Kubernetes):

```bash
# Core Environment
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg://user:password@pg-host:5432/tracex_prod
SECRET_KEY=<generate-strong-random-key-with-openssl-rand-hex-32>

# Network & CORS
CORS_ORIGINS=https://app.yourdomain.com
TRUSTED_PROXIES=127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

# Telemetry Heartbeat
DEVICE_ONLINE_HEARTBEAT_MINUTES=5

# Edge Telemetry Agent (deployed on physical hardware)
TRACEX_API_URL=https://api.yourdomain.com
TRACEX_DEVICE_ID=10
TRACEX_DEVICE_TOKEN=txd_...
GPS_SOURCE=auto
TELEMETRY_INTERVAL=10
TRACEX_QUEUE_PATH=/var/lib/tracex/telemetry_queue.json
```

---

## 10. Required Production Deployment Steps

1. **Apply Migrations Before App Boot:**
   ```bash
   python -m app.database.migrations.run_migrations up
   ```
2. **Launch Backend Service:**
   ```bash
   gunicorn -c deploy/gunicorn_conf.py app.main:app
   ```
3. **Verify Health Probe:**
   `GET /health` must return `200 OK` with `status: healthy, database: connected`.
4. **Provision Edge Devices:**
   Log into the dashboard, open a registered device, click **Generate Key**, copy the `txd_...` secret, and configure it on the physical tracking unit.
