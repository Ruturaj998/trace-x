# TRACE-X Edge Telemetry Agent

The TRACE-X Edge Telemetry Agent is a lightweight background daemon designed to run on edge hardware (e.g., Linux single-board computers, vehicular telematics units, field laptops, Raspberry Pi, or IoT gateways). It connects to physical GPS hardware, captures real satellite fixes, and securely streams telemetry to the TRACE-X API.

---

## Telemetry Architecture Flow

```
   ┌────────────────────────────────┐
   │        REAL DEVICE GPS         │
   │  (USB GPS, NMEA UART, gpsd)    │
   └───────────────┬────────────────┘
                   │ GPS Fix (Lat, Lon, Acc)
                   ▼
   ┌────────────────────────────────┐
   │    TRACE-X Telemetry Agent     │
   │  (telemetry_agent/agent.py)    │
   └───────────────┬────────────────┘
                   │ Authenticated HTTPS/HTTP + Bearer JWT
                   ▼
   ┌────────────────────────────────┐
   │    TRACE-X Backend API         │
   │      POST /locations           │
   └───────────────┬────────────────┘
                   │ Validated & Timezone-Aware UTC Timestamp
                   ▼
   ┌────────────────────────────────┐
   │      PostgreSQL Database       │
   │      ('locations' Table)       │
   └───────────────┬────────────────┘
                   │ Real-time Queries
                   ▼
   ┌────────────────────────────────┐
   │   TRACE-X Dashboard & Maps     │
   │  (Real-Time Breadcrumb Trail)  │
   └────────────────────────────────┘
```

---

## Real Telemetry Integrity Policy

TRACE-X strictly adheres to real data principles:
* **No Coordinate Fabrication**: The agent will never simulate fake "live tracking" or inject random coordinate drift when hardware is absent.
* **Truthful Hardware Detection**: If no physical GPS hardware is found, the agent reports its status truthfully and refuses to fabricate data.
* **Security & Ownership**: Every telemetry transmission requires an authenticated user token and verifies that the target device belongs to the account.

---

## Supported GPS Hardware Interfaces

1. **Linux `gpsd` Daemon (`GPS_SOURCE=gpsd`)**:
   Connects to the system GPS daemon via TCP port 2947. Compatible with any device supported by Linux gpsd (USB sticks, Bluetooth GPS, internal WWAN/GNSS modems).
   ```bash
   sudo apt install gpsd gpsd-clients
   sudo systemctl start gpsd
   ```

2. **Serial NMEA Receivers (`GPS_SOURCE=serial`)**:
   Directly reads standard NMEA-0183 `$GPGGA` / `$GNGGA` sentences from `/dev/ttyUSB0`, `/dev/ttyACM0`, or serial UART pins.
   Default baudrate: `9600`.

3. **Field Instrument Manual Entry (`GPS_SOURCE=manual`)**:
   Allows an engineer or field operator to submit a real hardware fix read directly from an external handheld GPS receiver without coordinate simulation.

---

## Configuration

Configuration is managed via environment variables (or `.env` file):

| Variable | Description | Default |
|---|---|---|
| `TRACEX_API_URL` | Base URL of TRACE-X backend | `http://127.0.0.1:8000` |
| `TRACEX_DEVICE_ID` | Numeric device ID in TRACE-X | *Required* |
| `TRACEX_API_TOKEN` | Pre-existing JWT access token | Optional (if email/password provided) |
| `TRACEX_EMAIL` | TRACE-X account email | Optional |
| `TRACEX_PASSWORD` | TRACE-X account password | Optional |
| `GPS_SOURCE` | `auto`, `gpsd`, `serial`, or `manual` | `auto` |
| `GPS_SERIAL_PORT` | Serial device path | `/dev/ttyUSB0` |
| `GPS_SERIAL_BAUDRATE`| Serial baud rate | `9600` |
| `TELEMETRY_INTERVAL` | Interval between fixes in seconds | `10` |

---

## Usage

### 1. Check Hardware Availability
Inspect available GPS receivers on the host machine:
```bash
python -m telemetry_agent.agent --check-hardware
```

### 2. Run with Environment Variables
```bash
export TRACEX_API_URL="http://127.0.0.1:8000"
export TRACEX_DEVICE_ID=1
export TRACEX_EMAIL="operator@example.com"
export TRACEX_PASSWORD="secure_password"

python -m telemetry_agent.agent
```

### 3. Send a Verified Field Reading (Single Fix)
For testing API ingestion using a verified fix read from an external physical GPS instrument:
```bash
python -m telemetry_agent.agent \
  --device-id 1 \
  --manual-lat 18.5204 \
  --manual-lon 73.8567 \
  --manual-acc 5.0 \
  --once
```

---

## Connecting External Platforms

* **Android**: An Android background service or Tasker task can invoke `POST /locations` using the device's FusedLocationProviderClient coordinates.
* **IoT / MicroPython / ESP32**: Send JSON directly to `POST /locations` over HTTPS with the JWT bearer token.
