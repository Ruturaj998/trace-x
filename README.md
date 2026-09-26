# TRACE-X: Stolen Device Tracking & Telemetry Intelligence Platform

TRACE-X is a high-assurance, real-time stolen-device tracking and asset recovery platform. Built with FastAPI, PostgreSQL, and React + Vite, TRACE-X provides command-and-control visibility over hardware assets, real-time GPS telemetry ingestion, satellite mapping, breadcrumb audit trails, and instantaneous security status state-machine transitions.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Local Development](#3-local-development)
4. [Backend Setup](#4-backend-setup)
5. [PostgreSQL Setup](#5-postgresql-setup)
6. [Frontend Setup](#6-frontend-setup)
7. [Environment Variables](#7-environment-variables)
8. [Authentication](#8-authentication)
9. [Device Registration](#9-device-registration)
10. [GPS Telemetry API](#10-gps-telemetry-api)
11. [Telemetry Agent](#11-telemetry-agent)
12. [Map and Location History](#12-map-and-location-history)
13. [Production Deployment Architecture](#13-production-deployment-architecture)
14. [Nginx Reverse Proxy Configuration](#14-nginx-reverse-proxy-configuration)
15. [HTTPS and SSL Setup](#15-https-and-ssl-setup)
16. [Production Environment Configuration](#16-production-environment-configuration)
17. [Testing & Verification](#17-testing--verification)
18. [Security Notes](#18-security-notes)

---

## 1. Project Overview

TRACE-X gives individuals and security teams total command over lost or stolen devices:
* **Real-Time Telemetry Ingestion**: High-throughput ingestion of GPS fixes (latitude, longitude, accuracy) with strict range validation and server-side UTC timestamps.
* **Strict Ownership Isolation**: Multi-tenant authorization ensuring users can only track, inspect, or submit telemetry for assets they legally own.
* **Interactive Mapping**: Dual-layer Leaflet visualization supporting high-resolution Esri World Satellite imagery and OpenStreetMap street view.
* **Breadcrumb Audit Trail**: Historical location tracking with directional polyline rendering and chronological audit logging.
* **Security State Machine**: Instant state changes (`active`, `lost`, `disabled`) with cascade history tracking.

---

## 2. System Architecture

```
                               ┌────────────────────────────────┐
                               │       TRACE-X Web Client       │
                               │     (React + Vite + Leaflet)   │
                               └───────────────┬────────────────┘
                                               │ HTTPS / REST API
                                               ▼
┌───────────────────────────┐    ┌──────────────────────────────┐
│  Edge Telemetry Agent     ├───>│     Nginx Reverse Proxy      │
│ (Linux GNSS, Serial NMEA) │    │  (SSL Termination & Headers) │
└───────────────────────────┘    └──────────────┬───────────────┘
                                                │ Local Proxy (127.0.0.1:8000)
                                                ▼
                                 ┌──────────────────────────────┐
                                 │   Gunicorn + Uvicorn Workers │
                                 │         FastAPI App          │
                                 └──────────────┬───────────────┘
                                                │ SQLAlchemy ORM
                                                ▼
                                 ┌──────────────────────────────┐
                                 │     PostgreSQL Database      │
                                 │  (Users, Devices, Locations) │
                                 └──────────────────────────────┘
```

---

## 3. Local Development

### Prerequisites
* Python 3.10+
* Node.js 18+ and npm
* PostgreSQL 14+
* Git

### Repository Layout
```
trace-x/
├── app/                  # FastAPI backend application
│   ├── database/         # Connection pools, Base, dependencies
│   ├── models/           # SQLAlchemy ORM models (User, Device, Location, etc.)
│   ├── routes/           # REST endpoints (auth, devices, locations, dashboard)
│   └── schemas/          # Pydantic request/response schemas
├── deploy/               # Production deployment templates
│   ├── nginx/            # Nginx reverse proxy configuration
│   └── gunicorn_conf.py  # Production Gunicorn worker settings
├── frontend/             # React + Vite frontend application
│   ├── src/              # Pages, components, contexts, hooks, services
│   └── index.html        # HTML shell
├── telemetry_agent/      # Edge telemetry hardware ingestion agent
└── tests/                # Automated backend test suites
```

---

## 4. Backend Setup

1. **Create and Activate Virtual Environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install fastapi uvicorn[standard] sqlalchemy psycopg pydantic python-jose passlib[bcrypt] python-dotenv
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in credentials:
   ```bash
   cp .env.example .env
   ```

4. **Run Database Migrations / Initialize Tables**:
   Tables are automatically initialized on startup via SQLAlchemy metadata:
   ```bash
   python -c "from app.database.connection import engine; from app.database.base import Base; import app.models; Base.metadata.create_all(bind=engine)"
   ```

5. **Start Local Development Server**:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   * Interactive API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   * Alternative ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 5. PostgreSQL Setup

1. **Install PostgreSQL**:
   ```bash
   # Debian / Ubuntu
   sudo apt update && sudo apt install -y postgresql postgresql-contrib
   ```

2. **Create Database and User**:
   ```bash
   sudo -u postgres psql
   ```
   ```sql
   CREATE DATABASE trace_x;
   CREATE USER tracex_user WITH ENCRYPTED PASSWORD 'your_secure_db_password';
   GRANT ALL PRIVILEGES ON DATABASE trace_x TO tracex_user;
   \c trace_x
   GRANT ALL ON SCHEMA public TO tracex_user;
   \q
   ```

3. **Update Connection String in `.env`**:
   ```ini
   DATABASE_URL=postgresql+psycopg://tracex_user:your_secure_db_password@localhost:5432/trace_x
   ```

---

## 6. Frontend Setup

1. **Navigate to Frontend Directory**:
   ```bash
   cd frontend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Frontend Environment**:
   ```bash
   cp .env.example .env
   ```
   Default `VITE_API_BASE_URL` is `http://127.0.0.1:8000`.

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Console: [http://localhost:5173](http://localhost:5173)

5. **Run Linter and Production Build**:
   ```bash
   npm run lint   # Passes with 0 errors and 0 warnings
   npm run build  # Bundles production assets into dist/
   ```

---

## 7. Environment Variables

### Backend Configuration (`.env`)
| Variable | Description | Example Placeholder |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URL with psycopg driver | `postgresql+psycopg://user:pass@localhost:5432/trace_x` |
| `SECRET_KEY` | High-entropy secret for signing JWT tokens | `openssl rand -hex 32` |
| `ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session validity duration | `60` |
| `CORS_ORIGINS` | Comma-separated allowed web origins | `http://localhost:5173,http://127.0.0.1:5173` |

### Frontend Configuration (`frontend/.env`)
| Variable | Description | Example Placeholder |
|---|---|---|
| `VITE_API_BASE_URL` | Public backend API URL | `http://127.0.0.1:8000` or `https://api.yourdomain.example` |

> **Security Rule**: Never check `.env` files into source control. Only commit `.env.example` templates containing generic placeholders.

---

## 8. Authentication

TRACE-X uses stateless JSON Web Token (JWT) authentication:
* **Registration**: `POST /auth/register` creates a user with bcrypt-hashed password.
* **Login**: `POST /auth/login` verifies credentials and issues a signed JWT token.
* **Token Transmission**: Clients provide `Authorization: Bearer <token>` in the HTTP headers.
* **Identity Verification**: Protected routes use the `get_current_user` dependency, extracting the subject identity and validating the token signature.

---

## 9. Device Registration

Devices are registered under the authenticated user's account:
* **Register Device**: `POST /devices` with JSON body:
  ```json
  {
    "device_name": "Field Unit Alpha",
    "device_identifier": "TX-SN-982341"
  }
  ```
* **Device Ownership**: Every device record references `user_id`. Non-owners cannot view, update, delete, or submit telemetry for another user's device.
* **Status Controls**: Update status (`active`, `lost`, `disabled`) via `PUT /devices/{id}/status`. State transitions are recorded in `device_status_history`.

---

## 10. GPS Telemetry API

### Endpoint: `POST /locations`
Ingests genuine GPS fixes transmitted by external devices or agents.

**Headers**:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

**Payload**:
```json
{
  "device_id": 1,
  "latitude": 37.774929,
  "longitude": -122.419416,
  "accuracy": 4.5
}
```

**Field Specifications**:
* `device_id` (integer, required): Registered device belonging to the user.
* `latitude` (float, required): Valid geographic latitude in range `[-90.0, 90.0]`.
* `longitude` (float, required): Valid geographic longitude in range `[-180.0, 180.0]`.
* `accuracy` (float, optional): Estimated horizontal error radius in meters (`>= 0.0`).
* `timestamp`: Automatically generated server-side using timezone-aware UTC datetime.

**Responses**:
* `200 OK`: Telemetry fix saved and committed to PostgreSQL.
* `401 Unauthorized`: Missing or invalid Bearer token.
* `404 Not Found`: Device does not exist or belongs to another user (anti-enumeration).
* `422 Unprocessable Entity`: Coordinates out of range or malformed payload.

---

## 11. Telemetry Agent

The TRACE-X repository includes an optional edge telemetry daemon in `telemetry_agent/`:

### Key Features
* **Zero Fake Data**: Strictly prohibits simulated GPS coordinates or artificial motion generators.
* **Truthful Hardware Detection**: Scans Linux `gpsd` and serial NMEA ports (`/dev/ttyUSB0`, `/dev/ttyACM0`). If hardware is absent, it reports hardware unavailability rather than generating fake data.
* **Field Operator Mode**: Supports manual entry of verified readings from physical handheld instruments via CLI arguments.

### Quick Start
```bash
# Check hardware availability
python -m telemetry_agent.agent --check-hardware

# Transmit a verified hardware reading
python -m telemetry_agent.agent \
  --device-id 1 \
  --manual-lat 18.5204 \
  --manual-lon 73.8567 \
  --manual-acc 4.0 \
  --once
```

---

## 12. Map and Location History

TRACE-X features an interactive mapping engine powered by Leaflet:
* **Dual Layer Switching**: Toggle between high-resolution Esri World Imagery (Satellite) and OpenStreetMap (Street View).
* **Latest Fix Panel**: Highlights current position, accuracy radius, and time-elapsed badge.
* **Breadcrumb Trail**: Connects location history chronologically with visual polyline paths and numbered fix markers.
* **Auto-Recenter**: Quick action to pan and zoom directly to the device's latest telemetry fix.

---

## 13. Production Deployment Architecture

In production, TRACE-X uses a multi-tier architecture:
1. **Public Internet**: Clients connect over encrypted HTTPS (port 443).
2. **Nginx Reverse Proxy**: Terminates TLS/SSL, serves compiled static frontend assets (`dist/`), and proxies API calls to internal localhost.
3. **Application Server**: Gunicorn orchestrates multiple Uvicorn worker processes listening only on `127.0.0.1:8000`.
4. **PostgreSQL**: Hardened relational database listening on local UNIX socket or private VPC network.

---

## 14. Nginx Reverse Proxy Configuration

A complete production template is provided in `deploy/nginx/tracex.conf`:
* Enforces HTTP -> HTTPS 301 redirection.
* Forwards `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers.
* Sets WebSocket upgrade headers for real-time telemetry streaming.
* Restricts backend access so internal port 8000 is never exposed publicly.

### Deployment Commands
```bash
sudo cp deploy/nginx/tracex.conf /etc/nginx/sites-available/tracex.conf
sudo ln -s /etc/nginx/sites-available/tracex.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 15. HTTPS and SSL Setup

Production deployments should use trusted SSL certificates from Let's Encrypt:

1. **Install Certbot**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. **Obtain and Install Certificate**:
   ```bash
   sudo certbot --nginx -d your-domain.example.com
   ```

3. **Automated Renewal Verification**:
   Certbot configures a systemd timer for automatic renewals:
   ```bash
   sudo certbot renew --dry-run
   ```

---

## 16. Production Environment Configuration

### Production Startup Command
Launch the backend application using Gunicorn with Uvicorn worker engine:
```bash
gunicorn -c deploy/gunicorn_conf.py app.main:app
```

### Systemd Service Unit (`/etc/systemd/system/tracex.service`)
```ini
[Unit]
Description=TRACE-X Telemetry Platform Service
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/tracex
EnvironmentFile=/var/www/tracex/.env
ExecStart=/var/www/tracex/.venv/bin/gunicorn -c deploy/gunicorn_conf.py app.main:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## 17. Testing & Verification

### Running Automated Backend Tests
TRACE-X includes test suites covering authentication, device management, ownership checks, and location validation:
```bash
pytest -v
```

### Running Frontend Verification
```bash
cd frontend
npm run lint   # Verifies 0 errors and 0 warnings
npm run build  # Verifies clean production bundling
```

---

## 18. Security Notes

* **No Hardcoded Secrets**: All passwords, database URLs, and JWT secrets are loaded via environment variables.
* **Strict Least Privilege**: Non-root service users should run Gunicorn and Nginx.
* **Timing Attack Mitigation**: Passwords verified via bcrypt with constant-time comparisons.
* **CSRF & CORS Defense**: CORS origins are restricted to configured domains; wildcards (`*`) are disallowed with authenticated credentials.
* **Input Sanitization**: Pydantic models validate all incoming requests, enforcing strict coordinate and identifier bounds.
